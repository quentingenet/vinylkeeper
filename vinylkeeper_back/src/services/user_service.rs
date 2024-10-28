use crate::core::jwt::{
    generate_jwt, generate_refresh_token, generate_reset_token, validate_refresh_token,
    validate_reset_token,
};
use crate::db::models::role::Role;
use crate::db::models::user::NewUser;
use crate::mail::sender::send_email;
use crate::mail::subject::MailSubject;
use crate::mail::templates::new_user_register::new_user_register_template;
use crate::mail::templates::password_reset::password_reset_template;
use crate::repositories::user_repository::UserRepository;
use argon2::password_hash::{rand_core, PasswordHash, PasswordHasher, SaltString};
use argon2::{Argon2, PasswordVerifier};
use chrono::Utc;
use diesel::result::Error as DieselError;
use rand_core::OsRng;
use std::env;
use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use tokio::time::timeout;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,
    #[error("Database error")]
    DatabaseError,
    #[error("Password hash error")]
    PasswordHashError,
    #[error("JWT generation error")]
    JwtGenerationError,
    #[error("User already exists")]
    UserAlreadyExists,
    #[error("Invalid token")]
    InvalidToken,
    #[error("Invalid role")]
    InvalidRole,
    #[error("Email send error")]
    EmailSendError,
    #[error("Missing config error")]
    MissingConfigError,
    #[error("Email timeout error")]
    EmailTimeoutError,
}

pub async fn notify_admin_new_user(username: &str, user_email: &str) -> Result<(), AuthError> {
    let admin_email = env::var("EMAIL_ADMIN").map_err(|_| {
        eprintln!("EMAIL_ADMIN environment variable is not set.");
        AuthError::MissingConfigError
    })?;

    let email_body = new_user_register_template(username, user_email);

    timeout(
        Duration::from_secs(5),
        send_email(&admin_email, MailSubject::NewUserRegistered, &email_body),
    )
    .await
    .map_err(|_| {
        eprintln!("Sending email timed out.");
        AuthError::EmailTimeoutError
    })??;

    println!(
        "Registration notification sent successfully to {}.",
        admin_email
    );
    Ok(())
}

pub struct AuthTokens {
    pub access_token: String,
    pub refresh_token: String,
}

pub struct UserService {
    user_repository: Arc<UserRepository>,
}

impl UserService {
    pub fn new(user_repository: Arc<UserRepository>) -> Self {
        UserService { user_repository }
    }

    pub async fn authenticate(&self, email: &str, password: &str) -> Result<AuthTokens, AuthError> {
        let user = self
            .user_repository
            .find_by_email(email)
            .await
            .map_err(|_| AuthError::InvalidCredentials)?;

        let parsed_hash =
            PasswordHash::new(&user.password).map_err(|_| AuthError::PasswordHashError)?;

        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;

        let user_role = Role::from_id(2);

        let access_token =
            generate_jwt(user.id, user_role.clone()).map_err(|_| AuthError::JwtGenerationError)?;
        let refresh_token = generate_refresh_token(user.id, user_role)
            .map_err(|_| AuthError::JwtGenerationError)?;

        self.user_repository
            .update_last_login(user.id, Utc::now().naive_utc())
            .await
            .map_err(|_| AuthError::DatabaseError)?;

        Ok(AuthTokens {
            access_token,
            refresh_token,
        })
    }

    pub async fn create_user(&self, mut new_user: NewUser) -> Result<AuthTokens, AuthError> {
        let salt = SaltString::generate(&mut OsRng);
        let password_hash = Argon2::default()
            .hash_password(new_user.password.as_bytes(), &salt)
            .map_err(|_| AuthError::PasswordHashError)?
            .to_string();
        new_user.password = password_hash;

        let created_user =
            self.user_repository
                .create(&new_user)
                .await
                .map_err(|err| match err {
                    DieselError::DatabaseError(
                        diesel::result::DatabaseErrorKind::UniqueViolation,
                        _,
                    ) => AuthError::UserAlreadyExists,
                    _ => AuthError::DatabaseError,
                })?;

        notify_admin_new_user(&created_user.username, &created_user.email).await?;

        let user_role = Role::from_id(2);
        let access_token = generate_jwt(created_user.id, user_role.clone())
            .map_err(|_| AuthError::JwtGenerationError)?;
        let refresh_token = generate_refresh_token(created_user.id, user_role)
            .map_err(|_| AuthError::JwtGenerationError)?;

        Ok(AuthTokens {
            access_token,
            refresh_token,
        })
    }

    pub async fn refresh_jwt(&self, refresh_token: &str) -> Result<String, AuthError> {
        let claims = validate_refresh_token(refresh_token).map_err(|_| AuthError::InvalidToken)?;
        let user_role = Role::from_str(&claims.role).map_err(|_| AuthError::InvalidRole)?;

        generate_jwt(claims.sub, user_role).map_err(|_| AuthError::JwtGenerationError)
    }

    pub async fn send_password_reset_email(&self, email: &str) -> Result<(), AuthError> {
        println!("Searching for user by email: {}", email);
        let user = self
            .user_repository
            .find_by_email(email)
            .await
            .map_err(|_| {
                println!("User not found with email: {}", email);
                AuthError::InvalidCredentials
            })?;

        println!("Generating reset token for user ID: {}", user.id);
        let reset_token = generate_reset_token(user.id).map_err(|e| {
            println!("Failed to generate reset token: {:?}", e);
            AuthError::JwtGenerationError
        })?;

        let email_body = password_reset_template(&reset_token);
        send_email(email, MailSubject::PasswordReset, &email_body)
            .await
            .map_err(|_| AuthError::DatabaseError)?;

        Ok(())
    }

    pub async fn reset_password(&self, token: &str, new_password: &str) -> Result<(), AuthError> {
        let claims = validate_reset_token(token).map_err(|_| AuthError::InvalidToken)?;

        let user = self
            .user_repository
            .find_by_id(claims.sub)
            .await
            .map_err(|_| AuthError::DatabaseError)?;

        let salt = SaltString::generate(&mut OsRng);
        let hashed_password = Argon2::default()
            .hash_password(new_password.as_bytes(), &salt)
            .map_err(|_| AuthError::PasswordHashError)?
            .to_string();

        self.user_repository
            .update_password(user.id, &hashed_password)
            .await
            .map_err(|_| AuthError::DatabaseError)?;

        Ok(())
    }
}

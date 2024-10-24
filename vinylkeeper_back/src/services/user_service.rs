use crate::core::jwt::{generate_jwt, generate_refresh_token};
use crate::db::models::role::Role;
use crate::db::models::user::{NewUser, User};
use crate::repositories::user_repository::UserRepository;
use argon2::password_hash::{rand_core, PasswordHash, PasswordHasher, SaltString};
use argon2::{Argon2, PasswordVerifier};
use chrono::Utc;
use diesel::result::Error as DieselError;
use rand_core::OsRng;
use std::sync::Arc;
use thiserror::Error;

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

        let password_hash = &user.password;
        let parsed_hash =
            PasswordHash::new(password_hash).map_err(|_| AuthError::PasswordHashError)?;

        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;

        let mut user = user.clone();
        user.last_login = Some(Utc::now().naive_utc());
        self.user_repository
            .update_user(&user)
            .await
            .map_err(|_| AuthError::DatabaseError)?;

        let user_role = Role::from_id(user.role_id);

        let access_token =
            generate_jwt(user.id, user_role.clone()).map_err(|_| AuthError::JwtGenerationError)?;
        let refresh_token = generate_refresh_token(user.id, user_role.clone())
            .map_err(|_| AuthError::JwtGenerationError)?;

        Ok(AuthTokens {
            access_token,
            refresh_token,
        })
    }

    pub async fn create_user(&self, mut new_user: NewUser) -> Result<User, AuthError> {
        let salt = SaltString::generate(&mut OsRng);
        let password_hash = Argon2::default()
            .hash_password(new_user.password.as_bytes(), &salt)
            .map_err(|_| AuthError::PasswordHashError)?
            .to_string();
        new_user.password = password_hash;

        self.user_repository
            .create(&new_user)
            .await
            .map_err(|err| match err {
                DieselError::DatabaseError(
                    diesel::result::DatabaseErrorKind::UniqueViolation,
                    _,
                ) => AuthError::UserAlreadyExists,
                _ => AuthError::DatabaseError,
            })
    }
}

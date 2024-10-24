use crate::core::jwt::generate_jwt;
use crate::db::models::role::Role;
use crate::db::models::user::User;
use crate::repositories::user_repository::UserRepository;
use argon2::password_hash::{rand_core, PasswordHash, PasswordHasher, SaltString};
use argon2::{self, Argon2, PasswordVerifier};
use diesel::result::Error as DieselError;
use diesel_async::pooled_connection::bb8::Pool;
use diesel_async::AsyncPgConnection;
use rand_core::OsRng;
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

pub struct UserService {
    pool: Pool<AsyncPgConnection>,
}

impl UserService {
    pub fn new(pool: &Pool<AsyncPgConnection>) -> Self {
        UserService { pool: pool.clone() }
    }

    pub async fn authenticate(&self, email: &str, password: &str) -> Result<String, AuthError> {
        let mut conn = self
            .pool
            .get()
            .await
            .map_err(|_| AuthError::DatabaseError)?;

        let mut user_repository = UserRepository::new(&mut conn);
        match user_repository.find_by_email(email).await {
            Ok(user) => {
                let password_hash = &user.password;
                let parsed_hash =
                    PasswordHash::new(password_hash).map_err(|_| AuthError::PasswordHashError)?;

                Argon2::default()
                    .verify_password(password.as_bytes(), &parsed_hash)
                    .map_err(|_| AuthError::InvalidCredentials)?;

                let user_role = Role::from_id(user.role_id);
                generate_jwt(user.id, user_role).map_err(|_| AuthError::JwtGenerationError)
            }
            Err(_) => Err(AuthError::InvalidCredentials),
        }
    }

    pub async fn create_user(&self, new_user: &mut User) -> Result<User, AuthError> {
        let mut conn = self
            .pool
            .get()
            .await
            .map_err(|_| AuthError::DatabaseError)?;

        let mut user_repository = UserRepository::new(&mut conn);

        let salt = SaltString::generate(&mut OsRng);
        let password_hash = Argon2::default()
            .hash_password(new_user.password.as_bytes(), &salt)
            .map_err(|_| AuthError::PasswordHashError)?
            .to_string();
        new_user.password = password_hash;

        user_repository
            .create(new_user)
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

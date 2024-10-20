use crate::db::models::user::User;
use crate::repositories::user_repository::UserRepository;
use bcrypt::{hash, verify, DEFAULT_COST};
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::PgConnection;

pub struct UserService<'a> {
    pub user_repository: UserRepository<'a>,
}

impl<'a> UserService<'a> {
    pub fn new(pool: &'a Pool<ConnectionManager<PgConnection>>) -> Self {
        UserService {
            user_repository: UserRepository {
                connection: &pool.get().expect("Failed to get connection"),
            },
        }
    }

    pub fn create_user(&self, username: &str, email: &str, password: &str) -> Result<User, String> {
        let hashed_password = hash(password, DEFAULT_COST).map_err(|e| e.to_string())?;
        let new_user = User {
            id: 0,
            role_id: 2, // role id for simple user by default
            username: username.to_string(),
            email: email.to_string(),
            password: hashed_password,
            is_accepted_terms: false,
            is_active: true,
            is_superuser: false,
            last_login: None,
            registered_at: chrono::Utc::now().naive_utc(),
            updated_at: chrono::Utc::now().naive_utc(),
            timezone: "Europe/Paris".to_string(),
        };

        self.user_repository
            .create(&new_user)
            .map_err(|e| e.to_string())
    }

    pub fn authenticate(&self, email: &str, password: &str) -> Result<User, String> {
        let user = self
            .user_repository
            .find_by_email(email)
            .map_err(|e| e.to_string())?;
        if verify(password, &user.password).map_err(|e| e.to_string())? {
            Ok(user)
        } else {
            Err("Invalid password".to_string())
        }
    }
}

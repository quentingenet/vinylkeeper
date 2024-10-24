use crate::db::connection::PoolDB;
use crate::db::models::user::User;
use crate::services::user_service::{AuthError, UserService};
use rocket::http::Status;
use rocket::post;
use rocket::serde::json::Json;
use rocket::State;
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct AuthUser {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct CreateUser {
    pub username: String,
    pub email: String,
    pub password: String,
    pub role_id: i32,
    pub timezone: String,
}

#[post("/auth", format = "json", data = "<auth_user>")]
pub async fn authenticate(
    auth_user: Json<AuthUser>,
    db: &State<Arc<PoolDB>>,
) -> Result<Json<String>, Status> {
    let user_service = UserService::new(&db.pool);

    match user_service
        .authenticate(&auth_user.email, &auth_user.password)
        .await
    {
        Ok(token) => Ok(Json(token)),
        Err(err) => match err {
            AuthError::InvalidCredentials => Err(Status::Unauthorized),
            AuthError::DatabaseError => Err(Status::InternalServerError),
            _ => Err(Status::BadRequest),
        },
    }
}

#[post("/register", format = "json", data = "<new_user>")]
pub async fn create_user(
    new_user: Json<CreateUser>,
    db: &State<Arc<PoolDB>>,
) -> Result<Json<User>, Status> {
    let user_service = UserService::new(&db.pool);

    let mut user = User {
        id: 0,
        role_id: new_user.role_id,
        username: new_user.username.clone(),
        email: new_user.email.clone(),
        password: new_user.password.clone(),
        is_accepted_terms: Some(true),
        is_active: Some(true),
        is_superuser: Some(false),
        last_login: None,
        registered_at: None,
        updated_at: None,
        timezone: new_user.timezone.clone(),
    };

    match user_service.create_user(&mut user).await {
        Ok(created_user) => Ok(Json(created_user)),
        Err(err) => match err {
            AuthError::UserAlreadyExists => Err(Status::Conflict),
            AuthError::DatabaseError => Err(Status::InternalServerError),
            AuthError::PasswordHashError => Err(Status::BadRequest),
            _ => Err(Status::BadRequest),
        },
    }
}

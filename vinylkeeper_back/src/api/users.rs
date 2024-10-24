use crate::db::models::user::{NewUser, User};
use crate::services::user_service::{AuthError, UserService};
use rocket::http::Status;
use rocket::post;
use rocket::serde::json::Json;
use rocket::State;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::Mutex;

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
    user_service: &State<Arc<Mutex<UserService>>>,
) -> Result<Json<String>, Status> {
    let user_service = user_service.lock().await;
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
    user_service: &State<Arc<Mutex<UserService>>>,
) -> Result<Json<User>, Status> {
    let user_service = user_service.lock().await;
    let user = NewUser {
        role_id: new_user.role_id,
        username: new_user.username.clone(),
        email: new_user.email.clone(),
        password: new_user.password.clone(),
        is_accepted_terms: Some(true),
        is_active: Some(true),
        is_superuser: Some(false),
        timezone: new_user.timezone.clone(),
    };

    match user_service.create_user(user).await {
        Ok(created_user) => Ok(Json(created_user)),
        Err(err) => match err {
            AuthError::UserAlreadyExists => Err(Status::Conflict),
            AuthError::DatabaseError => Err(Status::InternalServerError),
            AuthError::PasswordHashError => Err(Status::BadRequest),
            _ => Err(Status::BadRequest),
        },
    }
}

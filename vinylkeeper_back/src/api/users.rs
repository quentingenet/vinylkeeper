use crate::db::models::user::{NewUser, User};
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

impl From<CreateUser> for NewUser {
    fn from(user: CreateUser) -> Self {
        NewUser {
            role_id: user.role_id,
            username: user.username,
            email: user.email,
            password: user.password,
            is_accepted_terms: Some(true),
            is_active: Some(true),
            is_superuser: Some(false),
            timezone: user.timezone,
        }
    }
}

#[post("/auth", format = "json", data = "<auth_user>")]
pub async fn authenticate(
    auth_user: Json<AuthUser>,
    user_service: &State<Arc<UserService>>,
) -> Result<Json<String>, Status> {
    match user_service
        .authenticate(&auth_user.email, &auth_user.password)
        .await
    {
        Ok(token) => Ok(Json(token)),
        Err(err) => map_auth_error_to_status_string(err),
    }
}

#[post("/register", format = "json", data = "<new_user>")]
pub async fn create_user(
    new_user: Json<CreateUser>,
    user_service: &State<Arc<UserService>>,
) -> Result<Json<User>, Status> {
    let user: NewUser = new_user.into_inner().into();

    match user_service.create_user(user).await {
        Ok(created_user) => Ok(Json(created_user)),
        Err(err) => map_auth_error_to_status(err),
    }
}

fn map_auth_error_to_status(err: AuthError) -> Result<Json<User>, Status> {
    match err {
        AuthError::UserAlreadyExists => Err(Status::Conflict),
        AuthError::DatabaseError => Err(Status::InternalServerError),
        AuthError::PasswordHashError => Err(Status::BadRequest),
        _ => Err(Status::BadRequest),
    }
}

fn map_auth_error_to_status_string(err: AuthError) -> Result<Json<String>, Status> {
    match err {
        AuthError::InvalidCredentials => Err(Status::Unauthorized),
        AuthError::DatabaseError => Err(Status::InternalServerError),
        _ => Err(Status::BadRequest),
    }
}
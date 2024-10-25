use crate::db::models::user::{NewUser, User};
use crate::services::user_service::{AuthError, UserService};
use rocket::http::{Cookie, CookieJar, SameSite, Status};
use rocket::serde::json::Json;
use rocket::State;
use rocket::{post, time};
use serde::Deserialize;
use std::sync::Arc;
use time::Duration;

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

// Endpoint d'authentification
#[post("/auth", format = "json", data = "<auth_user>")]
pub async fn authenticate(
    auth_user: Json<AuthUser>,
    user_service: &State<Arc<UserService>>,
    cookies: &CookieJar<'_>,
) -> Result<Json<String>, Status> {
    match user_service
        .authenticate(&auth_user.email, &auth_user.password)
        .await
    {
        Ok(tokens) => {
            let refresh_cookie = Cookie::build(Cookie::new("refresh_token", tokens.refresh_token))
                .http_only(true)
                .secure(true)
                .same_site(SameSite::Lax)
                .max_age(Duration::days(7));
            cookies.add(refresh_cookie);
            Ok(Json(tokens.access_token))
        }
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

#[derive(Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[post("/refresh-token", format = "json", data = "<token_request>")]
pub async fn refresh_token(
    token_request: Json<RefreshTokenRequest>,
    user_service: &State<Arc<UserService>>,
) -> Result<Json<String>, Status> {
    match user_service.refresh_jwt(&token_request.refresh_token).await {
        Ok(new_jwt) => Ok(Json(new_jwt)),
        Err(_) => Err(Status::Unauthorized), // ou une autre gestion d'erreur
    }
}

fn map_auth_error_to_status<T>(err: AuthError) -> Result<Json<T>, Status> {
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

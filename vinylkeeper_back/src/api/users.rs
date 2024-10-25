use crate::db::models::user::NewUser;
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
    pub is_accepted_terms: bool,
    pub role_id: i32,
    pub timezone: String,
}

impl From<CreateUser> for NewUser {
    fn from(user: CreateUser) -> Self {
        NewUser {
            role_id: 2, // role id for simple user by default
            username: user.username,
            email: user.email,
            password: user.password,
            is_accepted_terms: user.is_accepted_terms,
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
                .same_site(SameSite::None)
                .max_age(Duration::days(7))
                .build();
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
    cookies: &CookieJar<'_>,
) -> Result<Json<String>, Status> {
    match user_service.create_user(new_user.into_inner().into()).await {
        Ok(tokens) => {
            let refresh_cookie = Cookie::build(Cookie::new("refresh_token", tokens.refresh_token))
                .http_only(true)
                .secure(true)
                .same_site(SameSite::None)
                .max_age(Duration::days(7))
                .build();
            cookies.add(refresh_cookie);
            Ok(Json(tokens.access_token))
        }
        Err(err) => map_auth_error_to_status_string(err),
    }
}

#[post("/refresh-token", format = "json")]
pub async fn refresh_token(
    cookies: &CookieJar<'_>,
    user_service: &State<Arc<UserService>>,
) -> Result<Json<String>, Status> {
    if let Some(refresh_token) = cookies.get("refresh_token") {
        let refresh_token_str = refresh_token.value();

        match user_service.refresh_jwt(refresh_token_str).await {
            Ok(new_jwt) => Ok(Json(new_jwt)),
            Err(err) => {
                println!("Failed to refresh JWT: {:?}", err);
                Err(Status::Unauthorized)
            }
        }
    } else {
        println!("No refresh token found in cookies");
        Err(Status::Unauthorized)
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

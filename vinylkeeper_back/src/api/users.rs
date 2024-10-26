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
    pub role_id: Option<i32>,
    pub timezone: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub email: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordData {
    pub token: String,
    pub new_password: String,
}

impl From<CreateUser> for NewUser {
    fn from(user: CreateUser) -> Self {
        NewUser {
            role_id: Some(2), // role id for simple user by default
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

#[post("/forgot-password", format = "json", data = "<request>")]
pub async fn forgot_password(
    request: Json<ResetPasswordRequest>,
    user_service: &State<Arc<UserService>>,
) -> Result<Json<&'static str>, Status> {
    let email = &request.email;

    match user_service.send_password_reset_email(email).await {
        Ok(_) => Ok(Json("Password reset email sent successfully")),
        Err(AuthError::InvalidCredentials) => Err(Status::NotFound),
        Err(_) => {
            println!("Error during password reset request.");
            Err(Status::InternalServerError)
        }
    }
}

#[post("/reset-password", format = "json", data = "<data>")]
pub async fn reset_password(
    data: Json<ResetPasswordData>,
    user_service: &State<Arc<UserService>>,
) -> Result<Json<&'static str>, Status> {
    match user_service
        .reset_password(&data.token, &data.new_password)
        .await
    {
        Ok(_) => Ok(Json("Password has been reset successfully")),
        Err(AuthError::InvalidToken) => Err(Status::Unauthorized),
        Err(AuthError::PasswordHashError) => Err(Status::BadRequest),
        Err(_) => {
            println!("Error during password reset.");
            Err(Status::InternalServerError)
        }
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

use crate::{
    api::collections::CollectionError, core::jwt::decode_jwt_uuid, db::models::user::User,
    repositories::user_repository::UserRepository,
};
use rocket::http::CookieJar;
use rocket::http::Status;
use std::sync::Arc;

pub fn get_refresh_token(cookies: &CookieJar) -> Result<String, Status> {
    cookies
        .get("refresh_token")
        .ok_or(Status::Unauthorized)
        .map(|cookie| cookie.value().to_string())
}

pub async fn get_user_from_token(
    token: &str,
    user_repository: Arc<UserRepository>,
) -> Result<User, CollectionError> {
    let user_uuid = decode_jwt_uuid(token).map_err(|_| CollectionError::InvalidToken)?;
    user_repository
        .find_user_by_uuid(user_uuid)
        .await
        .map_err(|_| CollectionError::InvalidToken)
}

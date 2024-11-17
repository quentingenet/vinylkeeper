use crate::db::models::collection::NewCollection;
use crate::services::collection_service::CollectionService;
use rocket::get;
use rocket::http::CookieJar;
use rocket::http::Status;
use rocket::serde::json::{self, Json, Value};
use rocket::{post, State};
use serde_json::json;
use std::sync::Arc;

#[derive(Debug)]
pub enum CollectionError {
    DatabaseError,
    ValidationError,
    InvalidName,
    InvalidDescription,
    InvalidIsPublic,
    InvalidToken,
}
#[post("/add", format = "json", data = "<collection>")]
pub async fn create_collection(
    collection: Json<NewCollection>,
    collection_service: &State<Arc<CollectionService>>,
    cookies: &CookieJar<'_>,
) -> Result<Json<Value>, Status> {
    let refresh_token = cookies
        .get("refresh_token")
        .ok_or(Status::Unauthorized)?
        .value()
        .to_string();

    match collection_service
        .create_collection(collection.into_inner(), refresh_token)
        .await
    {
        Ok(created_collection) => Ok(Json(json!({
            "status": "success",
            "data": {
                "collection": created_collection
            }
        }))),
        Err(err) => {
            eprintln!("Error while creating collection: {:?}", err);
            match err {
                CollectionError::InvalidToken => Err(Status::Unauthorized),
                CollectionError::ValidationError
                | CollectionError::InvalidName
                | CollectionError::InvalidDescription
                | CollectionError::InvalidIsPublic => Err(Status::BadRequest),
                CollectionError::DatabaseError => Err(Status::InternalServerError),
            }
        }
    }
}

#[get("/get", format = "json")]
pub async fn get_collections(
    collection_service: &State<Arc<CollectionService>>,
    cookies: &CookieJar<'_>,
) -> Result<Json<Value>, Status> {
    let refresh_token = cookies
        .get("refresh_token")
        .ok_or(Status::Unauthorized)?
        .value()
        .to_string();

    match collection_service.get_collections(refresh_token).await {
        Ok(collections) => Ok(Json(json!({
            "status": "success",
            "data": {
                "collections": collections
            }
        }))),
        Err(err) => {
            eprintln!("Error while getting collections: {:?}", err);
            Err(Status::InternalServerError)
        }
    }
}

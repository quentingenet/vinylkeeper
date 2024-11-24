use crate::db::models::collection::NewCollection;
use crate::db::models::collection::UpdatedCollection;
use crate::services::collection_service::CollectionService;
use crate::utils::utils::get_refresh_token;
use rocket::delete;
use rocket::get;
use rocket::http::CookieJar;
use rocket::http::Status;
use rocket::patch;
use rocket::serde::json::{Json, Value};
use rocket::{post, State};
use serde_json::json;
use std::sync::Arc;

#[derive(Debug)]
pub enum CollectionError {
    DatabaseError,
    InvalidName,
    InvalidDescription,
    InvalidToken,
}
#[post("/add", format = "json", data = "<collection>")]
pub async fn create_collection(
    collection: Json<NewCollection>,
    collection_service: &State<Arc<CollectionService>>,
    cookies: &CookieJar<'_>,
) -> Result<Json<Value>, Status> {
    let refresh_token = get_refresh_token(cookies).map_err(|_| Status::Unauthorized)?;

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
                CollectionError::InvalidName | CollectionError::InvalidDescription => {
                    Err(Status::BadRequest)
                }
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
    let refresh_token = get_refresh_token(cookies).map_err(|_| Status::Unauthorized)?;
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

#[patch("/area/<collection_id>", format = "json", data = "<data>")]
pub async fn switch_area_collection(
    collection_id: i32,
    data: Json<Value>,
    collection_service: &State<Arc<CollectionService>>,
    cookies: &CookieJar<'_>,
) -> Result<Json<Value>, Status> {
    let is_public = data
        .get("is_public")
        .and_then(|v| v.as_bool())
        .ok_or(Status::BadRequest)?;

    let refresh_token = get_refresh_token(cookies).map_err(|_| Status::Unauthorized)?;
    match collection_service
        .switch_area_collection(collection_id, is_public, refresh_token)
        .await
    {
        Ok(_) => Ok(Json(
            json!({ "success": true, "message": "Collection updated successfully" }),
        )),
        Err(err) => {
            eprintln!("Error while updating collection: {:?}", err);
            match err {
                CollectionError::InvalidToken => Err(Status::Unauthorized),
                CollectionError::DatabaseError => Err(Status::InternalServerError),
                _ => Err(Status::InternalServerError),
            }
        }
    }
}

#[delete("/delete/<collection_id>")]
pub async fn delete_collection(
    collection_id: i32,
    collection_service: &State<Arc<CollectionService>>,
    cookies: &CookieJar<'_>,
) -> Result<Json<Value>, Status> {
    let refresh_token = get_refresh_token(cookies).map_err(|_| Status::Unauthorized)?;

    match collection_service
        .delete_collection(collection_id, refresh_token)
        .await
    {
        Ok(_) => Ok(Json(
            json!({ "success": true, "message": "Collection deleted successfully" }),
        )),
        Err(err) => {
            eprintln!("Error while deleting collection: {:?}", err);
            Err(Status::InternalServerError)
        }
    }
}

#[patch("/update/<collection_id>", format = "json", data = "<data>")]
pub async fn update_collection(
    collection_id: i32,
    data: Json<UpdatedCollection>,
    collection_service: &State<Arc<CollectionService>>,
    cookies: &CookieJar<'_>,
) -> Result<Json<Value>, Status> {
    let refresh_token = get_refresh_token(cookies).map_err(|_| Status::Unauthorized)?;
    match collection_service
        .update_collection(collection_id, refresh_token, data.into_inner())
        .await
    {
        Ok(_) => Ok(Json(
            json!({ "success": true, "message": "Collection updated successfully" }),
        )),
        Err(err) => {
            eprintln!("Error while deleting collection: {:?}", err);
            Err(Status::InternalServerError)
        }
    }
}

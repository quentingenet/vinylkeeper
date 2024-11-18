use std::sync::Arc;

use crate::{
    api::collections::CollectionError,
    core::jwt::decode_jwt_uuid,
    db::models::collection::{Collection, NewCollection},
    repositories::{collection_repository::CollectionRepository, user_repository},
};

pub struct CollectionService {
    collection_repository: Arc<CollectionRepository>,
    user_repository: Arc<user_repository::UserRepository>,
}

impl CollectionService {
    pub fn new(
        collection_repository: Arc<CollectionRepository>,
        user_repository: Arc<user_repository::UserRepository>,
    ) -> Self {
        CollectionService {
            collection_repository,
            user_repository,
        }
    }

    pub async fn create_collection(
        &self,
        new_collection: NewCollection,
        token: String,
    ) -> Result<NewCollection, CollectionError> {
        if new_collection.name.trim().is_empty() {
            return Err(CollectionError::InvalidName);
        }
        if new_collection.name.len() > 100 {
            return Err(CollectionError::InvalidName);
        }
        if let Some(description) = &new_collection.description {
            if description.len() > 250 {
                return Err(CollectionError::InvalidDescription);
            }
        }

        let user_uuid = decode_jwt_uuid(&token).map_err(|_| CollectionError::InvalidToken)?;
        let user = self
            .user_repository
            .find_user_by_uuid(user_uuid)
            .await
            .map_err(|_| CollectionError::InvalidToken)?;
        let now = chrono::Local::now().naive_local();
        let collection: NewCollection = NewCollection {
            name: new_collection.name,
            description: new_collection.description,
            user_id: Some(user.id),
            is_public: new_collection.is_public,
            registered_at: Some(now),
            updated_at: Some(now),
        };
        self.collection_repository
            .create_collection(collection)
            .await
            .map_err(|_| CollectionError::DatabaseError)
    }

    pub async fn get_collections(&self, token: String) -> Result<Vec<Collection>, CollectionError> {
        let user_uuid = decode_jwt_uuid(&token).map_err(|_| CollectionError::InvalidToken)?;
        let user = self
            .user_repository
            .find_user_by_uuid(user_uuid)
            .await
            .map_err(|_| CollectionError::InvalidToken)?;
        self.collection_repository
            .get_collections(user.id)
            .await
            .map_err(|_| CollectionError::DatabaseError)
    }

    pub async fn switch_area_collection(
        &self,
        collection_id: i32,
        is_public: bool,
        token: String,
    ) -> Result<(), CollectionError> {
        let user_uuid = decode_jwt_uuid(&token).map_err(|_| CollectionError::InvalidToken)?;
        let user = self
            .user_repository
            .find_user_by_uuid(user_uuid)
            .await
            .map_err(|_| CollectionError::InvalidToken)?;

        let collection = self
            .collection_repository
            .get_collection_by_id(collection_id)
            .await
            .map_err(|_| CollectionError::DatabaseError)?;

        if collection.user_id != user.id {
            return Err(CollectionError::DatabaseError);
        }

        self.collection_repository
            .update_collection_area_status(collection_id, is_public)
            .await
            .map_err(|_| CollectionError::DatabaseError)?;

        Ok(())
    }
}

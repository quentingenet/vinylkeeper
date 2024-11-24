use diesel::{result::Error as DieselError, ExpressionMethods, QueryDsl, SelectableHelper};
use diesel_async::{pooled_connection::bb8::Pool, AsyncPgConnection, RunQueryDsl};

use crate::db::{
    models::collection::{Collection, NewCollection, UpdatedCollection},
    schema::collections,
};

pub struct CollectionRepository {
    pub pool: Pool<AsyncPgConnection>,
}

impl CollectionRepository {
    pub fn new(pool: Pool<AsyncPgConnection>) -> Self {
        CollectionRepository { pool }
    }

    pub async fn create_collection(
        &self,
        new_collection: NewCollection,
    ) -> Result<NewCollection, DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        diesel::insert_into(collections::table)
            .values(&new_collection)
            .execute(&mut conn)
            .await?;
        Ok(new_collection)
    }

    pub async fn get_collections(&self, user_id: i32) -> Result<Vec<Collection>, DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        let collections = collections::table
            .select(Collection::as_select())
            .filter(collections::user_id.eq(user_id))
            .load::<Collection>(&mut conn)
            .await?;
        Ok(collections)
    }

    pub async fn get_collection_by_id(
        &self,
        collection_id: i32,
    ) -> Result<Collection, DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        Ok(collections::table
            .find(collection_id)
            .first::<Collection>(&mut conn)
            .await?)
    }

    pub async fn update_collection_area_status(
        &self,
        collection_id: i32,
        is_public: bool,
    ) -> Result<(), DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        diesel::update(collections::table.find(collection_id))
            .set(collections::is_public.eq(is_public))
            .execute(&mut conn)
            .await
            .map_err(|_| DieselError::NotFound)?;
        Ok(())
    }

    pub async fn delete_collection(
        &self,
        user_id: i32,
        collection_id: i32,
    ) -> Result<(), DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        diesel::delete(collections::table.find(collection_id))
            .filter(collections::user_id.eq(user_id))
            .execute(&mut conn)
            .await?;
        Ok(())
    }

    pub async fn update_collection(
        &self,
        user_id: i32,
        collection_id: i32,
        collection_updated: UpdatedCollection,
    ) -> Result<(), DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        diesel::update(collections::table.find(collection_id))
            .filter(collections::user_id.eq(user_id))
            .set((
                collections::name.eq(collection_updated.name),
                collections::description.eq(collection_updated.description),
                collections::is_public.eq(collection_updated.is_public),
                collections::updated_at.eq(chrono::Local::now().naive_local()),
            ))
            .execute(&mut conn)
            .await?;
        Ok(())
    }
}

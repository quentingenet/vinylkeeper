use diesel::{result::Error as DieselError, ExpressionMethods, QueryDsl, SelectableHelper};
use diesel_async::{pooled_connection::bb8::Pool, AsyncPgConnection, RunQueryDsl};

use crate::db::{
    models::collection::{Collection, NewCollection},
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
}

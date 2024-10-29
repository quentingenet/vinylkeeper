use crate::db::models::user::{NewUser, User};
use crate::db::schema::users;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel::result::Error as DieselError;
use diesel_async::pooled_connection::bb8::Pool;
use diesel_async::{AsyncPgConnection, RunQueryDsl};
use uuid::Uuid;
pub struct UserRepository {
    pub pool: Pool<AsyncPgConnection>,
}

impl UserRepository {
    pub fn new(pool: Pool<AsyncPgConnection>) -> Self {
        UserRepository { pool }
    }

    pub async fn find_by_email(&self, email: &str) -> Result<User, DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        users::table
            .filter(users::email.eq(email))
            .select(User::as_select())
            .first::<User>(&mut conn)
            .await
    }

    pub async fn find_user_by_uuid(&self, user_uuid: Uuid) -> Result<User, DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        users::table
            .filter(users::uuid_user.eq(user_uuid))
            .select(User::as_select())
            .first::<User>(&mut conn)
            .await
    }

    pub async fn is_unique_user(
        &self,
        email: &str,
        username: &str,
        uuid_user: Uuid,
    ) -> Result<bool, DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;

        let existing_user = users::table
            .filter(users::email.eq(email))
            .or_filter(users::username.eq(username))
            .or_filter(users::uuid_user.eq(uuid_user))
            .first::<User>(&mut conn)
            .await
            .optional()?;

        Ok(existing_user.is_none())
    }

    pub async fn create(&self, new_user: &NewUser) -> Result<User, DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        diesel::insert_into(users::table)
            .values(new_user)
            .get_result(&mut conn)
            .await
    }

    pub async fn update_user(&self, user: &User) -> Result<(), DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        diesel::update(users::table.filter(users::id.eq(user.id)))
            .set((
                users::last_login.eq(user.last_login),
                users::updated_at.eq(user.updated_at),
            ))
            .execute(&mut conn)
            .await
            .map(|_| ())
    }

    pub async fn update_last_login(
        &self,
        user_id: i32,
        last_login: NaiveDateTime,
    ) -> Result<(), DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        diesel::update(users::table.filter(users::id.eq(user_id)))
            .set(users::last_login.eq(last_login))
            .execute(&mut conn)
            .await
            .map(|_| ())
    }

    pub async fn update_password(
        &self,
        user_id: i32,
        hashed_password: &str,
    ) -> Result<(), DieselError> {
        let mut conn = self.pool.get().await.map_err(|_| DieselError::NotFound)?;
        diesel::update(users::table.filter(users::id.eq(user_id)))
            .set(users::password.eq(hashed_password))
            .execute(&mut conn)
            .await
            .map(|_| ())
    }
}

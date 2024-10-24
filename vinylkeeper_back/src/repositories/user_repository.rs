use crate::db::models::user::{NewUser, User};
use crate::db::schema::users;
use diesel::prelude::*;
use diesel::result::Error as DieselError;
use diesel_async::pooled_connection::bb8::Pool;
use diesel_async::AsyncPgConnection;
use diesel_async::RunQueryDsl;

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
}

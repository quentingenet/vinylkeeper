use crate::db::models::user::User;
use crate::db::schema::users;
use diesel::prelude::*;
use diesel::result::Error as DieselError;
use diesel_async::AsyncPgConnection;
use diesel_async::RunQueryDsl;

pub struct UserRepository<'a> {
    pub connection: &'a mut AsyncPgConnection,
}

impl<'a> UserRepository<'a> {
    pub fn new(connection: &'a mut AsyncPgConnection) -> Self {
        UserRepository { connection }
    }

    pub async fn find_by_email(&mut self, email: &str) -> Result<User, DieselError> {
        users::table
            .filter(users::email.eq(email))
            .select(User::as_select())
            .first::<User>(self.connection)
            .await
    }

    pub async fn create(&mut self, new_user: &User) -> Result<User, DieselError> {
        diesel::insert_into(users::table)
            .values(new_user)
            .get_result(self.connection)
            .await
    }
}

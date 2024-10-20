use crate::db::models::user::User;
use crate::db::schema::users;
use diesel::prelude::*;
use diesel::result::Error as DieselError;

pub struct UserRepository<'a> {
    pub connection: &'a PgConnection,
}

impl<'a> UserRepository<'a> {
    pub fn find_by_email(&self, email: &str) -> Result<User, DieselError> {
        users::table
            .filter(users::email.eq(email))
            .first::<User>(&mut self.connection)
    }

    pub fn create(&self, new_user: &User) -> Result<User, DieselError> {
        diesel::insert_into(users::table)
            .values(new_user)
            .get_result(self.connection)
    }
}

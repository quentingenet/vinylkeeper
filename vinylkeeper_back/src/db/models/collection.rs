use crate::{db::models::user::User, db::schema::collections};
use chrono::NaiveDateTime;
use diesel::prelude::*;

#[derive(Queryable, Insertable, Associations)]
#[belongs_to(User)]
#[diesel(table_name = collections)]
pub struct Collection {
    pub id: i32,
    pub name: String,
    pub user_id: i32,
    pub is_public: Option<bool>,
    pub registered_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

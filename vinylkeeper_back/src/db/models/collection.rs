use diesel::prelude::*;
use crate::schema::collections;
use chrono::NaiveDateTime;

#[derive(Queryable, Insertable, Associations)]
#[belongs_to(User)]
#[table_name = "collections"]
pub struct Collection {
    pub id: i32,
    pub name: String,
    pub user_id: i32,
    pub registered_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

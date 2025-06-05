use crate::schema::genres;
use diesel::prelude::*;

#[derive(Queryable, Insertable)]
#[diesel(table_name = genres)]
pub struct Genre {
    pub id: i32,
    pub name: String,
}

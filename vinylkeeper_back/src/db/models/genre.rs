use diesel::prelude::*;
use crate::schema::genres;

#[derive(Queryable, Insertable)]
#[table_name = "genres"]
pub struct Genre {
    pub id: i32,
    pub name: String,
}

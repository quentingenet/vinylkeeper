use diesel::prelude::*;
use crate::schema::artists;

#[derive(Queryable, Insertable)]
#[table_name = "artists"]
pub struct Artist {
    pub id: i32,
    pub name: String,
    pub country: Option<String>,
    pub biography: Option<String>,
}

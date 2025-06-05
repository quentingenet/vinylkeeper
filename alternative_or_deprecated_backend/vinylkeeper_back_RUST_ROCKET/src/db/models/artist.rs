use crate::schema::artists;
use diesel::prelude::*;

#[derive(Queryable, Insertable)]
#[diesel(table_name = artists)]
pub struct Artist {
    pub id: i32,
    pub name: String,
    pub country: Option<String>,
    pub biography: Option<String>,
}

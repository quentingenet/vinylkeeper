use crate::schema::users;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel::sql_types::{Bool, Integer, Text, Timestamp};
use serde::{Deserialize, Serialize};

#[derive(Queryable, Insertable, Serialize, Deserialize)]
#[table_name = "users"]
pub struct User {
    pub id: i32,
    pub role_id: i32,
    pub username: String,
    pub email: String,
    pub password: String,
    pub is_accepted_terms: bool,
    pub is_active: bool,
    pub is_superuser: bool,
    pub last_login: Option<NaiveDateTime>,
    pub registered_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub timezone: String,
}

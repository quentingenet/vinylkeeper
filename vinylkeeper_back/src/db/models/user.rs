use crate::db::schema::users;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Queryable, Clone, Selectable, Serialize, Deserialize)]
#[diesel(table_name = users)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub password: String,
    pub is_accepted_terms: Option<bool>,
    pub is_active: Option<bool>,
    pub is_superuser: Option<bool>,
    pub last_login: Option<NaiveDateTime>,
    pub registered_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub timezone: String,
    pub role_id: i32,
}

#[derive(Insertable, Clone, Serialize, Deserialize)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub username: String,
    pub email: String,
    pub password: String,
    pub is_accepted_terms: Option<bool>,
    pub is_active: Option<bool>,
    pub is_superuser: Option<bool>,
    pub timezone: String,
    pub role_id: i32,
}

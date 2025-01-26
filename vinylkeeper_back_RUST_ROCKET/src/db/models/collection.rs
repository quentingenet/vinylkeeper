use crate::{db::models::user::User, db::schema::collections};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Queryable, Insertable, Selectable, Associations, Serialize, Deserialize, Debug)]
#[diesel(belongs_to(User))]
#[diesel(table_name = collections)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Collection {
    pub id: i32,
    pub name: String,
    pub user_id: i32,
    pub registered_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub is_public: bool,
    pub description: Option<String>,
}

#[derive(Insertable, Clone, Serialize, Deserialize)]
#[diesel(table_name = collections)]
pub struct NewCollection {
    pub name: String,
    pub description: Option<String>,
    pub is_public: bool,
    pub user_id: Option<i32>,
    pub registered_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Insertable, Clone, Serialize, Deserialize)]
#[diesel(table_name = collections)]
pub struct UpdatedCollection {
    pub name: String,
    pub description: Option<String>,
    pub is_public: bool,
}

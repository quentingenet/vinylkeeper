use crate::models::{Artist, Collection, Genre};
use crate::schema::albums;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

// Définition des enums
#[derive(Debug, Serialize, Deserialize, AsExpression, FromSqlRow)]
#[sql_type = "diesel::sql_types::Text"]
pub enum ConditionEnum {
    MINT,
    NEAR_MINT,
    VERY_GOOD_PLUS,
    VERY_GOOD,
    GOOD_PLUS,
    GOOD,
    FAIR,
    POOR,
}

#[derive(Debug, Serialize, Deserialize, AsExpression, FromSqlRow)]
#[sql_type = "diesel::sql_types::Text"]
pub enum MoodEnum {
    HAPPY,
    SAD,
    EXCITED,
    CALM,
    ANGRY,
    RELAXED,
    ENERGETIC,
    MELANCHOLIC,
}

#[derive(Queryable, Insertable, Associations)]
#[diesel(belongs_to(Artist))]
#[diesel(belongs_to(Genre))]
#[diesel(belongs_to(Collection))]
#[diesel(table_name = albums)]
pub struct Album {
    pub id: i32,
    pub title: String,
    pub artist_id: i32,     // Clé étrangère vers Artist
    pub genre_id: i32,      // Clé étrangère vers Genre
    pub collection_id: i32, // Clé étrangère vers Collection
    pub release_year: Option<i32>,
    pub description: Option<String>,
    pub cover_condition: Option<ConditionEnum>,
    pub record_condition: Option<ConditionEnum>,
    pub mood: Option<MoodEnum>,
}

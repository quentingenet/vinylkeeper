use diesel::prelude::*;
use crate::schema::albums;
use crate::models::{Artist, Genre, Collection};
use chrono::NaiveDateTime;
use serde::{Serialize, Deserialize};

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
#[belongs_to(Artist)]
#[belongs_to(Genre)]
#[belongs_to(Collection)]
#[table_name = "albums"]
pub struct Album {
    pub id: i32,
    pub title: String,
    pub artist_id: i32,           // Clé étrangère vers Artist
    pub genre_id: i32,            // Clé étrangère vers Genre
    pub collection_id: i32,       // Clé étrangère vers Collection
    pub release_year: Option<i32>,
    pub description: Option<String>,
    pub cover_condition: Option<ConditionEnum>,
    pub record_condition: Option<ConditionEnum>,
    pub mood: Option<MoodEnum>,
}

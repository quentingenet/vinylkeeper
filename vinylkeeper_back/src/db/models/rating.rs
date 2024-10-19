use diesel::prelude::*;
use crate::schema::ratings;

#[derive(Queryable, Insertable, Associations)]
#[belongs_to(User)]
#[belongs_to(Album)]
#[table_name = "ratings"]
pub struct Rating {
    pub id: i32,
    pub rating: Option<i32>,   // Nullable pour la note
    pub comment: Option<String>,
    pub user_id: i32,          // Clé étrangère vers User
    pub album_id: i32,         // Clé étrangère vers Album
}

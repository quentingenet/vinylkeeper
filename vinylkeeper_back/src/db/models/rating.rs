use crate::schema::ratings;
use diesel::prelude::*;

#[derive(Queryable, Insertable, Associations)]
#[diesel(belongs_to(User))]
#[diesel(belongs_to(Album))]
#[diesel(table_name = ratings)]
pub struct Rating {
    pub id: i32,
    pub rating: Option<i32>, // Nullable pour la note
    pub comment: Option<String>,
    pub user_id: i32,  // Clé étrangère vers User
    pub album_id: i32, // Clé étrangère vers Album
}

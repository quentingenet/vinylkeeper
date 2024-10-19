use diesel::prelude::*;
use crate::schema::wishlists;
use chrono::NaiveDateTime;

#[derive(Queryable, Insertable, Associations)]
#[belongs_to(User)]
#[belongs_to(Album)]
#[table_name = "wishlists"]
pub struct Wishlist {
    pub id: i32,
    pub user_id: i32,
    pub album_id: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

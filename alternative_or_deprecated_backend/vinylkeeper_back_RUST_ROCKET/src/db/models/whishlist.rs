use crate::schema::wishlists;
use chrono::NaiveDateTime;
use diesel::prelude::*;

#[derive(Queryable, Insertable, Associations)]
#[diesel(belongs_to(User))]
#[diesel(belongs_to(Album))]
#[diesel(table_name = wishlists)]
pub struct Wishlist {
    pub id: i32,
    pub user_id: i32,
    pub album_id: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

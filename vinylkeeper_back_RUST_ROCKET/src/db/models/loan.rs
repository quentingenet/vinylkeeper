use crate::schema::loans;
use chrono::NaiveDateTime;
use diesel::prelude::*;

#[derive(Queryable, Insertable, Associations)]
#[diesel(belongs_to(User))]
#[diesel(belongs_to(Album))]
#[diesel(table_name = loans)]
pub struct Loan {
    pub id: i32,
    pub user_id: i32,
    pub album_id: i32,
    pub loan_date: NaiveDateTime,
    pub return_date: Option<NaiveDateTime>,
    pub updated_at: NaiveDateTime,
}

use diesel::prelude::*;
use crate::schema::loans;
use chrono::NaiveDateTime;

#[derive(Queryable, Insertable, Associations)]
#[belongs_to(User)]
#[belongs_to(Album)]
#[table_name = "loans"]
pub struct Loan {
    pub id: i32,
    pub user_id: i32,
    pub album_id: i32,
    pub loan_date: NaiveDateTime,
    pub return_date: Option<NaiveDateTime>,
    pub updated_at: NaiveDateTime,
}

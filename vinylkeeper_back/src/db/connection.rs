use diesel::r2d2::{ConnectionManager, Pool};
use diesel::PgConnection;

pub fn create_pool(database_url: &str) -> Pool<ConnectionManager<PgConnection>> {
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    Pool::builder()
        .build(manager)
        .expect("Failed to create pool.")
}

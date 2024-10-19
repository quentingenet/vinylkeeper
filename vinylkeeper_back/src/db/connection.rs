use diesel::r2d2::{self, ConnectionManager};
use diesel::PgConnection;

pub type DbPool = r2d2::Pool<ConnectionManager<PgConnection>>;

pub fn establish_connection() -> DbPool {
    let manager = ConnectionManager::<PgConnection>::new(
        "postgres://kent1:monsupermotdepasse2024@localhost/vinyl_keeper_db",
    );

    r2d2::Pool::builder()
        .build(manager)
        .expect("Failed to create pool.")
}

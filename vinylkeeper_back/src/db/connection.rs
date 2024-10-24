use diesel_async::pooled_connection::bb8::Pool;
use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use diesel_async::AsyncPgConnection;
use std::error::Error;

pub type PgPool = Pool<AsyncPgConnection>;

pub struct PoolDB {
    pub pool: PgPool,
}

pub async fn create_pool(database_url: &str) -> Result<PgPool, Box<dyn Error>> {
    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(database_url);
    let pool = Pool::builder().build(manager).await?;

    Ok(pool)
}

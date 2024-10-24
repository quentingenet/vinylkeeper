mod api;
mod core;
mod db;
mod repositories;
mod services;
mod utils;

use crate::api::users::{authenticate, create_user};
use crate::repositories::user_repository::UserRepository;
use crate::services::user_service::UserService;
use core::security::create_cors_fairing;
use db::connection::{create_pool, PoolDB};
use dotenvy;
use rocket::{routes, Build, Rocket};
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg(feature = "dev")]
fn load_env() {
    dotenvy::from_filename(".env.development").ok();
    println!("Development environment loaded");
}

#[cfg(feature = "prod")]
fn load_env() {
    dotenvy::from_filename(".env.production").ok();
    println!("Production environment loaded");
}

#[rocket::main]
async fn main() {
    load_env();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = create_pool(&database_url).await;

    let pool_db = PoolDB { pool };

    let user_repository = Arc::new(Mutex::new(UserRepository::new(pool_db.pool.clone())));
    let user_service = Arc::new(Mutex::new(UserService::new(user_repository)));

    let _ = build_rocket(pool_db, user_service).launch().await;
}

fn build_rocket(pool: PoolDB, user_service: Arc<Mutex<UserService>>) -> Rocket<Build> {
    rocket::build()
        .attach(create_cors_fairing())
        .manage(Arc::new(pool))
        .manage(user_service)
        .mount("/api/users", routes![authenticate, create_user])
}

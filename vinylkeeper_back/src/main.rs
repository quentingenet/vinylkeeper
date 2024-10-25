mod api;
mod core;
mod db;
mod repositories;
mod services;
mod utils;

use crate::api::users::{authenticate, create_user, refresh_token};
use crate::repositories::user_repository::UserRepository;
use crate::services::user_service::UserService;
use core::security::create_cors_fairing;
use db::connection::{create_pool, PoolDB};
use dotenvy;
use rocket::{routes, Build, Rocket};
use std::sync::Arc;

#[rocket::main]
async fn main() {
    load_env();

    let database_url = match std::env::var("DATABASE_URL") {
        Ok(url) => url,
        Err(_) => {
            eprintln!("DATABASE_URL must be set");
            return;
        }
    };

    let pool = match create_pool(&database_url).await {
        Ok(pool) => pool,
        Err(e) => {
            eprintln!("Failed to create the database pool: {}", e);
            return;
        }
    };

    let pool_db = PoolDB { pool };
    let user_repository = Arc::new(UserRepository::new(pool_db.pool.clone()));
    let user_service = Arc::new(UserService::new(user_repository));

    if let Err(e) = build_rocket(pool_db, user_service).launch().await {
        eprintln!("Failed to launch Rocket: {}", e);
    }
}

fn load_env() {
    #[cfg(feature = "dev")]
    {
        dotenvy::from_filename(".env.development").ok();
        println!("Development environment loaded");
    }

    #[cfg(feature = "prod")]
    {
        dotenvy::from_filename(".env.production").ok();
        println!("Production environment loaded");
    }

    if let Ok(database_url) = std::env::var("DATABASE_URL") {
        println!("DATABASE_URL: {}", database_url);
    } else {
        println!("DATABASE_URL must be set");
    }
}

fn build_rocket(pool: PoolDB, user_service: Arc<UserService>) -> Rocket<Build> {
    rocket::build()
        .attach(create_cors_fairing())
        .manage(pool)
        .manage(user_service)
        .mount(
            "/api/users",
            routes![authenticate, create_user, refresh_token],
        )
}

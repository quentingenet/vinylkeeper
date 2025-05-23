mod api;
mod core;
mod db;
mod mail;
mod repositories;
mod services;
mod utils;

use crate::repositories::user_repository::UserRepository;
use crate::services::user_service::UserService;
use api::api_routes::{collection_routes, request_proxy_routes, user_routes};
use core::security::create_cors_fairing;
use db::connection::{create_pool, PoolDB};
use dotenvy;
use repositories::collection_repository::CollectionRepository;
use rocket::{Build, Rocket};
use services::collection_service::CollectionService;
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
    let user_service = Arc::new(UserService::new(user_repository.clone()));
    let collection_repository = Arc::new(CollectionRepository::new(pool_db.pool.clone()));
    let collection_service = Arc::new(CollectionService::new(
        collection_repository,
        user_repository,
    ));

    if let Err(e) = build_rocket(pool_db, user_service, collection_service)
        .launch()
        .await
    {
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

    if std::env::var("DATABASE_URL").is_err() {
        let username = std::env::var("DATABASE_USERNAME").expect("DATABASE_USERNAME must be set");
        let password = std::env::var("DATABASE_PASSWORD").expect("DATABASE_PASSWORD must be set");
        let host = std::env::var("DATABASE_HOST").unwrap_or_else(|_| "localhost".to_string());
        let port = std::env::var("DATABASE_PORT").unwrap_or_else(|_| "5432".to_string());
        let db_name = std::env::var("DATABASE_NAME").expect("DATABASE_NAME must be set");

        let database_url = format!(
            "postgres://{}:{}@{}:{}/{}",
            username, password, host, port, db_name
        );
        std::env::set_var("DATABASE_URL", &database_url);

        println!("DATABASE_URL generated dynamically");
    } else {
        println!("DATABASE_URL loaded from environment");
    }
}

fn build_rocket(
    pool: PoolDB,
    user_service: Arc<UserService>,
    collection_service: Arc<CollectionService>,
) -> Rocket<Build> {
    let secret_key = std::env::var("ROCKET_SECRET_KEY").expect("SECRET_KEY must be set");
    rocket::build()
        .attach(create_cors_fairing())
        .manage(pool)
        .manage(user_service)
        .manage(collection_service)
        .mount("/api/users", user_routes())
        .mount("/api/collections", collection_routes())
        .mount("/api/request_proxy", request_proxy_routes())
        .configure(rocket::Config {
            address: "0.0.0.0".parse().unwrap(),
            port: 8000,
            secret_key: rocket::config::SecretKey::from(secret_key.as_bytes()),
            ..Default::default()
        })
}

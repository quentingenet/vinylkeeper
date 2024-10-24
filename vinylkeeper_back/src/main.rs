mod api;
mod core;
mod db;
mod repositories;
mod services;
mod utils;

use crate::api::users::{authenticate, create_user};
use core::security::create_cors_fairing;
use db::connection::{create_pool, PoolDB};
use dotenvy;
use rocket::{routes, Build, Rocket};
use std::sync::Arc;

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

    let _ = build_rocket(pool_db).launch().await;
}

fn build_rocket(pool: PoolDB) -> Rocket<Build> {
    rocket::build()
        .attach(create_cors_fairing())
        .manage(Arc::new(pool))
        .mount("/api/users", routes![authenticate, create_user])
    /*
    .mount("/api/albums", albums::routes())
    .mount("/api/artists", artists::routes())
    .mount("/api/genres", genres::routes())
    .mount("/api/loans", loans::routes())
    .mount("/api/ratings", ratings::routes())

    .mount("/api/wishlists", wishlists::routes())
    */
}

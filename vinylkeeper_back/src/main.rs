#[macro_use]
extern crate rocket;

mod api;
mod core;
mod db;
mod repositories;
mod services;

//use api::{albums, artists, genres, loans, ratings, users, wishlists};
use core::security::create_cors_fairing;
use dotenvy;
use rocket::{Build, Rocket};

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

    let _ = rocket().launch().await;
    fn rocket() -> Rocket<Build> {
        rocket::build().attach(create_cors_fairing())
        /*
                .mount("/api/albums", albums::routes())
                .mount("/api/artists", artists::routes())
                .mount("/api/collections", collections::routes())
                .mount("/api/genres", genres::routes())
                .mount("/api/loans", loans::routes())
                .mount("/api/ratings", ratings::routes())
                .mount("/api/users", users::routes())
                .mount("/api/wishlists", wishlists::routes())
        */
    }
}

use rocket::http::Method;
use rocket_cors::{AllowedHeaders, AllowedOrigins, Cors, CorsOptions};
use std::env;

pub fn create_cors_fairing() -> Cors {
    let allowed_origins_env = env::var("ALLOWED_ORIGINS").unwrap_or_else(|_| String::from(""));
    let allowed_origins: Vec<&str> = allowed_origins_env.split(',').collect();

    let allowed_origins = AllowedOrigins::some_exact(&allowed_origins);

    CorsOptions {
        allowed_headers: AllowedHeaders::some(&["Content-Type", "Authorization", "Accept"]),
        allowed_origins,
        allowed_methods: vec![
            Method::Get,
            Method::Post,
            Method::Put,
            Method::Patch,
            Method::Delete,
            Method::Options,
            Method::Head,
        ]
        .into_iter()
        .map(Into::into)
        .collect(),
        allow_credentials: true,
        expose_headers: vec!["Content-Type"].into_iter().map(Into::into).collect(),
        max_age: Some(3600),
        ..Default::default()
    }
    .to_cors()
    .expect("Failed to create CORS fairing")
}

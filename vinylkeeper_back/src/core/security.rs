use rocket::http::Method;
use rocket_cors::{AllowedHeaders, AllowedOrigins, Cors, CorsOptions};

pub fn create_cors_fairing() -> Cors {
    let allowed_origins = AllowedOrigins::some_exact(&[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://vinyl-keeper.quentingenet.fr",
    ]);

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

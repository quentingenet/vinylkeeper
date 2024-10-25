use rocket::http::Method;
use rocket_cors::{AllowedHeaders, AllowedOrigins, Cors, CorsOptions};

pub fn create_cors_fairing() -> Cors {
    let allowed_origins = AllowedOrigins::some_exact(&["http://localhost:5173"]);

    CorsOptions {
        allowed_headers: AllowedHeaders::some(&["Content-Type", "Authorization"]),
        allowed_origins,
        allowed_methods: vec![
            Method::Get,
            Method::Post,
            Method::Put,
            Method::Patch,
            Method::Delete,
            Method::Options,
        ]
        .into_iter()
        .map(Into::into)
        .collect(),
        allow_credentials: true,
        ..Default::default()
    }
    .to_cors()
    .expect("Failed to create CORS fairing")
}

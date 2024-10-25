use rocket::http::Method;
use rocket_cors::{AllowedOrigins, Cors, CorsOptions};

pub fn create_cors_fairing() -> Cors {
    let allowed_origins = AllowedOrigins::some_exact(&["http://localhost:3000"]);

    CorsOptions {
        allowed_origins,
        allowed_methods: vec![
            Method::Get,
            Method::Post,
            Method::Put,
            Method::Patch,
            Method::Delete,
        ]
        .into_iter()
        .map(Into::into)
        .collect(),
        allow_credentials: true,
        ..Default::default()
    }
    .to_cors()
    .expect("Cors options failed")
}

use rocket::fairing::AdHoc;
use rocket_cors::{AllowedOrigins, Cors};

pub fn cors() -> Cors {
    Cors::from_options(&AllowedOrigins::some(&["http://localhost:3000"]))
        .allow_credentials(true)
        .allow_headers(rocket_cors::AllowedHeaders::All)
        .allow_methods(rocket_cors::AllowedMethods::All)
        .finish()
}

pub fn create_cors_fairing() -> AdHoc {
    AdHoc::on_request("CORS", |req, _| {
        req.set_header(rocket::http::Header::new(
            "Access-Control-Allow-Origin",
            "*",
        ));
        req.set_header(rocket::http::Header::new(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, PATCH, DELETE",
        ));
        req.set_header(rocket::http::Header::new(
            "Access-Control-Allow-Headers",
            "Authorization, Content-Type",
        ));
    })
}

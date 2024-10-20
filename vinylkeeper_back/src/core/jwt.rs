use crate::db::models::role::Role;
use chrono::{Duration, Utc};
use dotenvy::dotenv;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: i32, // ID user
    pub role: String,
    pub exp: usize, // Expiration timestamp
}

pub fn generate_jwt(user_id: i32, role: Role) -> Result<String, jsonwebtoken::errors::Error> {
    dotenv().ok();

    let claims = Claims {
        sub: user_id,
        role: role.as_str().to_string(),
        exp: (Utc::now() + Duration::days(7)).timestamp() as usize, // JWT valid for 7 days
    };

    let header = Header::default();
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET doit être défini");
    let encoding_key = EncodingKey::from_secret(secret.as_ref());

    encode(&header, &claims, &encoding_key)
}

pub fn validate_jwt(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    dotenv().ok();

    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be defined");
    let decoding_key = DecodingKey::from_secret(secret.as_ref());
    let validation = Validation::default();

    decode::<Claims>(token, &decoding_key, &validation).map(|data| data.claims)
}

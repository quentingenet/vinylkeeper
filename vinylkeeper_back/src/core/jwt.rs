use crate::db::models::role::Role;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: i32,
    pub role: String,
    pub exp: usize,
}

fn get_private_key() -> EncodingKey {
    let private_key = fs::read("src/keys/private_key.pem").expect("Unable to read private key");
    EncodingKey::from_rsa_pem(&private_key).expect("Invalid RSA private key")
}

fn get_public_key() -> DecodingKey {
    let public_key = fs::read("src/keys/public_key.pem").expect("Unable to read public key");
    DecodingKey::from_rsa_pem(&public_key).expect("Invalid RSA public key")
}

pub fn generate_jwt(user_id: i32, role: Role) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims {
        sub: user_id,
        role: role.as_str().to_string(),
        exp: (Utc::now() + Duration::minutes(15)).timestamp() as usize,
    };

    let header = Header::new(jsonwebtoken::Algorithm::RS256);
    let encoding_key = get_private_key();

    encode(&header, &claims, &encoding_key)
}

pub fn validate_jwt(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let decoding_key = get_public_key();
    let validation = Validation::new(jsonwebtoken::Algorithm::RS256);

    decode::<Claims>(token, &decoding_key, &validation).map(|data| data.claims)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshClaims {
    pub sub: i32,
    pub role: String,
    pub exp: usize,
}

pub fn generate_refresh_token(
    user_id: i32,
    role: Role,
) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = RefreshClaims {
        sub: user_id,
        role: role.as_str().to_string(),
        exp: (Utc::now() + Duration::days(7)).timestamp() as usize,
    };

    let header = Header::new(jsonwebtoken::Algorithm::RS256);
    let encoding_key = get_private_key();

    encode(&header, &claims, &encoding_key)
}

pub fn validate_refresh_token(token: &str) -> Result<RefreshClaims, jsonwebtoken::errors::Error> {
    let decoding_key = get_public_key();
    let validation = Validation::new(jsonwebtoken::Algorithm::RS256);

    decode::<RefreshClaims>(token, &decoding_key, &validation).map(|data| data.claims)
}

use crate::db::models::role::Role;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::fs;
use uuid::Uuid;
#[derive(Debug, Serialize, Deserialize)]

pub struct Claims {
    pub sub: Uuid,
    pub role: String,
    pub exp: usize,
}

static PRIVATE_KEY: OnceCell<EncodingKey> = OnceCell::new();
static PUBLIC_KEY: OnceCell<DecodingKey> = OnceCell::new();

fn load_private_key() -> EncodingKey {
    let private_key = fs::read("src/keys/private_key.pem")
        .expect("Unable to read private key from 'src/keys/private_key.pem'");
    EncodingKey::from_rsa_pem(&private_key).expect("Invalid RSA private key format")
}

fn load_public_key() -> DecodingKey {
    let public_key = fs::read("src/keys/public_key.pem")
        .expect("Unable to read public key from 'src/keys/public_key.pem'");
    DecodingKey::from_rsa_pem(&public_key).expect("Invalid RSA public key format")
}

fn get_private_key() -> &'static EncodingKey {
    PRIVATE_KEY.get_or_init(load_private_key)
}

fn get_public_key() -> &'static DecodingKey {
    PUBLIC_KEY.get_or_init(load_public_key)
}

pub fn generate_jwt(uuid_user: Uuid, role: Role) -> Result<String, jsonwebtoken::errors::Error> {
    let claims: Claims = Claims {
        sub: uuid_user,
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
    pub sub: Uuid,
    pub role: String,
    pub exp: usize,
}

pub fn generate_refresh_token(
    uuid_user: Uuid,
    role: Role,
) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = RefreshClaims {
        sub: uuid_user,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ResetClaims {
    pub sub: Uuid,
    pub exp: usize,
}

pub fn generate_reset_token(uuid_user: Uuid) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = ResetClaims {
        sub: uuid_user,
        exp: (Utc::now() + Duration::minutes(15)).timestamp() as usize,
    };

    let header = Header::new(jsonwebtoken::Algorithm::RS256);
    let encoding_key = get_private_key();

    encode(&header, &claims, &encoding_key)
}

pub fn validate_reset_token(token: &str) -> Result<ResetClaims, jsonwebtoken::errors::Error> {
    let decoding_key = get_public_key();
    let validation = Validation::new(jsonwebtoken::Algorithm::RS256);

    decode::<ResetClaims>(token, &decoding_key, &validation).map(|data| data.claims)
}

pub fn decode_jwt_uuid(token: &str) -> Result<Uuid, jsonwebtoken::errors::Error> {
    let decoding_key = get_public_key();
    let validation = Validation::new(jsonwebtoken::Algorithm::RS256);

    decode::<Claims>(token, &decoding_key, &validation).map(|data| data.claims.sub)
}

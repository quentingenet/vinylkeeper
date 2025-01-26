use reqwest::Client;
use rocket::http::Status;
use rocket::post;
use rocket::serde::json::Json;
use serde::{Deserialize, Serialize};
use urlencoding::encode;
use uuid::Uuid;
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub is_artist: bool,
}

#[derive(Debug, Serialize)]
pub struct DeezerData {
    pub uuid: Uuid,
    pub id: u32,
    pub name: Option<String>,  // For artists
    pub title: Option<String>, // For albums
    pub link: Option<String>,
    pub picture: Option<String>,
    pub picture_small: Option<String>,
    pub picture_medium: Option<String>,
    pub picture_big: Option<String>,
    pub picture_xl: Option<String>,
    pub nb_album: Option<u32>,
    pub nb_fan: Option<u32>,
    pub radio: Option<bool>,
    pub tracklist: Option<String>,
    pub md5_image: Option<String>,
    pub genre_id: Option<u32>,
    pub nb_tracks: Option<u32>,
    pub record_type: Option<String>,
    pub explicit_lyrics: Option<bool>,
    pub artist: Option<Artist>,
    pub r#type: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Artist {
    pub uuid: Uuid,
    pub id: u32,
    pub name: Option<String>,
    pub link: Option<String>,
    pub picture: Option<String>,
    pub picture_small: Option<String>,
    pub picture_medium: Option<String>,
    pub picture_big: Option<String>,
    pub picture_xl: Option<String>,
    pub tracklist: Option<String>,
    pub r#type: Option<String>,
}

#[post("/search", format = "json", data = "<search_query>")]
pub async fn search(search_query: Json<SearchQuery>) -> Result<Json<Vec<DeezerData>>, Status> {
    if search_query.query.trim().is_empty() {
        eprintln!("Empty request.");
        return Err(Status::BadRequest);
    }

    let client = Client::new();

    let encoded_query = encode(&search_query.query);

    let url = if search_query.is_artist {
        format!("https://api.deezer.com/search/artist?q={}", encoded_query)
    } else {
        format!("https://api.deezer.com/search/album?q={}", encoded_query)
    };

    println!("Deezer request URL: {}", url);

    let response = client.get(&url).send().await.map_err(|e| {
        eprintln!("Network error when calling Deezer: {}", e);
        Status::InternalServerError
    })?;

    if !response.status().is_success() {
        eprintln!(
            "Error from Deezer API (HTTP status {}): {:?}",
            response.status(),
            response
                .text()
                .await
                .unwrap_or_else(|_| "No message".to_string())
        );
        return Err(Status::InternalServerError);
    }

    let json_response: serde_json::Value = response.json().await.map_err(|e| {
        eprintln!("Error deserializing Deezer response: {}", e);
        Status::InternalServerError
    })?;

    let results = if search_query.is_artist {
        json_response["data"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|item| DeezerData {
                uuid: Uuid::new_v4(),
                id: item["id"].as_u64().unwrap_or(0) as u32,
                name: item["name"].as_str().map(|s| s.to_string()),
                title: None, // empty for artists
                link: item["link"].as_str().map(|s| s.to_string()),
                picture: item["picture"].as_str().map(|s| s.to_string()),
                picture_small: item["picture_small"].as_str().map(|s| s.to_string()),
                picture_medium: item["picture_medium"].as_str().map(|s| s.to_string()),
                picture_big: item["picture_big"].as_str().map(|s| s.to_string()),
                picture_xl: item["picture_xl"].as_str().map(|s| s.to_string()),
                nb_album: item["nb_album"].as_u64().map(|n| n as u32),
                nb_fan: item["nb_fan"].as_u64().map(|n| n as u32),
                radio: item["radio"].as_bool(),
                tracklist: item["tracklist"].as_str().map(|s| s.to_string()),
                md5_image: None,
                genre_id: None,
                nb_tracks: None,
                record_type: None,
                explicit_lyrics: None,
                artist: None,
                r#type: Some("artist".to_string()),
            })
            .collect::<Vec<DeezerData>>()
    } else {
        json_response["data"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|item| DeezerData {
                uuid: Uuid::new_v4(),
                id: item["id"].as_u64().unwrap_or(0) as u32,
                name: None, //empty for albums
                title: item["title"].as_str().map(|s| s.to_string()),
                link: item["link"].as_str().map(|s| s.to_string()),
                picture: item["cover"].as_str().map(|s| s.to_string()),
                picture_small: item["cover_small"].as_str().map(|s| s.to_string()),
                picture_medium: item["cover_medium"].as_str().map(|s| s.to_string()),
                picture_big: item["cover_big"].as_str().map(|s| s.to_string()),
                picture_xl: item["cover_xl"].as_str().map(|s| s.to_string()),
                nb_album: None,
                nb_fan: None,
                radio: None,
                tracklist: item["tracklist"].as_str().map(|s| s.to_string()),
                md5_image: item["md5_image"].as_str().map(|s| s.to_string()),
                genre_id: item["genre_id"].as_u64().map(|n| n as u32),
                nb_tracks: item["nb_tracks"].as_u64().map(|n| n as u32),
                record_type: item["record_type"].as_str().map(|s| s.to_string()),
                explicit_lyrics: item["explicit_lyrics"].as_bool(),
                artist: Some(Artist {
                    uuid: Uuid::new_v4(),
                    id: item["artist"]["id"].as_u64().unwrap_or(0) as u32,
                    name: item["artist"]["name"].as_str().map(|s| s.to_string()),
                    link: item["artist"]["link"].as_str().map(|s| s.to_string()),
                    picture: item["artist"]["picture"].as_str().map(|s| s.to_string()),
                    picture_small: item["artist"]["picture_small"]
                        .as_str()
                        .map(|s| s.to_string()),
                    picture_medium: item["artist"]["picture_medium"]
                        .as_str()
                        .map(|s| s.to_string()),
                    picture_big: item["artist"]["picture_big"]
                        .as_str()
                        .map(|s| s.to_string()),
                    picture_xl: item["artist"]["picture_xl"].as_str().map(|s| s.to_string()),
                    tracklist: item["artist"]["tracklist"].as_str().map(|s| s.to_string()),
                    r#type: item["artist"]["type"].as_str().map(|s| s.to_string()),
                }),
                r#type: item["type"].as_str().map(|s| s.to_string()),
            })
            .collect::<Vec<DeezerData>>()
    };

    Ok(Json(results))
}

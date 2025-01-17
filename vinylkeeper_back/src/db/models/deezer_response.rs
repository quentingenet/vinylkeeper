use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Représente une réponse de l'API Deezer pour une recherche.
#[derive(Debug, Deserialize, Serialize)]
pub struct DeezerResponse {
    pub data: Vec<Track>,     // Liste des pistes ou éléments retournés.
    pub total: u32,           // Nombre total d'éléments trouvés.
    pub next: Option<String>, // URL pour la page suivante (si pagination disponible).
}

/// Représente une piste (track) retournée par l'API Deezer.
#[derive(Debug, Deserialize, Serialize)]
pub struct Track {
    pub id: u32,
    pub readable: Option<bool>,
    pub title: String,
    pub title_short: Option<String>,
    pub title_version: Option<String>,
    pub link: String,
    pub duration: u32,
    pub rank: u32,
    pub explicit_lyrics: bool,
    pub explicit_content_lyrics: u8,
    pub explicit_content_cover: u8,
    pub preview: String,
    pub md5_image: String,
    pub artist: Artist,
    pub album: Album,
    #[serde(flatten)]
    pub extra: Value, // Capture tous les champs supplémentaires
}
/// Représente un artiste associé à une piste ou un album.
#[derive(Debug, Deserialize, Serialize)]
pub struct Artist {
    pub id: u32,
    pub name: String,
    pub link: String,
    pub picture: Option<String>, // Certaines réponses peuvent ne pas inclure d'images.
    pub picture_small: Option<String>,
    pub picture_medium: Option<String>,
    pub picture_big: Option<String>,
    pub picture_xl: Option<String>,
    pub tracklist: String,
    #[serde(rename = "type")]
    pub type_field: String, // Champ renommé pour éviter le conflit avec le mot réservé `type`.
}

/// Représente un album associé à une piste ou un artiste.
#[derive(Debug, Deserialize, Serialize)]
pub struct Album {
    pub id: u32,
    pub title: String,
    pub cover: Option<String>,
    pub cover_small: Option<String>,
    pub cover_medium: Option<String>,
    pub cover_big: Option<String>,
    pub cover_xl: Option<String>,
    pub md5_image: String,
    pub tracklist: String,
    #[serde(rename = "type")]
    pub type_field: String, // Champ renommé pour éviter le conflit avec le mot réservé `type`.
}

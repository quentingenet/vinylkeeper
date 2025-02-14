import requests
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from typing import List
from vinylkeeper_back.schemas.request_proxy.request_proxy_deezer import DeezerData, SearchQuery, Artist


router = APIRouter()

@router.post("/search", response_model=List[DeezerData])
async def search(search_query: SearchQuery):
    if not search_query.query.strip():
        raise HTTPException(status_code=400, detail="Empty request.")

    encoded_query = requests.utils.quote(search_query.query)
    url = f"https://api.deezer.com/search/{'artist' if search_query.is_artist else 'album'}?q={encoded_query}"

    print(f"Deezer request URL: {url}")

    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error from Deezer API: {str(e)}")

    json_response = response.json()
    results = []

    for item in json_response.get("data", []):
        try:
            if search_query.is_artist:
                results.append(DeezerData(
                    id=item.get("id", 0),
                    name=item.get("name"),
                    link=item.get("link"),
                    picture=item.get("picture"),
                    picture_small=item.get("picture_small"),
                    picture_medium=item.get("picture_medium"),
                    picture_big=item.get("picture_big"),
                    picture_xl=item.get("picture_xl"),
                    nb_album=item.get("nb_album"),
                    nb_fan=item.get("nb_fan"),
                    radio=item.get("radio"),
                    tracklist=item.get("tracklist"),
                    type="artist"
                ))
            else:
                results.append(DeezerData(
                    id=item.get("id", 0),
                    title=item.get("title"),
                    link=item.get("link"),
                    picture=item.get("cover"),
                    picture_small=item.get("cover_small"),
                    picture_medium=item.get("cover_medium"),
                    picture_big=item.get("cover_big"),
                    picture_xl=item.get("cover_xl"),
                    tracklist=item.get("tracklist"),
                    md5_image=item.get("md5_image"),
                    genre_id=item.get("genre_id"),
                    nb_tracks=item.get("nb_tracks"),
                    record_type=item.get("record_type"),
                    explicit_lyrics=item.get("explicit_lyrics"),
                    artist=Artist(
                        id=item["artist"].get("id", 0),
                        name=item["artist"].get("name"),
                        link=item["artist"].get("link"),
                        picture=item["artist"].get("picture"),
                        picture_small=item["artist"].get("picture_small"),
                        picture_medium=item["artist"].get("picture_medium"),
                        picture_big=item["artist"].get("picture_big"),
                        picture_xl=item["artist"].get("picture_xl"),
                        tracklist=item["artist"].get("tracklist"),
                        type=item["artist"].get("type")
                    ) if "artist" in item else None,
                    type=item.get("type")
                ))
        except ValidationError as e:
            print(f"Validation error: {e}")

    return results

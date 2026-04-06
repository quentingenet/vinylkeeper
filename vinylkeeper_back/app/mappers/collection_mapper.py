from typing import Optional

from app.core.enums import VinylStateEnum
from app.core.logging import logger
from app.schemas.collection_schema import CollectionAlbumResponse, CollectionArtistResponse
from app.schemas.user_schema import UserMiniResponse


def external_source_to_dict(external_source) -> Optional[dict]:
    if external_source is None:
        logger.warning("external_source is None — data integrity issue")
        return None
    return {"id": external_source.id, "name": external_source.name}


def album_to_collection_album_response(album, collection_album=None) -> CollectionAlbumResponse:
    state_record = None
    state_cover = None
    acquisition_month_year = None

    if collection_album:
        if collection_album.state_record_ref:
            state_record = VinylStateEnum(collection_album.state_record_ref.name)
        if collection_album.state_cover_ref:
            state_cover = VinylStateEnum(collection_album.state_cover_ref.name)
        acquisition_month_year = collection_album.acquisition_month_year

    external_source_dict = external_source_to_dict(
        album.external_source if hasattr(album, "external_source") else None
    )

    created_at = (
        collection_album.created_at
        if collection_album and collection_album.created_at
        else album.created_at
    )
    updated_at = (
        collection_album.updated_at
        if collection_album and collection_album.updated_at
        else album.updated_at
    )

    return CollectionAlbumResponse(
        id=album.id,
        external_album_id=album.external_album_id,
        external_source_id=album.external_source_id,
        external_source=external_source_dict,
        title=album.title,
        image_url=album.image_url,
        state_record=state_record,
        state_cover=state_cover,
        acquisition_month_year=acquisition_month_year,
        created_at=created_at,
        updated_at=updated_at,
        collections_count=album.collections_count,
        loans_count=album.loans_count,
        wishlist_count=album.wishlist_count,
    )


def artist_to_collection_artist_response(artist, collection_artist=None) -> CollectionArtistResponse:
    external_source_dict = external_source_to_dict(
        artist.external_source if hasattr(artist, "external_source") else None
    )

    created_at = (
        collection_artist.created_at
        if collection_artist and collection_artist.created_at
        else artist.created_at
    )
    updated_at = (
        collection_artist.updated_at
        if collection_artist and collection_artist.updated_at
        else artist.updated_at
    )

    return CollectionArtistResponse(
        id=artist.id,
        external_artist_id=artist.external_artist_id,
        title=artist.title,
        image_url=artist.image_url,
        external_source=external_source_dict,
        created_at=created_at,
        updated_at=updated_at,
        collections_count=artist.collections_count,
    )


def user_to_mini_response(user) -> UserMiniResponse:
    return UserMiniResponse(username=user.username, user_uuid=user.user_uuid)

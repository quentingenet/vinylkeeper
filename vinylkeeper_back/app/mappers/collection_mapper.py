from typing import Optional

from app.core.enums import VinylStateEnum
from app.core.logging import logger
from app.core.orm_utils import is_loaded
from app.schemas.collection_album_schema import CollectionAlbumCopyResponse
from app.schemas.collection_schema import (
    CollectionAlbumResponse, CollectionArtistResponse, CollectionRecordResponse,
)
from app.schemas.user_schema import UserMiniResponse
from app.utils.vinyl_state_mapping import VinylStateMapping


def external_source_to_dict(external_source) -> Optional[dict]:
    if external_source is None:
        logger.warning("external_source is None — data integrity issue")
        return None
    return {"id": external_source.id, "name": external_source.name}


def vinyl_state(state_id: Optional[int]) -> Optional[VinylStateEnum]:
    name = VinylStateMapping.get_name_from_id(state_id) if state_id else None
    return VinylStateEnum(name) if name else None


def copy_to_response(copy) -> CollectionAlbumCopyResponse:
    return CollectionAlbumCopyResponse(
        id=copy.id,
        state_record=vinyl_state(copy.state_record),
        state_cover=vinyl_state(copy.state_cover),
        acquisition_month_year=copy.acquisition_month_year,
        created_at=copy.created_at,
    )


def album_to_collection_album_response(album, collection_album=None) -> CollectionAlbumResponse:
    # Not guarded by is_loaded on purpose: a query that forgets to load copies must fail
    # loudly (lazy="raise") rather than answer an album with no condition.
    copies = [copy_to_response(copy) for copy in collection_album.copies] if collection_album else []
    first = copies[0] if copies else None

    external_source_dict = external_source_to_dict(
        album.external_source if is_loaded(album, "external_source") else None
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
        state_record=first.state_record if first else None,
        state_cover=first.state_cover if first else None,
        acquisition_month_year=first.acquisition_month_year if first else None,
        created_at=created_at,
        updated_at=updated_at,
        collections_count=album.collections_count,
        loans_count=album.loans_count,
        wishlist_count=album.wishlist_count,
        copies=copies,
        copies_count=len(copies),
        external_master_id=album.external_master_id,
        pressing_confirmed=bool(collection_album.pressing_confirmed) if collection_album else False,
        release_year=album.release_year,
        country=album.country,
        label=album.label,
        catno=album.catno,
        formats=album.formats or [],
    )


def pressings_to_record_response(work_key: str, pressings: list) -> CollectionRecordResponse:
    """pressings: (album, collection_album) of one work, first added first."""
    responses = [album_to_collection_album_response(album, collection_album) for album, collection_album in pressings]
    first = responses[0]
    return CollectionRecordResponse(
        work_key=work_key,
        title=first.title,
        image_url=first.image_url,
        pressings=responses,
        pressings_count=len(responses),
        copies_count=sum(p.copies_count for p in responses),
        created_at=min(p.created_at for p in responses),
        updated_at=max(p.created_at for p in responses),
    )


def artist_to_collection_artist_response(artist, collection_artist=None) -> CollectionArtistResponse:
    external_source_dict = external_source_to_dict(
        artist.external_source if is_loaded(artist, "external_source") else None
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

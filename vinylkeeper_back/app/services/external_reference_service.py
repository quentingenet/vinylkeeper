from typing import Optional, Union

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.schemas.external_reference_schema import (
    OwnedPressingResponse,
    ReplacePressingRequest,
    AddToWishlistRequest,
    AddToCollectionRequest,
    WishlistItemResponse,
    CollectionItemResponse,
    AddToWishlistResponse,
    AddToCollectionResponse,
    MoveToCollectionResponse,
)
from app.schemas.album_schema import AlbumCreate
from app.schemas.collection_schema import CollectionAlbumResponse
from app.mappers import collection_mapper
from app.schemas.artist_schema import ArtistCreate
from app.core.exceptions import (
    AppException,
    ValidationError,
    ResourceNotFoundError,
    ServerError,
    ForbiddenError,
    ErrorCode,
)
from app.core.logging import logger
from app.core.enums import EntityTypeEnum
from app.core.transaction import transaction_context
from app.models.wishlist_model import Wishlist
from app.models.artist_model import Artist
from app.models.album_model import Album
from app.models.collection_model import Collection


class ExternalReferenceService:
    """Service for managing external references"""

    def __init__(self, repository: ExternalReferenceRepository):
        self.repository = repository

    async def _verify_collection_access(self, collection_id: int, user_id: int) -> Collection:
        """Verify collection exists and user has access to it"""
        # owner_id is all a check needs: never load every album of the collection for it
        collection = await self.repository.find_collection_by_id(collection_id, load_relations=False)
        if not collection:
            raise ResourceNotFoundError("Collection", collection_id)
        if collection.owner_id != user_id:
            raise ForbiddenError(
                error_code=4030,
                message=f"Collection {collection_id} is not owned by user {user_id}",
                details={"collection_id": collection_id, "user_id": user_id}
            )
        return collection

    async def _find_or_create_entity(
        self,
        request: Union[AddToWishlistRequest, AddToCollectionRequest],
        external_source_id: int = None
    ) -> tuple[Union[Album, Artist], bool]:
        """Find existing entity or create new one. Returns (entity, is_new_entity)."""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            if external_source_id is None:
                external_source_id = await self.repository.get_external_source_id(request.source)

            if request.entity_type == EntityTypeEnum.ALBUM:
                entity = await self.repository.find_album_by_external_id(external_id, external_source_id)
                is_new_entity = False
                if not entity:
                    is_new_entity = True
                    try:
                        entity = await self.repository.create_album(AlbumCreate(
                            external_album_id=external_id,
                            title=request.title,
                            image_url=request.image_url,
                            external_source_id=external_source_id
                        ))
                    except Exception as create_error:
                        logger.warning(f"Failed to create album, trying to find existing: {str(create_error)}")
                        entity = await self.repository.find_album_by_external_id(external_id, external_source_id)
                        if not entity:
                            logger.error(f"Failed to create album and could not find existing: {str(create_error)}")
                            raise create_error
                        is_new_entity = False
                return entity, is_new_entity
            else:
                entity = await self.repository.find_artist_by_external_id(external_id, external_source_id)
                is_new_entity = False
                if not entity:
                    is_new_entity = True
                    try:
                        entity = await self.repository.create_artist(ArtistCreate(
                            external_artist_id=external_id,
                            title=request.title,
                            image_url=request.image_url,
                            external_source_id=external_source_id
                        ))
                    except Exception as create_error:
                        logger.warning(f"Failed to create artist, trying to find existing: {str(create_error)}")
                        entity = await self.repository.find_artist_by_external_id(external_id, external_source_id)
                        if not entity:
                            logger.error(f"Failed to create artist and could not find existing: {str(create_error)}")
                            raise create_error
                        is_new_entity = False
                return entity, is_new_entity

        except (ValidationError, ServerError):
            raise
        except AppException:
            raise
        except (IntegrityError, SQLAlchemyError) as e:
            logger.error(f"Failed to find or create entity: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to find or create entity",
                details={}
            )

    async def add_to_wishlist(self, user_id: int, request: AddToWishlistRequest) -> AddToWishlistResponse:
        """Add an album or artist to the wishlist"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            existing = await self.repository.find_wishlist_item(user_id, external_id, request.entity_type)
            if existing:
                wishlist_response = self._build_wishlist_response(
                    existing, request.entity_type.value, request.source)
                return AddToWishlistResponse(
                    item=wishlist_response,
                    is_new=False,
                    message=f"Already have {request.entity_type.value} '{request.title}' in wishlist",
                    entity_type=request.entity_type.value
                )

            await self._find_or_create_entity(request)

            wishlist_data = {
                "user_id": user_id,
                "external_id": external_id,
                "entity_type_id": await self.repository.get_entity_type_id(request.entity_type),
                "external_source_id": await self.repository.get_external_source_id(request.source),
                "title": request.title,
                "image_url": request.image_url
            }

            async with transaction_context(self.repository.db):
                result = await self.repository.create_wishlist_item(wishlist_data)

            wishlist_response = self._build_wishlist_response(
                result, request.entity_type.value, request.source)

            return AddToWishlistResponse(
                item=wishlist_response,
                is_new=True,
                message=f"Added {request.entity_type.value} '{request.title}' to wishlist",
                entity_type=request.entity_type.value
            )

        except AppException:
            raise
        except (IntegrityError, SQLAlchemyError) as e:
            logger.error(f"Failed to add to wishlist: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={}
            )

    def _build_wishlist_response(self, wishlist_item: Wishlist, entity_type: str, source: str) -> WishlistItemResponse:
        """Build wishlist response with additional fields"""
        wishlist_dict = {
            "id": wishlist_item.id,
            "external_id": wishlist_item.external_id,
            "title": wishlist_item.title,
            "image_url": wishlist_item.image_url,
            "created_at": wishlist_item.created_at,
            "entity_type": entity_type.lower(),
            "source": source.lower()
        }
        return WishlistItemResponse.model_validate(wishlist_dict)

    async def remove_from_wishlist(self, user_id: int, wishlist_id: int) -> bool:
        """Remove an item from user's wishlist"""
        try:
            wishlist_item = await self.repository.wishlist_repo.get_by_id(wishlist_id)
            if not wishlist_item or wishlist_item.user_id != user_id:
                raise ResourceNotFoundError("Wishlist item", wishlist_id)

            async with transaction_context(self.repository.db):
                result = await self.repository.remove_wishlist_item(wishlist_item)

            return result
        except ResourceNotFoundError:
            raise
        except AppException:
            raise
        except (IntegrityError, SQLAlchemyError) as e:
            logger.error(f"Failed to remove from wishlist: {str(e)}", exc_info=True)
            logger.error(f"User ID: {user_id}, Wishlist ID: {wishlist_id}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove from wishlist",
                details={}
            )

    async def find_owned_pressings(
        self, user_id: int, external_id: str, master_id: Optional[str], source: str = "discogs"
    ) -> list[OwnedPressingResponse]:
        """What the user already owns of this release or its work, collection by collection"""
        external_source_id = await self.repository.get_external_source_id(source)
        rows = await self.repository.find_owned_pressings(user_id, external_source_id, external_id, master_id)
        return [
            OwnedPressingResponse(
                collection_id=collection_album.collection_id,
                collection_name=collection_name,
                album_id=album.id,
                external_album_id=album.external_album_id,
                title=album.title,
                same_release=album.external_album_id == external_id,
                pressing_confirmed=collection_album.pressing_confirmed,
                copies_count=copies_count,
                release_year=album.release_year,
                country=album.country,
                label=album.label,
                catno=album.catno,
                formats=album.formats or [],
            )
            for collection_album, album, collection_name, copies_count in rows
        ]

    async def replace_pressing(
        self, user_id: int, collection_id: int, album_id: int, request: ReplacePressingRequest
    ) -> CollectionAlbumResponse:
        """Swap an album of the collection for the release actually owned; copies and dates are kept"""
        await self._verify_collection_access(collection_id, user_id)
        external_source_id = await self.repository.get_external_source_id(request.source)
        async with transaction_context(self.repository.db):
            new_album, _ = await self._find_or_create_entity(request, external_source_id)
            album, collection_album = await self.repository.replace_album_in_collection(
                collection_id, album_id, new_album.id)
        return collection_mapper.album_to_collection_album_response(album, collection_album)

    async def add_to_collection(
        self, user_id: int, collection_id: int, request: AddToCollectionRequest
    ) -> AddToCollectionResponse:
        """Add an album or artist to a collection"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            collection = await self._verify_collection_access(collection_id, user_id)

            # Get the external source ID once (avoid duplicate queries)
            external_source_id = await self.repository.get_external_source_id(request.source)

            collection_item = None
            is_new = False
            copy_added = False

            async with transaction_context(self.repository.db):
                # Find or create entity within the same transaction as the association write.
                entity, is_new_entity = await self._find_or_create_entity(request, external_source_id)

                if request.entity_type == EntityTypeEnum.ALBUM:
                    album = entity

                    # State names: converted to ids in one place, CollectionAlbumRepository.apply_copy_data
                    album_data = request.album_data.model_dump(exclude_none=True) if request.album_data else None

                    collection_item, is_new = await self.repository.add_album_to_collection(
                        collection, album, album_data, is_new_entity,
                        pressing_confirmed=request.pressing_confirmed, add_copy=request.add_copy,
                    )
                    copy_added = request.add_copy and not is_new
                else:
                    artist = entity

                    existing_artist = await self.repository.find_artist_in_collection(collection.id, artist.id)
                    # still called even if existing, to update CollectionArtist.updated_at
                    collection_item = await self.repository.add_artist_to_collection(
                        collection, artist, is_new_entity
                    )
                    is_new = existing_artist is None

            if request.entity_type == EntityTypeEnum.ALBUM:
                # CollectionAlbum has a composite primary key — collection_id used as surrogate id
                item_response = CollectionItemResponse(
                    id=collection_item.collection_id,
                    external_id=external_id,
                    entity_type=request.entity_type.value,
                    title=request.title,
                    image_url=request.image_url,
                    source=request.source,
                    created_at=collection.created_at
                )
            else:
                # add_artist_to_collection returns a dict; created_at may be None for old records
                created_at = collection_item.get("created_at")
                if created_at is None:
                    from datetime import datetime, timezone
                    created_at = datetime.now(timezone.utc)

                item_response = CollectionItemResponse(
                    id=collection_item["id"],
                    external_id=external_id,
                    entity_type=request.entity_type.value,
                    title=request.title,
                    image_url=request.image_url,
                    source=request.source,
                    created_at=created_at
                )

            verb = 'Added' if is_new else 'Already have'
            message = f"{verb} {request.entity_type.value} '{request.title}' in collection '{collection.name}'"
            if copy_added:
                is_new = True
                message = f"Added another copy of '{request.title}' in collection '{collection.name}'"

            final_response = AddToCollectionResponse(
                item=item_response,
                is_new=is_new,
                message=message,
                entity_type=request.entity_type.value,
                collection_name=collection.name
            )

            return final_response

        except AppException:
            raise
        except Exception as e:
            # Intentional broad catch: any unhandled error becomes a generic ServerError
            logger.error(f"Failed to add to collection: {str(e)}", exc_info=True)
            logger.error(
                f"User ID: {user_id}, Collection ID: {collection_id}, "
                f"entity_type: {request.entity_type}, "
                f"external_id: {request.external_id}"
            )
            raise ServerError(
                error_code=5000,
                message="Failed to add to collection",
                details={}
            )

    async def move_wishlist_item_to_collection(
        self, user_id: int, wishlist_id: int, collection_id: int, pressing_confirmed: bool = True
    ) -> MoveToCollectionResponse:
        """
        The user got a wanted record (or wants an artist in a collection): into one of their
        collections, then out of the wishlist, in one transaction.
        A record goes with its pressing confirmed, unless the user is not sure it is the one they got:
        then it is to confirm, or to replace, in the collection. Already in that collection, it gets
        one more copy. An artist already there is not added twice.
        """
        item = await self.repository.wishlist_repo.get_by_id(wishlist_id)
        if item is None or item.user_id != user_id:
            raise ResourceNotFoundError("Wishlist item", wishlist_id)
        entity_type = item.entity_type.name if item.entity_type else None
        if entity_type not in (EntityTypeEnum.ALBUM.value, EntityTypeEnum.ARTIST.value):
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="This wishlist item cannot be moved to a collection",
                details={"wishlist_id": wishlist_id},
            )
        collection = await self._verify_collection_access(collection_id, user_id)
        is_album = entity_type == EntityTypeEnum.ALBUM.value

        async with transaction_context(self.repository.db):
            if is_album:
                album = await self.repository.find_album_by_external_id(item.external_id, item.external_source_id)
                if album is None:
                    album = await self.repository.create_album(AlbumCreate(
                        external_album_id=item.external_id, title=item.title or "",
                        image_url=item.image_url or "", external_source_id=item.external_source_id,
                    ))
                _collection_album, is_new = await self.repository.add_album_to_collection(
                    collection, album, None, is_new_entity=False, pressing_confirmed=pressing_confirmed,
                    add_copy=True,
                )
            else:
                artist = await self.repository.find_artist_by_external_id(item.external_id, item.external_source_id)
                is_new_entity = artist is None
                if artist is None:
                    artist = await self.repository.create_artist(ArtistCreate(
                        external_artist_id=item.external_id, title=item.title or "",
                        image_url=item.image_url or "", external_source_id=item.external_source_id,
                    ))
                is_new = await self.repository.find_artist_in_collection(collection.id, artist.id) is None
                if is_new:
                    await self.repository.add_artist_to_collection(collection, artist, is_new_entity)
            await self.repository.remove_wishlist_item(item)

        title = item.title or ("This record" if is_album else "This artist")
        if is_new:
            message = f"“{title}” moved to “{collection.name}”"
        elif is_album:
            message = f"“{title}” was in “{collection.name}” already: one more copy added"
        else:
            message = f"“{title}” was in “{collection.name}” already"
        return MoveToCollectionResponse(
            message=message,
            collection_id=collection.id,
            collection_name=collection.name,
            external_id=item.external_id,
            entity_type=entity_type,
            already_in_collection=not is_new,
        )

    async def remove_from_collection(
        self, user_id: int, collection_id: int, external_id: str, entity_type: EntityTypeEnum
    ) -> bool:
        """Remove an album or artist from a collection"""
        try:
            collection = await self._verify_collection_access(collection_id, user_id)

            # find by external_id directly to avoid external_source_id resolution issues
            async with transaction_context(self.repository.db):
                if entity_type == EntityTypeEnum.ALBUM:
                    collection_album = await self.repository.find_collection_album_by_external_id(
                        collection_id, external_id
                    )

                    if not collection_album:
                        raise ResourceNotFoundError("Album", external_id)

                    await self.repository.remove_album_from_collection(collection, collection_album.album)
                else:
                    artist = await self.repository.find_collection_artist_by_external_id(collection_id, external_id)

                    if not artist:
                        raise ResourceNotFoundError("Artist", external_id)

                    await self.repository.remove_artist_from_collection(collection, artist)

            return True

        except ResourceNotFoundError:
            raise
        except AppException:
            raise
        except (IntegrityError, SQLAlchemyError) as e:
            logger.error(f"Failed to remove from collection: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to remove from collection",
                details={}
            )


from typing import List, Union
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    AddToCollectionRequest,
    WishlistItemResponse,
    CollectionItemResponse,
    AddToWishlistResponse,
    AddToCollectionResponse
)
from app.schemas.album_schema import AlbumCreate
from app.schemas.artist_schema import ArtistCreate
from app.core.exceptions import (
    AppException,
    ValidationError,
    ResourceNotFoundError,
    ServerError,
    ForbiddenError
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
        collection = await self.repository.find_collection_by_id(collection_id, load_relations=True)
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
        except Exception as e:
            logger.error(f"Failed to find or create entity: {str(e)}")
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
            is_new = False
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
        except Exception as e:
            logger.error(f"Failed to add to wishlist: {str(e)}")
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
        except Exception as e:
            logger.error(f"Failed to remove from wishlist: {str(e)}")
            logger.error(f"User ID: {user_id}, Wishlist ID: {wishlist_id}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove from wishlist",
                details={}
            )

    async def add_to_collection(self, user_id: int, collection_id: int, request: AddToCollectionRequest) -> AddToCollectionResponse:
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

            # Find or create entity (pass external_source_id to avoid duplicate query)
            entity, is_new_entity = await self._find_or_create_entity(request, external_source_id)

            collection_item = None
            if request.entity_type == EntityTypeEnum.ALBUM:
                album = entity

                processed_album_data = None
                if request.album_data:
                    album_data_dict = request.album_data.model_dump(
                        exclude_none=True)
                    processed_album_data = album_data_dict.copy()

                    state_record = processed_album_data.pop(
                        'state_record', None)
                    if state_record:
                        state_record_str = state_record.value if hasattr(
                            state_record, 'value') else str(state_record)
                        processed_album_data['state_record_id'] = await self.repository.get_vinyl_state_id(state_record_str)

                    state_cover = processed_album_data.pop(
                        'state_cover', None)
                    if state_cover:
                        state_cover_str = state_cover.value if hasattr(
                            state_cover, 'value') else str(state_cover)
                        processed_album_data['state_cover_id'] = await self.repository.get_vinyl_state_id(state_cover_str)

                collection_item, is_new_album = await self.repository.add_album_to_collection(collection, album, processed_album_data, is_new_entity)
            else:
                artist = entity

                is_new_artist = False
                existing_artist = await self.repository.find_artist_in_collection(collection.id, artist.id)

                if existing_artist:
                    # still called to update CollectionArtist.updated_at
                    collection_item = await self.repository.add_artist_to_collection(collection, artist, is_new_entity)
                    is_new_artist = False
                else:
                    is_new_artist = True
                    collection_item = await self.repository.add_artist_to_collection(collection, artist, is_new_entity)

            is_new = is_new_album if request.entity_type == EntityTypeEnum.ALBUM else is_new_artist

            if request.entity_type == EntityTypeEnum.ALBUM:
                # CollectionAlbum has a composite primary key — collection_id used as surrogate id
                item_response = CollectionItemResponse(
                    id=collection_item.collection_id,  # CollectionAlbum has a composite primary key — collection_id used as surrogate id
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

            message = f"{'Added' if is_new else 'Already have'} {request.entity_type.value} '{request.title}' in collection '{collection.name}'"

            final_response = AddToCollectionResponse(
                item=item_response,
                is_new=is_new,
                message=message,
                entity_type=request.entity_type.value,
                collection_name=collection.name
            )

            async with transaction_context(self.repository.db):
                pass

            return final_response

        except AppException:
            raise
        except Exception as e:
            logger.error(f"Failed to add to collection: {str(e)}")
            logger.error(f"User ID: {user_id}, Collection ID: {collection_id}")
            logger.error(f"Request data: {request.model_dump()}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to collection",
                details={}
            )

    async def remove_from_collection(self, user_id: int, collection_id: int, external_id: str, entity_type: EntityTypeEnum) -> bool:
        """Remove an album or artist from a collection"""
        try:
            collection = await self._verify_collection_access(collection_id, user_id)

            # find by external_id directly to avoid external_source_id resolution issues
            if entity_type == EntityTypeEnum.ALBUM:
                collection_album = await self.repository.find_collection_album_by_external_id(collection_id, external_id)

                if not collection_album:
                    raise ResourceNotFoundError("Album", external_id)

                await self.repository.remove_album_from_collection(collection, collection_album.album)
            else:
                artist = await self.repository.find_collection_artist_by_external_id(collection_id, external_id)

                if not artist:
                    raise ResourceNotFoundError("Artist", external_id)

                await self.repository.remove_artist_from_collection(collection, artist)

            async with transaction_context(self.repository.db):
                pass

            return True

        except ResourceNotFoundError:
            raise
        except AppException:
            raise
        except Exception as e:
            logger.error(f"Failed to remove from collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove from collection",
                details={}
            )

    async def get_collection_items(self, user_id: int) -> List[CollectionItemResponse]:
        """Get user's collection items"""
        try:
            # This method should be implemented based on your collection structure
            # For now, returning empty list as placeholder
            return []
        except AppException:
            raise
        except Exception as e:
            logger.error(f"Failed to get collection items: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection items",
                details={}
            )

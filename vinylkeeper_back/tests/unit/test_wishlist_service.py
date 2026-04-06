import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.wishlist_service import WishlistService
from app.schemas.external_reference_schema import AddToWishlistRequest
from app.core.enums import EntityTypeEnum
from app.core.exceptions import ResourceNotFoundError, ValidationError, ServerError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_db():
    db = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


def make_service():
    wishlist_repo = AsyncMock()
    wishlist_repo.db = make_db()
    external_ref_repo = AsyncMock()
    return WishlistService(wishlist_repo, external_ref_repo), wishlist_repo, external_ref_repo


def make_request(entity_type=EntityTypeEnum.ALBUM, external_id="ext-123") -> AddToWishlistRequest:
    return AddToWishlistRequest.model_construct(
        external_id=external_id,
        entity_type=entity_type,
        title="Blue Album",
        image_url="http://img.test/cover.jpg",
        source="discogs",
    )


def make_wishlist_item(item_id=1, user_id=1, entity_type_id=1):
    item = MagicMock()
    item.id = item_id
    item.user_id = user_id
    item.external_id = "ext-123"
    item.entity_type_id = entity_type_id
    item.external_source_id = 1
    item.title = "Blue Album"
    item.image_url = "http://img.test/cover.jpg"
    item.created_at = datetime.now(timezone.utc)
    return item


# ---------------------------------------------------------------------------
# add_to_wishlist
# ---------------------------------------------------------------------------

class TestAddToWishlist:
    async def test_already_in_wishlist_returns_is_new_false(self):
        service, wishlist_repo, _ = make_service()
        existing = make_wishlist_item()
        wishlist_repo.find_by_user_and_external_id = AsyncMock(return_value=existing)

        result = await service.add_to_wishlist(user_id=1, request=make_request())

        assert result.is_new is False
        assert result.entity_type == EntityTypeEnum.ALBUM.value

    async def test_already_in_wishlist_does_not_call_repo_add(self):
        service, wishlist_repo, _ = make_service()
        wishlist_repo.find_by_user_and_external_id = AsyncMock(return_value=make_wishlist_item())

        await service.add_to_wishlist(user_id=1, request=make_request())

        wishlist_repo.add_to_wishlist.assert_not_awaited()

    async def test_new_item_returns_is_new_true(self):
        service, wishlist_repo, external_ref_repo = make_service()
        wishlist_repo.find_by_user_and_external_id = AsyncMock(return_value=None)
        external_ref_repo.get_external_source_id = AsyncMock(return_value=1)
        external_ref_repo.get_entity_type_id = AsyncMock(return_value=1)
        new_item = make_wishlist_item()
        wishlist_repo.add_to_wishlist = AsyncMock(return_value=new_item)

        with patch.object(service, "_find_or_create_entity", new_callable=AsyncMock, return_value=MagicMock()):
            result = await service.add_to_wishlist(user_id=1, request=make_request())

        assert result.is_new is True

    async def test_new_item_calls_repo_add(self):
        service, wishlist_repo, external_ref_repo = make_service()
        wishlist_repo.find_by_user_and_external_id = AsyncMock(return_value=None)
        external_ref_repo.get_external_source_id = AsyncMock(return_value=1)
        external_ref_repo.get_entity_type_id = AsyncMock(return_value=1)
        new_item = make_wishlist_item()
        wishlist_repo.add_to_wishlist = AsyncMock(return_value=new_item)

        with patch.object(service, "_find_or_create_entity", new_callable=AsyncMock, return_value=MagicMock()):
            await service.add_to_wishlist(user_id=1, request=make_request())

        wishlist_repo.add_to_wishlist.assert_awaited_once()

    async def test_repo_failure_raises_server_error(self):
        service, wishlist_repo, external_ref_repo = make_service()
        wishlist_repo.find_by_user_and_external_id = AsyncMock(return_value=None)
        external_ref_repo.get_external_source_id = AsyncMock(side_effect=RuntimeError("DB down"))

        with pytest.raises(ServerError):
            await service.add_to_wishlist(user_id=1, request=make_request())


# ---------------------------------------------------------------------------
# remove_from_wishlist
# ---------------------------------------------------------------------------

class TestRemoveFromWishlist:
    async def test_not_found_raises_resource_not_found(self):
        service, wishlist_repo, _ = make_service()
        wishlist_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service.remove_from_wishlist(user_id=1, wishlist_id=99)

    async def test_wrong_owner_raises_resource_not_found(self):
        service, wishlist_repo, _ = make_service()
        item = make_wishlist_item(user_id=2)
        wishlist_repo.get_by_id = AsyncMock(return_value=item)

        with pytest.raises(ResourceNotFoundError):
            await service.remove_from_wishlist(user_id=1, wishlist_id=1)

    async def test_success_returns_true(self):
        service, wishlist_repo, _ = make_service()
        item = make_wishlist_item(user_id=1)
        wishlist_repo.get_by_id = AsyncMock(return_value=item)
        wishlist_repo._delete_entity = AsyncMock()

        result = await service.remove_from_wishlist(user_id=1, wishlist_id=1)

        assert result is True
        wishlist_repo._delete_entity.assert_awaited_once_with(item)

    async def test_resource_not_found_is_not_wrapped_in_server_error(self):
        service, wishlist_repo, _ = make_service()
        wishlist_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):  # not ServerError
            await service.remove_from_wishlist(user_id=1, wishlist_id=99)


# ---------------------------------------------------------------------------
# _validate_pagination_params
# ---------------------------------------------------------------------------

class TestValidatePaginationParams:
    def test_page_zero_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Page number"):
            service._validate_pagination_params(page=0, limit=10)

    def test_page_negative_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Page number"):
            service._validate_pagination_params(page=-1, limit=10)

    def test_limit_zero_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Limit"):
            service._validate_pagination_params(page=1, limit=0)

    def test_limit_above_50_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Limit"):
            service._validate_pagination_params(page=1, limit=51)

    def test_valid_params_do_not_raise(self):
        service, *_ = make_service()
        service._validate_pagination_params(page=1, limit=50)  # no exception

    def test_limit_boundary_50_is_valid(self):
        service, *_ = make_service()
        service._validate_pagination_params(page=1, limit=50)  # no exception

    def test_limit_boundary_1_is_valid(self):
        service, *_ = make_service()
        service._validate_pagination_params(page=1, limit=1)  # no exception


# ---------------------------------------------------------------------------
# get_user_wishlist_paginated
# ---------------------------------------------------------------------------

class TestGetUserWishlistPaginated:
    async def test_invalid_page_raises_validation_error(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError):
            await service.get_user_wishlist_paginated(user_id=1, page=0, limit=10)

    async def test_invalid_limit_raises_validation_error(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError):
            await service.get_user_wishlist_paginated(user_id=1, page=1, limit=100)

    async def test_entity_type_id_1_maps_to_album(self):
        service, wishlist_repo, _ = make_service()
        item = make_wishlist_item(entity_type_id=1)
        wishlist_repo.get_user_wishlist_paginated = AsyncMock(return_value=([item], 1))

        result = await service.get_user_wishlist_paginated(user_id=1, page=1, limit=10)

        assert result.items[0].entity_type == "album"

    async def test_entity_type_id_2_maps_to_artist(self):
        service, wishlist_repo, _ = make_service()
        item = make_wishlist_item(entity_type_id=2)
        wishlist_repo.get_user_wishlist_paginated = AsyncMock(return_value=([item], 1))

        result = await service.get_user_wishlist_paginated(user_id=1, page=1, limit=10)

        assert result.items[0].entity_type == "artist"

    async def test_unknown_entity_type_id_maps_to_unknown(self):
        service, wishlist_repo, _ = make_service()
        item = make_wishlist_item(entity_type_id=99)
        wishlist_repo.get_user_wishlist_paginated = AsyncMock(return_value=([item], 1))

        result = await service.get_user_wishlist_paginated(user_id=1, page=1, limit=10)

        assert result.items[0].entity_type == "unknown"

    async def test_total_pages_calculation(self):
        service, wishlist_repo, _ = make_service()
        items = [make_wishlist_item(item_id=i) for i in range(1, 4)]
        wishlist_repo.get_user_wishlist_paginated = AsyncMock(return_value=(items, 25))

        result = await service.get_user_wishlist_paginated(user_id=1, page=1, limit=10)

        assert result.total == 25
        assert result.total_pages == 3  # ceil(25/10)

    async def test_empty_list_returns_zero_total_pages(self):
        service, wishlist_repo, _ = make_service()
        wishlist_repo.get_user_wishlist_paginated = AsyncMock(return_value=([], 0))

        result = await service.get_user_wishlist_paginated(user_id=1, page=1, limit=10)

        assert result.total_pages == 0


# ---------------------------------------------------------------------------
# get_wishlist_item_detail
# ---------------------------------------------------------------------------

class TestGetWishlistItemDetail:
    async def test_not_found_raises_resource_not_found(self):
        service, wishlist_repo, _ = make_service()
        wishlist_repo.get_by_id_with_relations = AsyncMock(return_value=None)

        with pytest.raises(ResourceNotFoundError):
            await service.get_wishlist_item_detail(wishlist_id=99)

    async def test_found_returns_response(self):
        service, wishlist_repo, _ = make_service()
        item = make_wishlist_item()
        item.entity_type = MagicMock()
        item.entity_type.name = "ALBUM"
        item.external_source = MagicMock()
        item.external_source.name = "discogs"
        wishlist_repo.get_by_id_with_relations = AsyncMock(return_value=item)

        result = await service.get_wishlist_item_detail(wishlist_id=1)

        assert result.entity_type == "album"
        assert result.source == "discogs"

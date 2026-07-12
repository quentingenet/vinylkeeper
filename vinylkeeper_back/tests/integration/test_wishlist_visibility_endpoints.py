"""
Full-stack (real DB) integration tests for wishlist item visibility.

Regression test for GET /wishlist/{wishlist_id}: it used to have zero
visibility check (any authenticated user could view any wishlist item by
guessing/enumerating sequential IDs), unlike GET /wishlist (list) which
already correctly enforced "public if owner has a public collection,
private otherwise". Both endpoints must now follow the same rule.

Uses a real HTTP client bound to the real_session fixture (get_db override),
so the actual endpoint wiring (dependency injection, exception -> status
code mapping) is exercised, not just the service layer. Same SAVEPOINT
rollback safety model as the rest of tests/integration/.
"""
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import get_db
from app.utils.auth_utils.auth import get_current_user, create_token, TokenType

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_real_db_relationships import make_test_collection
from tests.integration.test_wishlist_integration import make_wishlist_service, fresh_numeric_external_id

from app.schemas.external_reference_schema import AddToWishlistRequest
from app.core.enums import EntityTypeEnum


async def make_http_client(real_session, current_user):
    async def override_get_db():
        yield real_session

    async def override_current_user():
        return current_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_current_user

    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    token = create_token(str(current_user.user_uuid), TokenType.ACCESS)
    client.cookies.set("access_token", token)
    return client


class TestWishlistItemDetailVisibility:
    async def test_owner_can_view_own_item(self, real_session):
        owner = await make_test_user(real_session)
        wishlist_service = make_wishlist_service(real_session)
        added = await wishlist_service.add_to_wishlist(
            user_id=owner.id,
            request=AddToWishlistRequest(
                external_id=fresh_numeric_external_id(),
                entity_type=EntityTypeEnum.ALBUM,
                title="Owner's item",
                image_url="https://example.com/cover.jpg",
                source="discogs",
            ),
        )

        client = await make_http_client(real_session, owner)
        try:
            response = await client.get(f"/api/external-references/wishlist/{added.item.id}")
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

        assert response.status_code == 200
        assert response.json()["title"] == "Owner's item"

    async def test_stranger_forbidden_when_owner_has_no_public_collection(self, real_session):
        owner = await make_test_user(real_session)
        stranger = await make_test_user(real_session)
        # Owner has no collections at all -> has_public_collections is False
        wishlist_service = make_wishlist_service(real_session)
        added = await wishlist_service.add_to_wishlist(
            user_id=owner.id,
            request=AddToWishlistRequest(
                external_id=fresh_numeric_external_id(),
                entity_type=EntityTypeEnum.ALBUM,
                title="Private item",
                image_url="https://example.com/cover.jpg",
                source="discogs",
            ),
        )

        client = await make_http_client(real_session, stranger)
        try:
            response = await client.get(f"/api/external-references/wishlist/{added.item.id}")
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

        assert response.status_code == 403

    async def test_stranger_allowed_when_owner_has_public_collection(self, real_session):
        owner = await make_test_user(real_session)
        stranger = await make_test_user(real_session)
        await make_test_collection(real_session, owner_id=owner.id)  # is_public=True by default

        wishlist_service = make_wishlist_service(real_session)
        added = await wishlist_service.add_to_wishlist(
            user_id=owner.id,
            request=AddToWishlistRequest(
                external_id=fresh_numeric_external_id(),
                entity_type=EntityTypeEnum.ALBUM,
                title="Public item",
                image_url="https://example.com/cover.jpg",
                source="discogs",
            ),
        )

        client = await make_http_client(real_session, stranger)
        try:
            response = await client.get(f"/api/external-references/wishlist/{added.item.id}")
        finally:
            await client.aclose()
            app.dependency_overrides.clear()

        assert response.status_code == 200
        assert response.json()["title"] == "Public item"

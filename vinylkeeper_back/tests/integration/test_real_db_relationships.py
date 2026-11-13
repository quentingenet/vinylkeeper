"""
Real-database integration tests (Phase B of the lazy-loading migration).

Every other test in this suite mocks repositories/models via MagicMock/AsyncMock,
which never exercises actual SQLAlchemy relationship loading — a MagicMock answers
True to hasattr() for anything and never raises sqlalchemy.exc.InvalidRequestError
or MissingGreenlet. These tests use a real AsyncSession against a live Postgres
database (a copy of production data) to actually verify the lazy="raise" relations
introduced in Phase C load correctly.

Safety: this database contains real copied production data. Every test runs inside
an outer transaction + SAVEPOINT (join_transaction_mode="create_savepoint") that is
rolled back at the end of the test, so nothing is ever permanently written — even
though the application code under test calls session.commit() internally via
transaction_context(), that only releases the SAVEPOINT, not the outer transaction.
"""
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection_model import Collection
from app.models.album_model import Album

from app.repositories.collection_repository import CollectionRepository
from app.repositories.like_repository import LikeRepository
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository

from app.services.collection_service import CollectionService
from app.services.external_reference_service import ExternalReferenceService
# Shared with the other real-database test modules, which import it from here
from tests.integration.conftest import make_real_test_user as make_test_user  # noqa: F401


def make_collection_service(session: AsyncSession) -> CollectionService:
    return CollectionService(
        repository=CollectionRepository(session),
        like_repository=LikeRepository(session),
        collection_album_repository=CollectionAlbumRepository(session),
        wishlist_repository=WishlistRepository(session),
    )


async def put_album_in_collection(session: AsyncSession, collection_id: int, album_id: int, **states):
    """An album in a collection, through the add path of the app (CollectionAlbumRepository.add_or_update)."""
    collection_album, _ = await CollectionAlbumRepository(session).add_or_update(collection_id, album_id, states)
    return collection_album


def make_external_reference_service(session: AsyncSession) -> ExternalReferenceService:
    repo = ExternalReferenceRepository(
        db=session,
        wishlist_repo=WishlistRepository(session),
        collection_repo=CollectionRepository(session),
        album_repo=AlbumRepository(session),
        artist_repo=ArtistRepository(session),
    )
    return ExternalReferenceService(repo)


async def make_test_collection(session: AsyncSession, owner_id: int) -> Collection:
    collection = Collection(
        name=f"itest collection {uuid.uuid4().hex[:8]}",
        description=None,
        is_public=True,
        owner_id=owner_id,
        mood_id=None,
    )
    session.add(collection)
    await session.flush()
    return collection


async def pick_existing_album_id(session: AsyncSession) -> int:
    return (await session.execute(select(Album.id).limit(1))).scalar_one()



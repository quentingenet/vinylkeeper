import time
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.spinning_now_repository import SpinningNowRepository
from app.repositories.album_price_repository import AlbumPriceRepository
from app.models.user_model import User
from app.schemas.dashboard_schema import (
    BreakdownEntry,
    CollectionBreakdownResponse,
    CollectionValueResponse,
    DashboardStatsResponse,
    EraEntry,
    LatestAddition,
    PressingsBreakdown,
    StatsCollection,
    ValueAmounts,
    ValueRefreshResponse,
)
from app.services.album_price_service import REQUEST_MIN_INTERVAL_SECONDS
from app.core.exceptions import AppException, QuotaExceededError, ResourceNotFoundError, ServerError
from app.core.logging import logger

_CACHE_TTL = 30.0
# A user re-evaluates their collections once a day at most: each one spends the Discogs quota
VALUE_REFRESHES_PER_DAY = 1
VALUE_REFRESH_WINDOW = timedelta(hours=24)
_cache: dict[int, tuple[Any, float]] = {}


class DashboardService:
    def __init__(self, dashboard_repository: DashboardRepository,
                 spinning_now_repository: Optional[SpinningNowRepository] = None,
                 price_repository: Optional[AlbumPriceRepository] = None):
        self.dashboard_repository = dashboard_repository
        # Eras, genres and moods are counted like Spinning now, where they lead
        self.spinning_now_repository = spinning_now_repository or SpinningNowRepository(dashboard_repository.db)
        self.price_repository = price_repository or AlbumPriceRepository(dashboard_repository.db)

    async def get_value(
        self, user: User, collection_id: Optional[int] = None, all_collections: bool = False
    ) -> CollectionValueResponse:
        """
        Low, average and high value of one collection (the largest by default) or of all of them,
        in EUR and in USD: prices are stored in EUR and converted at the last ECB rate.
        """
        collections, chosen = await self._value_scope(user, collection_id, all_collections)
        scope = [chosen] if chosen else []
        value = await self.dashboard_repository.collection_value(user.id, scope)
        # A re-evaluation covers every collection, whatever the one shown
        everything = value if not scope else await self.dashboard_repository.collection_value(user.id)
        refreshable = await self.dashboard_repository.refreshable_album_ids(user.id)
        refreshes_left, next_refresh_at = await self._refresh_allowance(user)
        amounts = [ValueAmounts(currency="EUR", low=round(float(value.low), 2),
                                average=round(float(value.average), 2), high=round(float(value.high), 2))]
        usd = await self.price_repository.get_rate("USD")
        # No rate yet (first night not run): EUR only rather than a made-up conversion
        if usd is not None:
            rate = float(usd.rate)
            amounts.append(ValueAmounts(currency="USD", low=round(float(value.low) * rate, 2),
                                        average=round(float(value.average) * rate, 2),
                                        high=round(float(value.high) * rate, 2)))
        return CollectionValueResponse(
            collection_id=chosen,
            collections=collections,
            currency=user.preferred_currency if usd is not None else "EUR",
            amounts=amounts,
            usd_rate=float(usd.rate) if usd is not None else None,
            rate_date=usd.rate_date if usd is not None else None,
            records_total=value.records,
            records_priced=value.priced,
            pressings_to_confirm=value.unconfirmed,
            estimated_at=value.updated_at,
            refresh_pending=everything.pending,
            refreshable=len(refreshable),
            refreshes_left=refreshes_left,
            next_refresh_at=next_refresh_at,
        )

    async def _refresh_allowance(self, user: User) -> tuple[int, Optional[datetime]]:
        """Re-evaluations left in the window, and when the next one is allowed if none is left."""
        recent = await self.price_repository.recent_refreshes(user.id, VALUE_REFRESH_WINDOW)
        left = max(VALUE_REFRESHES_PER_DAY - len(recent), 0)
        # The oldest use counted leaves the window first
        return left, None if left else recent[-VALUE_REFRESHES_PER_DAY] + VALUE_REFRESH_WINDOW

    async def _value_scope(
        self, user: User, collection_id: Optional[int], all_collections: bool
    ) -> tuple[list[StatsCollection], Optional[int]]:
        """The collections to pick from, and the one valued: the largest unless one or all are asked."""
        rows = await self.dashboard_repository.stats_collections(user.id)
        collections = [StatsCollection(id=row[0], name=row[1]) for row in rows]
        if all_collections or not rows:
            return collections, None
        if collection_id is None:
            # The largest collection, the first by name on a tie
            return collections, min(rows, key=lambda row: (-row[2], row[1]))[0]
        if collection_id in {c.id for c in collections}:
            return collections, collection_id
        raise ResourceNotFoundError("Collection", collection_id)

    async def request_value_refresh(self, user: User) -> ValueRefreshResponse:
        """
        Queue every pressing of the user whose price is missing or older than a day, whatever the
        collection shown, once a day at most: the button cannot drain the Discogs quota shared with
        the live search.
        """
        refreshes_left, next_refresh_at = await self._refresh_allowance(user)
        if not refreshes_left:
            raise QuotaExceededError(
                "One re-evaluation a day: the next one is possible later",
                details={"next_refresh_at": next_refresh_at.isoformat() if next_refresh_at else None},
            )
        album_ids = await self.dashboard_repository.refreshable_album_ids(user.id)
        requested = await self.price_repository.request_refresh(album_ids)
        # Prices already fresh: nothing was asked, the allowance is not spent
        if requested:
            await self.price_repository.record_refresh(user.id)
        await self.dashboard_repository.db.commit()
        pending = (await self.dashboard_repository.collection_value(user.id)).pending
        return ValueRefreshResponse(
            requested=requested, pending=pending,
            estimated_seconds=round(pending * REQUEST_MIN_INTERVAL_SECONDS),
        )

    async def get_breakdown(self, user: User, collection_id: Optional[int] = None) -> CollectionBreakdownResponse:
        """The records of the user, or of one of their collections, by era, genre, mood and pressing."""
        collections = [StatsCollection(id=row[0], name=row[1])
                       for row in await self.dashboard_repository.stats_collections(user.id)]
        if collection_id is not None and collection_id not in {c.id for c in collections}:
            # Someone else's collection, a saved copy or an empty one: nothing to tell about it
            raise ResourceNotFoundError("Collection", collection_id)
        scope = [collection_id] if collection_id is not None else []
        spinning, dashboard = self.spinning_now_repository, self.dashboard_repository
        counts = await dashboard.pressing_counts(user.id, scope)
        return CollectionBreakdownResponse(
            collection_id=collection_id,
            collections=collections,
            albums_total=await spinning.count_albums(user.id, scope),
            eras=[EraEntry(decade=decade, count=count) for decade, count in await spinning.era_options(user.id, scope)],
            genres=[BreakdownEntry(label=name, count=count)
                    for name, count in await spinning.genre_options(user.id, scope)],
            moods=[BreakdownEntry(label=name, count=count)
                   for name, _description, count in await spinning.mood_options(user.id, scope)],
            pressings=PressingsBreakdown(
                originals=counts.originals,
                reissues=counts.reissues,
                unknown=counts.total - counts.originals - counts.reissues,
                countries=[BreakdownEntry(label=label, count=count)
                           for label, count in await dashboard.pressing_countries(user.id, scope)],
                formats=[BreakdownEntry(label=label, count=count)
                         for label, count in await dashboard.pressing_formats(user.id, scope)],
            ),
        )

    async def get_dashboard_stats(self, user: User) -> DashboardStatsResponse:
        cached = _cache.get(user.id)
        if cached and time.monotonic() < cached[1]:
            return cached[0]

        try:
            user_stats = await self.dashboard_repository.get_user_stats_batch(user.id)
            user_albums_total = user_stats['albums_total']
            user_artists_total = user_stats['artists_total']
            user_collections_total = user_stats['collections_total']
            user_public_collections_total = user_stats['public_collections_total']

            global_counts = await self.dashboard_repository.get_global_collections_counts()
            global_albums_total = global_counts['albums_total']
            global_artists_total = global_counts['artists_total']

            latest_album_result = await self.dashboard_repository.get_latest_album()
            latest_artist_result = await self.dashboard_repository.get_latest_artist()

            places_counts = await self.dashboard_repository.get_places_counts_batch()
            moderated_places_total = places_counts['moderated_total']
            global_places_total = places_counts['global_total']

            public_collections_total = await self.dashboard_repository.get_public_collections_count()

            latest_album = None
            latest_album_id = None
            if latest_album_result:
                album, username, updated_at = latest_album_result
                latest_album_id = album.id
                display_username = "You" if username == user.username else username
                latest_album = LatestAddition(
                    id=album.id,
                    name=album.title,
                    username=display_username,
                    created_at=updated_at,
                    type="album",
                    image_url=album.image_url,
                    external_id=album.external_album_id,
                )

            latest_artist = None
            if latest_artist_result:
                artist, username, updated_at = latest_artist_result
                display_username = "You" if username == user.username else username
                latest_artist = LatestAddition(
                    id=artist.id,
                    name=artist.title,
                    username=display_username,
                    created_at=updated_at,
                    type="artist",
                    image_url=artist.image_url,
                    external_id=artist.external_artist_id
                )

            # Album ids only: the latest artist used to be added here too, hiding the album with its id
            exclude_ids = [latest_album_id] if latest_album_id else []

            recent_albums_result = await self.dashboard_repository.get_recent_albums(
                limit=12,
                exclude_ids=exclude_ids if exclude_ids else None
            )

            recent_albums = []
            if recent_albums_result:
                for album, username, updated_at in recent_albums_result:
                    recent_albums.append(LatestAddition(
                        id=album.id,
                        name=album.title,
                        username=username,
                        created_at=updated_at,
                        type="album",
                        image_url=album.image_url,
                        external_id=album.external_album_id,
                    ))

            result = DashboardStatsResponse(
                user_albums_total=user_albums_total,
                user_artists_total=user_artists_total,
                user_collections_total=user_collections_total,
                user_public_collections_total=user_public_collections_total,
                global_albums_total=global_albums_total,
                global_artists_total=global_artists_total,
                global_places_total=global_places_total,
                moderated_places_total=moderated_places_total,
                public_collections_total=public_collections_total,
                latest_album=latest_album,
                latest_artist=latest_artist,
                recent_albums=recent_albums
            )
            _cache[user.id] = (result, time.monotonic() + _CACHE_TTL)
            return result
        except AppException:
            raise
        except (IntegrityError, SQLAlchemyError) as e:
            logger.error(f"Dashboard error: {e}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get dashboard stats",
                details={}
            )

"""
Public collection reports on a real PostgreSQL (SAVEPOINT, nothing kept). send_mail is patched (SMTP).
"""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import BackgroundTasks
from sqlalchemy import select, text, update

from app.core.exceptions import QuotaExceededError, ResourceNotFoundError, ValidationError
from app.mails.client_mail import MailSubject
from app.models.collection_report_model import CollectionReport
from app.repositories.collection_report_repository import CollectionReportRepository
from app.repositories.collection_repository import CollectionRepository
from app.schemas.collection_report_schema import CollectionReportCreate
from app.services import collection_report_service as service_module
from app.services import report_service as report_service_module
from app.services.collection_report_service import CollectionReportService

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_real_db_relationships import make_test_collection


@pytest.fixture(autouse=True)
def mail():
    with patch.object(report_service_module, "send_mail", new_callable=AsyncMock, return_value=True) as send:
        yield send


def make_service(session) -> CollectionReportService:
    return CollectionReportService(CollectionReportRepository(session), CollectionRepository(session))


async def public_collection_of_someone_else(session):
    owner = await make_test_user(session)
    return owner, await make_test_collection(session, owner_id=owner.id)


class TestReportCollection:
    async def test_a_member_reports_and_the_admins_get_an_email_after_the_response(self, real_session, mail):
        member = await make_test_user(real_session)
        owner, collection = await public_collection_of_someone_else(real_session)
        tasks = BackgroundTasks()

        await make_service(real_session).report_collection(
            member, collection.id, CollectionReportCreate(reason="offensive", comment="  Hate speech  "), tasks)

        report = (await real_session.execute(
            select(CollectionReport).where(CollectionReport.collection_id == collection.id))).scalar_one()
        assert (report.reason, report.comment, report.status, report.user_id) == (
            "offensive", "Hate speech", "open", member.id)
        mail.assert_not_awaited()
        await tasks()
        assert mail.await_args.kwargs["subject"] == MailSubject.CollectionReported
        assert (mail.await_args.kwargs["owner_username"], mail.await_args.kwargs["username"]) == (
            owner.username, member.username)

    async def test_ones_own_collection_cannot_be_reported(self, real_session):
        owner, collection = await public_collection_of_someone_else(real_session)

        with pytest.raises(ValidationError, match="your own collection"):
            await make_service(real_session).report_collection(
                owner, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())

    async def test_a_private_collection_cannot_be_reported(self, real_session):
        member = await make_test_user(real_session)
        _, collection = await public_collection_of_someone_else(real_session)
        collection.is_public = False
        await real_session.flush()

        with pytest.raises(ResourceNotFoundError):
            await make_service(real_session).report_collection(
                member, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())

    async def test_reporting_twice_waits_for_the_admin(self, real_session):
        member = await make_test_user(real_session)
        _, collection = await public_collection_of_someone_else(real_session)
        service = make_service(real_session)
        await service.report_collection(member, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())

        with pytest.raises(ValidationError, match="already reported"):
            await service.report_collection(
                member, collection.id, CollectionReportCreate(reason="other"), BackgroundTasks())

    async def test_once_a_day_per_collection_even_once_the_admin_closed_it(self, real_session):
        member, admin = await make_test_user(real_session), await make_test_user(real_session)
        _, collection = await public_collection_of_someone_else(real_session)
        service = make_service(real_session)
        await service.report_collection(member, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())
        report = (await service.list_reports("open", 1, 50)).items
        await service.dismiss(next(r.id for r in report if r.collection.id == collection.id), admin)

        # Closed, but reported less than 24 hours ago
        with pytest.raises(ValidationError, match="already reported"):
            await service.report_collection(
                member, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())

        await real_session.execute(update(CollectionReport).where(CollectionReport.collection_id == collection.id)
                                   .values(created_at=text("now() - interval '25 hours'")))
        await service.report_collection(
            member, collection.id, CollectionReportCreate(reason="other"), BackgroundTasks())

    async def test_a_pending_report_blocks_a_new_one_even_after_a_day(self, real_session):
        member = await make_test_user(real_session)
        _, collection = await public_collection_of_someone_else(real_session)
        service = make_service(real_session)
        await service.report_collection(member, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())
        await real_session.execute(update(CollectionReport).where(CollectionReport.collection_id == collection.id)
                                   .values(created_at=text("now() - interval '3 days'")))

        with pytest.raises(ValidationError, match="already reported"):
            await service.report_collection(
                member, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())

    async def test_a_daily_quota(self, real_session, monkeypatch):
        monkeypatch.setattr(service_module, "MAX_REPORTS_PER_DAY", 2)
        member = await make_test_user(real_session)
        service = make_service(real_session)
        for _ in range(2):
            _, collection = await public_collection_of_someone_else(real_session)
            await service.report_collection(
                member, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())

        _, collection = await public_collection_of_someone_else(real_session)
        with pytest.raises(QuotaExceededError):
            await service.report_collection(
                member, collection.id, CollectionReportCreate(reason="spam"), BackgroundTasks())

    async def test_unknown_reasons_are_refused_by_the_database_too(self, real_session):
        _, collection = await public_collection_of_someone_else(real_session)

        with pytest.raises(Exception):
            async with real_session.begin_nested():
                real_session.add(CollectionReport(collection_id=collection.id, reason="ugly"))
                await real_session.flush()


class TestAdmin:
    async def test_resolving_closes_every_open_report_and_dismissing_only_one(self, real_session):
        admin = await make_test_user(real_session)
        first, second = await make_test_user(real_session), await make_test_user(real_session)
        _, collection = await public_collection_of_someone_else(real_session)
        _, other = await public_collection_of_someone_else(real_session)
        service = make_service(real_session)
        for member in (first, second):
            await service.report_collection(
                member, collection.id, CollectionReportCreate(reason="offensive"), BackgroundTasks())
        await service.report_collection(first, other.id, CollectionReportCreate(reason="spam"), BackgroundTasks())
        reports = (await service.list_reports("open", 1, 50)).items
        on_collection = [r for r in reports if r.collection.id == collection.id]
        on_other = next(r for r in reports if r.collection.id == other.id)

        resolved = await service.resolve(on_collection[0].id, admin)
        dismissed = await service.dismiss(on_other.id, admin)

        assert (resolved.status, dismissed.status) == ("resolved", "dismissed")
        statuses = {r.id: r.status for r in (await service.list_reports(None, 1, 50)).items
                    if r.collection.id in (collection.id, other.id)}
        assert set(statuses.values()) == {"resolved", "dismissed"}
        assert [statuses[r.id] for r in on_collection] == ["resolved", "resolved"]
        with pytest.raises(ValidationError, match="already resolved"):
            await service.resolve(on_collection[1].id, admin)

    async def test_making_the_collection_private_resolves_its_open_reports(self, real_session):
        admin = await make_test_user(real_session)
        first, second = await make_test_user(real_session), await make_test_user(real_session)
        _, collection = await public_collection_of_someone_else(real_session)
        service = make_service(real_session)
        for member in (first, second):
            await service.report_collection(
                member, collection.id, CollectionReportCreate(reason="offensive"), BackgroundTasks())
        reports = [r for r in (await service.list_reports("open", 1, 50)).items if r.collection.id == collection.id]

        made_private = await service.make_private(reports[0].id, admin)

        assert (made_private.status, made_private.collection.is_public) == ("resolved", False)
        is_public = (await real_session.execute(
            text("SELECT is_public FROM collections WHERE id = :id"), {"id": collection.id})).scalar_one()
        assert is_public is False
        statuses = {r.id: r.status for r in (await service.list_reports(None, 1, 50)).items
                    if r.collection.id == collection.id}
        assert set(statuses.values()) == {"resolved"}
        # A closed report has no action left, and a private collection cannot be reported again
        with pytest.raises(ValidationError, match="already resolved"):
            await service.make_private(reports[1].id, admin)
        with pytest.raises(ResourceNotFoundError):
            await service.report_collection(
                await make_test_user(real_session), collection.id, CollectionReportCreate(reason="spam"),
                BackgroundTasks())

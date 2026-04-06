import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.moderation_service import ModerationService
from app.core.enums import ModerationStatusEnum
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
    mod_repo = AsyncMock()
    mod_repo.db = make_db()
    place_repo = AsyncMock()
    return ModerationService(mod_repo, place_repo), mod_repo, place_repo


def make_status(status_id=1, name="approved"):
    status = MagicMock()
    status.id = status_id
    status.name = name
    return status


def make_request_model(request_id=1, place_id=10):
    req = MagicMock()
    req.id = request_id
    req.place_id = place_id
    req.user_id = 1
    req.status_id = 1
    req.created_at = datetime.now(timezone.utc)
    req.submitted_at = datetime.now(timezone.utc)
    req.place = None
    req.user = None
    req.status = None
    return req


# ---------------------------------------------------------------------------
# update_moderation_request_status — branching logic
# ---------------------------------------------------------------------------

class TestUpdateModerationRequestStatus:
    async def test_invalid_status_raises_validation_error(self):
        service, mod_repo, _ = make_service()
        mod_repo.get_request_by_id = AsyncMock(return_value=make_request_model())
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=None)

        with pytest.raises(ValidationError, match="Invalid moderation status"):
            await service.update_moderation_request_status(1, "nonexistent", admin_user_id=1)

    async def test_validation_error_is_not_wrapped_in_server_error(self):
        service, mod_repo, _ = make_service()
        mod_repo.get_request_by_id = AsyncMock(return_value=make_request_model())
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=None)

        with pytest.raises(ValidationError):  # not ServerError
            await service.update_moderation_request_status(1, "bad", admin_user_id=1)

    async def test_resource_not_found_is_not_wrapped_in_server_error(self):
        service, mod_repo, _ = make_service()
        mod_repo.get_request_by_id = AsyncMock(
            side_effect=ResourceNotFoundError("ModerationRequest", 99)
        )

        with pytest.raises(ResourceNotFoundError):  # not ServerError
            await service.update_moderation_request_status(99, "approved", admin_user_id=1)

    async def test_approved_sets_place_is_moderated_true(self):
        service, mod_repo, place_repo = make_service()
        req = make_request_model(place_id=42)
        mod_repo.get_request_by_id = AsyncMock(return_value=req)
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=make_status())
        mod_repo.update_request = AsyncMock()
        place_repo.update_place = AsyncMock()

        with patch.object(service, "_create_moderation_request_response", return_value=MagicMock()):
            await service.update_moderation_request_status(1, ModerationStatusEnum.APPROVED.value, admin_user_id=1)

        place_repo.update_place.assert_awaited_once_with(42, {"is_moderated": True})

    async def test_rejected_sets_place_is_moderated_false_and_is_valid_false(self):
        service, mod_repo, place_repo = make_service()
        req = make_request_model(place_id=42)
        mod_repo.get_request_by_id = AsyncMock(return_value=req)
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=make_status(name="rejected"))
        mod_repo.update_request = AsyncMock()
        place_repo.update_place = AsyncMock()

        with patch.object(service, "_create_moderation_request_response", return_value=MagicMock()):
            await service.update_moderation_request_status(1, ModerationStatusEnum.REJECTED.value, admin_user_id=1)

        place_repo.update_place.assert_awaited_once_with(42, {"is_moderated": False, "is_valid": False})

    async def test_pending_status_does_not_update_place(self):
        service, mod_repo, place_repo = make_service()
        req = make_request_model(place_id=42)
        mod_repo.get_request_by_id = AsyncMock(return_value=req)
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=make_status(name="pending"))
        mod_repo.update_request = AsyncMock()

        with patch.object(service, "_create_moderation_request_response", return_value=MagicMock()):
            await service.update_moderation_request_status(1, ModerationStatusEnum.PENDING.value, admin_user_id=1)

        place_repo.update_place.assert_not_awaited()

    async def test_generic_exception_raises_server_error(self):
        service, mod_repo, place_repo = make_service()
        req = make_request_model(place_id=42)
        mod_repo.get_request_by_id = AsyncMock(return_value=req)
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=make_status())
        mod_repo.update_request = AsyncMock(side_effect=RuntimeError("DB failure"))

        with pytest.raises(ServerError, match="Failed to update moderation request status"):
            await service.update_moderation_request_status(1, ModerationStatusEnum.APPROVED.value, admin_user_id=1)


# ---------------------------------------------------------------------------
# approve_moderation_request / reject_moderation_request (delegation)
# ---------------------------------------------------------------------------

class TestApproveRejectDelegation:
    async def test_approve_delegates_with_approved_status(self):
        service, *_ = make_service()

        with patch.object(service, "update_moderation_request_status", new_callable=AsyncMock) as mock_update:
            await service.approve_moderation_request(request_id=5, admin_user_id=1)

        mock_update.assert_awaited_once_with(5, ModerationStatusEnum.APPROVED.value, 1)

    async def test_reject_delegates_with_rejected_status(self):
        service, *_ = make_service()

        with patch.object(service, "update_moderation_request_status", new_callable=AsyncMock) as mock_update:
            await service.reject_moderation_request(request_id=7, admin_user_id=2)

        mock_update.assert_awaited_once_with(7, ModerationStatusEnum.REJECTED.value, 2)


# ---------------------------------------------------------------------------
# get_pending_moderation_requests
# ---------------------------------------------------------------------------

class TestGetPendingModerationRequests:
    async def test_pending_status_not_found_raises_server_error(self):
        service, mod_repo, _ = make_service()
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=None)

        with pytest.raises(ServerError, match="Pending moderation status not found"):
            await service.get_pending_moderation_requests()

    async def test_server_error_is_not_rewrapped(self):
        service, mod_repo, _ = make_service()
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=None)

        exc = None
        try:
            await service.get_pending_moderation_requests()
        except ServerError as e:
            exc = e

        assert exc is not None
        assert "Pending moderation status not found" in exc.detail["message"]

    async def test_success_returns_list(self):
        service, mod_repo, _ = make_service()
        mod_repo.get_moderation_status_by_name = AsyncMock(return_value=make_status(status_id=1))
        mod_repo.get_requests_by_status = AsyncMock(return_value=[])

        result = await service.get_pending_moderation_requests()

        assert result == []
        mod_repo.get_requests_by_status.assert_awaited_once_with(1, None, None)

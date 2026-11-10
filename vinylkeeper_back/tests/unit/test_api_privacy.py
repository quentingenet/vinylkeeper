"""
People are identified by user_uuid outside the API: the internal integer id of a user never
appears in a response, a request body, nor an error message.
"""
import json
import re

import pytest

from app.core.exceptions import DuplicateFieldError, ForbiddenError, ResourceNotFoundError
from app.main import app
from app.schemas.moderation_request_schema import ModerationRequestResponse
from app.schemas.place_schema import PlaceCreate
from app.services.collection_service import CollectionService
from app.services.external_reference_service import ExternalReferenceService
from tests.conftest import make_user
from unittest.mock import AsyncMock, MagicMock

INTERNAL_ID_FIELD = re.compile(r"^(user_id|owner_id|submitted_by_id|reporter_id|moderator_id|approved_by|resolved_by)$")


def reachable_schemas(spec: dict, roots: str) -> set[str]:
    schemas = spec["components"]["schemas"]
    found = {name for name in schemas if f'/{name}"' in roots}
    grew = True
    while grew:
        grew = False
        for name in list(found):
            for ref in re.findall(r'/schemas/([A-Za-z0-9_]+)"', json.dumps(schemas[name])):
                if ref not in found:
                    found.add(ref)
                    grew = True
    return found


def test_no_schema_of_the_api_carries_an_internal_user_id():
    spec = app.openapi()
    schemas = spec["components"]["schemas"]
    leaks = {
        name: [field for field in schemas[name].get("properties", {}) if INTERNAL_ID_FIELD.match(field)]
        for name in reachable_schemas(spec, json.dumps(spec["paths"]))
    }
    assert {name: fields for name, fields in leaks.items() if fields} == {}


def test_a_moderation_request_hides_the_id_of_its_author():
    request = ModerationRequestResponse.model_validate({
        "id": 1, "place_id": 2, "user_id": 42, "status_id": 1,
        "created_at": "2026-11-10T10:00:00Z", "submitted_at": "2026-11-10T10:00:00Z",
        "user": {"username": "john", "user_uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"},
    })
    body = request.model_dump(mode="json")
    assert "user_id" not in body
    assert body["user"]["user_uuid"] == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def test_a_place_cannot_be_given_an_author_by_the_client():
    place = PlaceCreate.model_validate({
        "name": "Sofa", "address": "1 rue", "city": "Paris", "country": "France",
        "place_type_id": 1, "submitted_by_id": 7,
    })
    assert "submitted_by_id" not in place.model_dump()


async def test_refusing_a_foreign_collection_does_not_tell_the_user_id():
    repository = MagicMock()
    repository.find_collection_by_id = AsyncMock(return_value=MagicMock(owner_id=2))
    service = ExternalReferenceService(repository)

    with pytest.raises(ForbiddenError) as refused:
        await service._verify_collection_access(collection_id=5, user_id=987654)

    assert "987654" not in json.dumps(refused.value.detail)


@pytest.mark.parametrize("liked", [True, False])
async def test_like_errors_do_not_tell_the_user_id(liked):
    repository, likes = MagicMock(), MagicMock()
    repository.get_by_id = AsyncMock(return_value=MagicMock(id=5, is_public=True, owner_id=1))
    likes.is_liked_by_user = AsyncMock(return_value=liked)
    service = CollectionService(repository, likes, MagicMock(), MagicMock())

    action = service.like_collection if liked else service.unlike_collection
    expected = DuplicateFieldError if liked else ResourceNotFoundError
    with pytest.raises(expected) as error:
        await action(987654, 5)

    assert "987654" not in json.dumps(error.value.detail)


def test_the_helper_user_factory_is_not_what_the_test_checks():
    # make_user is imported only to make sure the fixtures module still loads with these tests
    assert make_user is not None

import pytest

from app.utils.pagination import page_count


@pytest.mark.parametrize("total, limit, expected", [(0, 10, 0), (1, 10, 1), (10, 10, 1), (11, 10, 2), (25, 12, 3)])
def test_page_count(total, limit, expected):
    assert page_count(total, limit) == expected

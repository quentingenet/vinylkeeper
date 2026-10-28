"""Sizes and qualities of the public image proxy are bounded to what the frontend requests."""
import pytest

from app.services.image_proxy_service import ImageProxyService


@pytest.fixture
def service(tmp_path, monkeypatch):
    monkeypatch.setenv("IMAGE_CACHE_DIR", str(tmp_path))
    return ImageProxyService()


@pytest.mark.parametrize("size", [128, 200, 220, 240, 300, 500])
def test_frontend_sizes_are_kept(service, size):
    assert service._snap_size(size) == size


@pytest.mark.parametrize("asked, served", [(1, 128), (129, 200), (301, 500), (2048, 500)])
def test_other_sizes_are_served_at_the_next_size(service, asked, served):
    assert service._snap_size(asked) == served


@pytest.mark.parametrize("asked, served", [(75, 75), (80, 80), (85, 85), (1, 75), (100, 85), (78, 80)])
def test_quality_is_the_nearest_served_one(service, asked, served):
    assert service._snap_quality(asked) == served


async def test_arbitrary_variants_share_the_cache_entry_of_a_served_one(service, monkeypatch):
    fetched = []

    async def fake_fetch(url):
        fetched.append(url)
        return b"raw"

    monkeypatch.setattr(service, "_fetch_image", fake_fetch)
    monkeypatch.setattr(service, "_process_image", lambda data, w, h, q, fmt: f"{w}x{h}q{q}".encode())
    src = "https://i.discogs.com/a.jpg"

    first, _ = await service.get_proxy_image(src, 300, 300, 85, cacheable=True)
    second, _ = await service.get_proxy_image(src, 299, 251, 84, cacheable=True)

    assert first == second == b"300x300q85"
    assert len(fetched) == 1

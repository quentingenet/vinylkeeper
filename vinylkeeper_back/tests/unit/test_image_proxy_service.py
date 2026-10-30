"""Sizes and qualities of the public image proxy are bounded to what the frontend requests."""
import os
import time
from io import BytesIO

import pytest
from PIL import Image

from app.core.exceptions import ValidationError
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


async def test_a_cover_older_than_its_lifetime_is_fetched_again(service, monkeypatch):
    fetched = []

    async def fake_fetch(url):
        fetched.append(url)
        return b"raw"

    monkeypatch.setattr(service, "_fetch_image", fake_fetch)
    monkeypatch.setattr(service, "_process_image", lambda data, w, h, q, fmt: b"cover")
    src = "https://i.discogs.com/a.jpg"
    await service.get_proxy_image(src, 300, 300, 85, cacheable=True)
    await service.get_proxy_image(src, 300, 300, 85, cacheable=True)
    assert len(fetched) == 1

    expired = time.time() - service.CACHE_LIFETIME_SECONDS - 1
    for path in service.cache_dir.iterdir():
        os.utime(path, (expired, expired))
    await service.get_proxy_image(src, 300, 300, 85, cacheable=True)

    assert len(fetched) == 2


def test_browser_and_disk_lifetimes_stay_within_six_hours_of_discogs():
    # The endpoint gives the browser the same lifetime as the disk copy
    assert 2 * ImageProxyService.CACHE_LIFETIME_SECONDS <= 6 * 3600


def test_pruning_removes_expired_covers_and_keeps_fresh_ones(service):
    fresh = service.cache_dir / "fresh.webp"
    stale = service.cache_dir / "stale.webp"
    fresh.write_bytes(b"x")
    stale.write_bytes(b"x")
    expired = time.time() - service.CACHE_LIFETIME_SECONDS - 1
    os.utime(stale, (expired, expired))

    service._prune_cache()

    assert fresh.exists()
    assert not stale.exists()


def encode(format: str) -> bytes:
    output = BytesIO()
    Image.new("RGB", (600, 400), "orange").save(output, format=format)
    return output.getvalue()


@pytest.mark.parametrize("source_format", ["JPEG", "PNG", "WEBP"])
@pytest.mark.parametrize("output_format", ["webp", "jpeg"])
def test_discogs_formats_are_resized(service, source_format, output_format):
    processed = service._process_image(encode(source_format), 300, 300, 85, output_format)

    image = Image.open(BytesIO(processed))
    assert image.format == output_format.upper()
    assert image.size == (300, 200)


@pytest.mark.parametrize("source_format", ["GIF", "BMP", "TIFF"])
def test_other_formats_are_refused_before_decoding(service, source_format):
    with pytest.raises(ValidationError, match="Unsupported image format"):
        service._process_image(encode(source_format), 300, 300, 85, "webp")


def test_bytes_that_are_no_image_are_refused(service):
    with pytest.raises(ValidationError):
        service._process_image(b"not an image", 300, 300, 85, "webp")

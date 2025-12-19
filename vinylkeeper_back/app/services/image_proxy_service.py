import hashlib
import os
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlparse
import httpx
from PIL import Image
from io import BytesIO
from app.core.exceptions import ValidationError, ServerError, ErrorCode
from app.core.logging import logger


class ImageProxyService:
    ALLOWED_DOMAINS = ["i.discogs.com"]
    MAX_IMAGE_SIZE = 10 * 1024 * 1024
    MAX_DIMENSION = 2048
    REQUEST_TIMEOUT = 10.0
    DEFAULT_QUALITY = 85

    def __init__(self, http_client: Optional[httpx.AsyncClient] = None):
        cache_path = os.getenv("IMAGE_CACHE_DIR")
        if cache_path:
            self.cache_dir = Path(cache_path)
        else:
            self.cache_dir = Path(
                __file__).parent.parent.parent / "cache" / "images"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.http_client = http_client

    def _validate_domain(self, url: str) -> None:
        if not url or not url.strip():
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Image URL cannot be empty",
                details={"url": url}
            )
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if not domain:
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Invalid image URL format",
                details={"url": url}
            )
        if domain not in self.ALLOWED_DOMAINS:
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message=f"Domain not allowed: {domain}",
                details={"allowed_domains": self.ALLOWED_DOMAINS, "url": url}
            )

    def _validate_dimensions(self, width: int, height: int) -> None:
        if width <= 0 or height <= 0:
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Width and height must be positive integers",
                details={"width": width, "height": height}
            )
        if width > self.MAX_DIMENSION or height > self.MAX_DIMENSION:
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message=f"Dimensions exceed maximum allowed size ({self.MAX_DIMENSION})",
                details={"width": width, "height": height,
                         "max": self.MAX_DIMENSION}
            )

    def _validate_quality(self, quality: int) -> None:
        if quality < 1 or quality > 100:
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Quality must be between 1 and 100",
                details={"quality": quality}
            )

    def _generate_cache_key(self, src: str, width: int, height: int, quality: int, format: str) -> str:
        key_string = f"{src}|{width}|{height}|{quality}|{format}"
        return hashlib.sha256(key_string.encode()).hexdigest()

    def _get_cache_path(self, cache_key: str, format: str) -> Path:
        return self.cache_dir / f"{cache_key}.{format.lower()}"

    def _is_cached(self, cache_key: str, format: str) -> bool:
        cache_path = self._get_cache_path(cache_key, format)
        return cache_path.exists()

    def _load_from_cache(self, cache_key: str, format: str) -> bytes:
        cache_path = self._get_cache_path(cache_key, format)
        with open(cache_path, "rb") as f:
            return f.read()

    def _save_to_cache(self, cache_key: str, format: str, data: bytes) -> None:
        cache_path = self._get_cache_path(cache_key, format)
        with open(cache_path, "wb") as f:
            f.write(data)

    async def _fetch_image(self, url: str) -> bytes:
        try:
            client_to_use = self.http_client
            if not client_to_use:
                # Fallback: create temporary client if shared client not available
                async with httpx.AsyncClient(timeout=self.REQUEST_TIMEOUT) as client:
                    response = await client.get(url)
                    response.raise_for_status()

                    content_length = response.headers.get("content-length")
                    if content_length and int(content_length) > self.MAX_IMAGE_SIZE:
                        raise ValidationError(
                            error_code=ErrorCode.INVALID_INPUT,
                            message="Image size exceeds maximum allowed size",
                            details={"max_size": self.MAX_IMAGE_SIZE}
                        )
                    return response.content
            else:
                response = await client_to_use.get(url)
                response.raise_for_status()

                content_length = response.headers.get("content-length")
                if content_length and int(content_length) > self.MAX_IMAGE_SIZE:
                    raise ValidationError(
                        error_code=ErrorCode.INVALID_INPUT,
                        message=f"Image size exceeds maximum allowed ({self.MAX_IMAGE_SIZE} bytes)",
                        details={"size": content_length}
                    )

                image_data = response.content
                if len(image_data) > self.MAX_IMAGE_SIZE:
                    raise ValidationError(
                        error_code=ErrorCode.INVALID_INPUT,
                        message=f"Image size exceeds maximum allowed ({self.MAX_IMAGE_SIZE} bytes)",
                        details={"size": len(image_data)}
                    )

                return image_data
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch image from {url}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message=f"Failed to fetch image: {str(e)}"
            )

    def _process_image(
        self,
        image_data: bytes,
        width: int,
        height: int,
        quality: int,
        format: str
    ) -> bytes:
        try:
            image = Image.open(BytesIO(image_data))
            image = image.convert("RGB")

            image.thumbnail((width, height), Image.Resampling.LANCZOS)

            output = BytesIO()
            if format.lower() == "webp":
                image.save(output, format="WEBP", quality=quality, method=6)
            else:
                image.save(output, format="JPEG",
                           quality=quality, optimize=True)

            return output.getvalue()
        except Exception as e:
            logger.error(f"Failed to process image: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message=f"Failed to process image: {str(e)}"
            )

    async def get_proxy_image(
        self,
        src: str,
        width: int,
        height: int,
        quality: Optional[int] = None,
        accept_webp: bool = True,
        cacheable: bool = False
    ) -> Tuple[bytes, str]:
        quality = quality or self.DEFAULT_QUALITY

        self._validate_domain(src)
        self._validate_dimensions(width, height)
        self._validate_quality(quality)

        format = "webp" if accept_webp else "jpeg"

        if cacheable:
            cache_key = self._generate_cache_key(
                src, width, height, quality, format)

            if self._is_cached(cache_key, format):
                cached_data = self._load_from_cache(cache_key, format)
                return cached_data, f"image/{format}"

        image_data = await self._fetch_image(src)
        processed_data = self._process_image(
            image_data, width, height, quality, format)

        if cacheable:
            cache_key = self._generate_cache_key(
                src, width, height, quality, format)
            self._save_to_cache(cache_key, format, processed_data)

        return processed_data, f"image/{format}"

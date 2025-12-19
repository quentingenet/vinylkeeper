from fastapi import APIRouter, Query, Request, Depends
from fastapi.responses import StreamingResponse
from io import BytesIO
import hashlib
from app.services.image_proxy_service import ImageProxyService
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


def get_image_proxy_service(request: Request) -> ImageProxyService:
    """Get ImageProxyService with shared HTTP client from app state."""
    http_client = request.app.state.http_client
    return ImageProxyService(http_client)


@router.get("/proxy")
@handle_app_exceptions
async def proxy_image(
    request: Request,
    src: str = Query(...,
                     description="Source image URL from Discogs", min_length=1),
    w: int = Query(..., description="Width in pixels", gt=0),
    h: int = Query(..., description="Height in pixels", gt=0),
    q: int = Query(85, description="Quality (1-100)", ge=1, le=100),
    cache: bool = Query(
        False, description="Whether to cache the image on disk"),
    service: ImageProxyService = Depends(get_image_proxy_service)
):
    """
    Proxy endpoint for Discogs images with resizing and optimization.

    Fetches images from Discogs CDN, resizes them to requested dimensions,
    converts to WebP by default (with JPEG fallback), and optionally caches results on disk.

    Args:
        src: Source image URL (must be from i.discogs.com)
        w: Target width in pixels
        h: Target height in pixels
        q: Quality (1-100, default 85)
        cache: Whether to cache the image on disk (default False)
        request: FastAPI request object (for Accept header)
        service: Injected image proxy service

    Returns:
        StreamingResponse: Optimized image with appropriate content-type

    Raises:
        ValidationError: If domain not allowed, invalid dimensions, or invalid quality
        ServerError: If image fetch or processing fails
    """
    accept_header = request.headers.get("accept", "")
    accept_webp = "image/webp" in accept_header.lower()

    image_data, content_type = await service.get_proxy_image(
        src=src,
        width=w,
        height=h,
        quality=q,
        accept_webp=accept_webp,
        cacheable=cache
    )

    etag = hashlib.md5(image_data).hexdigest()

    response = StreamingResponse(
        BytesIO(image_data),
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": str(len(image_data)),
            "ETag": f'"{etag}"',
            "Vary": "Accept"
        }
    )

    return response

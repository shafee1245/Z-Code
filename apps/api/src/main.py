from io import BytesIO
from typing import Any
from urllib.parse import urlparse
import asyncio

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from src.core.config import settings
from src.core.database import get_db
from src.core.security import verify_token
from src.models import QRCode, ScanAnalytics

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Z-Code API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Internal Server Error", "code": 500})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# CORS
allowed_origins = []
for o in [settings.web_origin, settings.frontend_url]:
    if o:
        allowed_origins.append(o)
if settings.cors_origins:
    for o in settings.cors_origins.split(","):
        o = o.strip()
        if o and o not in allowed_origins:
            allowed_origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else [],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class QRRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    fill_color: str = Field(default="#000000", pattern=r'^#[0-9a-fA-F]{6}$')
    back_color: str = Field(default="#FFFFFF", pattern=r'^#[0-9a-fA-F]{6}$')
    rounded: bool = False


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "Z-Code API Engine"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "api"}


@app.post("/api/generate")
@limiter.limit("10/minute")
async def generate_qr(
    request: Request,
    data: QRRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
) -> dict[str, Any]:
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    import uuid
    import base64

    slug = uuid.uuid4().hex + uuid.uuid4().hex[:4]
    slug = slug[:16]

    qr = QRCode(
        user_id=user_id,
        title="My QR Code",
        target_url=data.url,
        short_slug=slug,
        style_config={
            "fill_color": data.fill_color,
            "back_color": data.back_color,
            "rounded_modules": data.rounded,
        },
    )
    db.add(qr)
    await db.commit()
    await db.refresh(qr)

    base_url = settings.api_base_url or settings.frontend_url or settings.web_origin or ""
    if base_url:
        short_url = f"{base_url.rstrip('/')}/s/{slug}"
    else:
        short_url = f"/s/{slug}"

    qr_code = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr_code.add_data(short_url)
    qr_code.make(fit=True)

    image_factory = StyledPilImage if data.rounded else None
    module_drawer = RoundedModuleDrawer() if data.rounded else None

    img = qr_code.make_image(
        fill_color=data.fill_color,
        back_color=data.back_color,
        image_factory=image_factory,
        module_drawer=module_drawer if data.rounded else None,
    )

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    encoded_image = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "short_slug": slug,
        "short_url": short_url,
        "qr_image": f"data:image/png;base64,{encoded_image}",
    }


def _derive_device_type(ua: str) -> str:
    ua_lower = ua.lower()
    if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
        return "mobile"
    if "tablet" in ua_lower or "ipad" in ua_lower:
        return "tablet"
    if "desktop" in ua_lower or "windows" in ua_lower or "mac" in ua_lower or "linux" in ua_lower:
        return "desktop"
    return "unknown"


@app.get("/s/{slug}")
@limiter.limit("120/minute")
async def redirect_and_track(slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QRCode).where(QRCode.short_slug == slug))
    qr = result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="QR Code not found")

    target_url = qr.target_url
    parsed = urlparse(target_url)
    scheme = parsed.scheme.lower() if parsed.scheme else ""
    if scheme not in ("http", "https") or scheme in ("javascript", "file", "data"):
        raise HTTPException(status_code=400, detail="Invalid redirect URL")

    ua = request.headers.get("user-agent", "")[:500] if request.headers else ""
    ip = request.client.host if request.client else None
    device_type = _derive_device_type(ua)

    async def log_scan():
        try:
            scan = ScanAnalytics(
                qrcode_id=qr.id,
                ip_address=ip,
                user_agent=ua,
                device_type=device_type,
            )
            db.add(scan)
            await db.commit()
        except Exception:
            await db.rollback()

    asyncio.create_task(log_scan())

    return RedirectResponse(url=target_url)


@app.get("/api/analytics/{slug}")
@limiter.limit("60/minute")
async def get_analytics(
    request: Request,
    slug: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    result = await db.execute(select(QRCode).where(QRCode.short_slug == slug, QRCode.user_id == user_id))
    qr = result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="QR Code not found")

    count_result = await db.execute(
        select(func.count(ScanAnalytics.id)).where(ScanAnalytics.qrcode_id == qr.id)
    )
    total_scans = count_result.scalar() or 0

    return {
        "slug": slug,
        "target_url": qr.target_url,
        "total_scans": int(total_scans),
        "scans_by_day": {},
        "scans_by_country": {},
        "scans_by_device": {},
        "recent_scans": [],
    }

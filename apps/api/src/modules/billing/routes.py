from fastapi import APIRouter, HTTPException, Request

from src.core.config import settings

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/webhook", summary="Stripe webhook integration point")
async def stripe_webhook(request: Request) -> dict[str, str]:
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=501, detail="Stripe webhook is not configured")
    # Signature verification and event handling belong here before subscription state is changed.
    await request.body()
    raise HTTPException(status_code=501, detail="Stripe event handling is not implemented")

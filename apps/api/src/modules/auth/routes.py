from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status", summary="Authentication integration status")
def auth_status() -> dict[str, str]:
    return {"status": "not_configured", "message": "Connect account persistence and token issuance before enabling authentication."}


@router.post("/login", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def login_not_configured() -> None:
    raise HTTPException(status_code=501, detail="Authentication persistence is not configured")

from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", summary="Analytics integration status")
def analytics_overview() -> dict[str, str]:
    return {
        "status": "not_configured",
        "message": "Persisted scan events and aggregation will be enabled with the analytics database integration.",
    }

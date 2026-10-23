from fastapi import APIRouter

from app import SERVICE_NAME, __version__
from app.schemas import HealthOut

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthOut, summary="Backend availability")
def health() -> HealthOut:
    return HealthOut(status="ok", service=SERVICE_NAME, version=__version__)

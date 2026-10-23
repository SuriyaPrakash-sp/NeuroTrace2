from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.errors import APIError
from app.schemas import SeedOut
from app.services.seed_service import seed_demo

router = APIRouter(prefix="/api", tags=["Demo / admin"])


@router.post("/seed", response_model=SeedOut, summary="Seed the demo student (Aarav Sharma)",
             description="Idempotent. Pass `reset=true` to wipe and recreate Aarav's demo data. "
                         "Disable with ENABLE_SEED_ENDPOINT=false.")
def seed(reset: bool = Query(False), db: Session = Depends(get_db)):
    if not get_settings().enable_seed_endpoint:
        raise APIError(404, "NOT_FOUND", "The seed endpoint is disabled (ENABLE_SEED_ENDPOINT=false).")
    return seed_demo(db, reset=reset)

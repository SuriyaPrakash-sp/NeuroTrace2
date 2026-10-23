"""Progress router re-export for modular architecture."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.common import ERR_404
from app.schemas import ProgressOut
from app.services.lookups import get_student_or_404
from app.services.progress_service import build_progress

router = APIRouter(prefix="/api/progress", tags=["Progress"])

@router.get("/{student_id}", response_model=ProgressOut, responses=ERR_404, summary="Get student progress")
def get_progress_by_student(
    student_id: str,
    recent_limit: int = Query(5, ge=1, le=50, description="How many recent sessions to include"),
    db: Session = Depends(get_db)
):
    get_student_or_404(db, student_id)
    return build_progress(db, student_id, recent_limit)

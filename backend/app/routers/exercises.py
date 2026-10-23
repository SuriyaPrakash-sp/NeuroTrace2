from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.common import ERR_404, ERR_422
from app.schemas import ExerciseSessionCreate, ExerciseSessionOut
from app.services import session_service
from app.services.lookups import get_student_or_404

router = APIRouter(prefix="/api/exercises", tags=["Exercises"])


@router.post(
    "/sessions",
    response_model=ExerciseSessionOut,
    summary="Submit a completed exercise session",
    description=("Scores are rounded and clamped to 0-100. The submitted composite `score` is stored as sent "
                 "(the contract formula is 0.45*path_coverage + 0.35*accuracy + 0.20*smoothness)."),
    responses={**ERR_404, **ERR_422},
)
def submit_session(payload: ExerciseSessionCreate, db: Session = Depends(get_db)):
    student = get_student_or_404(db, payload.student_id)
    return session_service.to_response(session_service.submit_session(db, student, payload))

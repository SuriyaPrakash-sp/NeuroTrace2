from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError
from app.models import Assessment
from app.routers.common import ERR_404, ERR_422, GENERATOR_HEADER
from app.schemas import ErrorResponse, TherapyPlanOut, TherapyPlanRequest
from app.services import therapy_service
from app.services.lookups import get_assessment_or_404, get_student_or_404

router = APIRouter(prefix="/api/therapy-plans", tags=["Therapy plans"])


@router.post(
    "/generate",
    response_model=TherapyPlanOut,
    summary="Generate a draft therapy plan (therapist review required)",
    description=(
        "Builds a progressive plan that prioritizes lower assessment scores. Uses the configured AI service "
        "when available and valid; otherwise a deterministic fallback. `therapist_review_required` is always "
        "`true` and `status` is `draft`."
    ),
    responses={**ERR_404, **ERR_422, 400: {"model": ErrorResponse, "description": "Assessment unusable"}},
)
def generate_plan(payload: TherapyPlanRequest, response: Response, db: Session = Depends(get_db)):
    student = get_student_or_404(db, payload.student_id)
    if payload.assessment_id:
        assessment = get_assessment_or_404(db, payload.assessment_id)
        if assessment.student_id != student.id:
            raise APIError(400, "VALIDATION_ERROR",
                           f"Assessment '{assessment.id}' belongs to a different student.",
                           {"assessment_id": assessment.id, "student_id": student.id})
    else:
        assessment = db.scalars(
            select(Assessment).where(Assessment.student_id == student.id, Assessment.status == "completed")
            .order_by(Assessment.created_at.desc(), Assessment.id.desc())
        ).first()
        if assessment is None:
            raise APIError(404, "NOT_FOUND",
                           f"Student '{student.id}' has no completed assessment yet. "
                           "Upload a handwriting sample with POST /api/assessments/analyze first.",
                           {"student_id": student.id})
    if assessment.status != "completed":
        raise APIError(400, "VALIDATION_ERROR",
                       f"Assessment '{assessment.id}' has status '{assessment.status}', so a plan cannot be "
                       "generated from it. Upload a clearer handwriting sample and try again.",
                       {"assessment_id": assessment.id, "status": assessment.status})
    row = therapy_service.generate_plan(db, student, assessment, payload.duration_weeks, payload.therapist_notes)
    response.headers[GENERATOR_HEADER] = row.generator
    return therapy_service.to_response(row)

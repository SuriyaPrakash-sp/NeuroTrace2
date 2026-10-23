from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.common import ERR_404, ERR_422, GENERATOR_HEADER
from app.schemas import AssessmentOut, ErrorResponse
from app.services import assessment_service
from app.services.lookups import get_student_or_404

router = APIRouter(prefix="/api/assessments", tags=["Assessments"])


@router.post(
    "/analyze",
    response_model=AssessmentOut,
    summary="Upload and analyze a handwriting sample (PNG/JPG/JPEG, max 10 MB by default)",
    description=(
        "multipart/form-data with `student_id`, `sample_type` (`handwriting_sample`) and `file`. "
        "Blank, corrupted or low-quality images do NOT cause an error: they return a valid response with "
        "`status` `completed` (low confidence) or `failed`, plus human-readable `warnings`. "
        "AI-assisted observations only; not a diagnostic tool."
    ),
    responses={**ERR_404, **ERR_422,
               400: {"model": ErrorResponse, "description": "Invalid file type or sample_type"},
               413: {"model": ErrorResponse, "description": "File too large"}},
)
def analyze_handwriting(
    response: Response,
    student_id: str = Form(..., description="e.g. student_aarav_001"),
    sample_type: str = Form("handwriting_sample"),
    file: UploadFile = File(..., description="PNG, JPG or JPEG handwriting image"),
    db: Session = Depends(get_db),
):
    student = get_student_or_404(db, student_id.strip())
    row = assessment_service.analyze_upload(db, student, file, sample_type.strip())
    response.headers[GENERATOR_HEADER] = row.generator
    return assessment_service.to_response(row)

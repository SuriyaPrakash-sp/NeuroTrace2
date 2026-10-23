"""ID generation and 404-aware lookups."""
import re
import unicodedata

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import Assessment, Student


def next_sequential_id(db: Session, model, prefix: str) -> str:
    """assessment_001, plan_002, session_003 ... (first free number)."""
    total = db.scalar(select(func.count()).select_from(model)) or 0
    n = total + 1
    while db.get(model, f"{prefix}_{n:03d}") is not None:
        n += 1
    return f"{prefix}_{n:03d}"


def next_student_id(db: Session, name: str) -> str:
    """student_<firstname>_<nnn>, e.g. student_aarav_001."""
    first = name.strip().split()[0] if name.strip() else ""
    ascii_first = unicodedata.normalize("NFKD", first).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "", ascii_first.lower()) or "learner"
    n = 1
    while db.get(Student, f"student_{slug}_{n:03d}") is not None:
        n += 1
    return f"student_{slug}_{n:03d}"


def get_student_or_404(db: Session, student_id: str) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise APIError(
            404,
            "NOT_FOUND",
            f"Student '{student_id}' was not found. Create the student first with POST /api/students "
            "(or load the demo student with POST /api/seed).",
            {"student_id": student_id},
        )
    return student


def get_assessment_or_404(db: Session, assessment_id: str) -> Assessment:
    row = db.get(Assessment, assessment_id)
    if row is None:
        raise APIError(
            404,
            "NOT_FOUND",
            f"Assessment '{assessment_id}' was not found. Upload a handwriting sample with "
            "POST /api/assessments/analyze first.",
            {"assessment_id": assessment_id},
        )
    return row

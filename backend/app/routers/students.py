from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Student
from app.routers.common import ERR_404, ERR_422
from app.schemas import ProgressOut, StudentCreate, StudentListOut, StudentOut
from app.services.lookups import get_student_or_404, next_student_id
from app.services.progress_service import build_progress

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.post("", response_model=StudentOut, status_code=201, responses=ERR_422, summary="Create a student")
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    student = Student(
        id=next_student_id(db, payload.name), name=payload.name, age=payload.age, grade=payload.grade,
        avatar_url=payload.avatar_url, primary_goals=payload.primary_goals, notes=payload.notes,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("", response_model=StudentListOut, summary="List students")
def list_students(db: Session = Depends(get_db)):
    rows = db.scalars(select(Student).order_by(Student.created_at, Student.id)).all()
    return {"items": rows, "total": len(rows)}


@router.get("/{student_id}", response_model=StudentOut, responses=ERR_404, summary="Get one student")
def get_student(student_id: str, db: Session = Depends(get_db)):
    return get_student_or_404(db, student_id)


@router.get("/{student_id}/progress", response_model=ProgressOut, responses=ERR_404,
            summary="Get student progress")
def get_progress(student_id: str, recent_limit: int = Query(5, ge=1, le=50,
                 description="How many recent sessions to include"), db: Session = Depends(get_db)):
    get_student_or_404(db, student_id)
    return build_progress(db, student_id, recent_limit)

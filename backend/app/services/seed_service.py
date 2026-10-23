"""Seed the contract's demo student (Aarav) so a fresh install can run the demo flow."""
import logging

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Assessment, ExerciseSession, Student, TherapyPlan
from app.services import demo_data as d
from app.services.demo_image import render_text_sample
from app.services.lookups import next_sequential_id
from app.services.session_service import build_feedback
from app.utils import performance_label

logger = logging.getLogger("neurotrace")


def _ensure_demo_sample() -> None:
    path = get_settings().upload_dir / "handwriting.png"
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    render_text_sample(
        ["Aarav likes to write", "my name is Aarav"], seed=7,
        baseline_jitter=0.16, size_jitter=0.12, space_jitter=0.5,
    ).save(path, "PNG")


def seed_demo(db: Session, reset: bool = False) -> dict:
    existing = db.get(Student, d.AARAV_ID)
    if existing and not reset:
        a = db.scalars(select(Assessment).where(Assessment.student_id == d.AARAV_ID)).first()
        n = db.scalar(select(func.count()).select_from(ExerciseSession).where(
            ExerciseSession.student_id == d.AARAV_ID)) or 0
        return {"status": "already_seeded", "student_id": d.AARAV_ID,
                "assessment_id": a.id if a else None, "exercise_sessions": n}

    status = "seeded"
    if existing:
        for model in (ExerciseSession, TherapyPlan, Assessment):
            db.execute(delete(model).where(model.student_id == d.AARAV_ID))
        db.delete(existing)
        db.commit()
        status = "reseeded"

    _ensure_demo_sample()
    db.add(Student(**d.AARAV))
    db.flush()

    assessment_id = d.CANONICAL_ASSESSMENT_ID
    if db.get(Assessment, assessment_id) is not None:
        assessment_id = next_sequential_id(db, Assessment, "assessment")
    db.add(Assessment(
        id=assessment_id, student_id=d.AARAV_ID, status="completed", sample_url=d.CANONICAL_SAMPLE_URL,
        original_filename="handwriting.png", overall_score=d.CANONICAL_OVERALL,
        analysis_confidence=d.CANONICAL_CONFIDENCE, metrics={k: dict(v) for k, v in d.CANONICAL_METRICS.items()},
        observations=list(d.CANONICAL_OBSERVATIONS), warnings=[], generator="seed",
        created_at=d.CANONICAL_ASSESSMENT_CREATED,
    ))
    db.flush()

    for score, when, deviations, seconds in zip(d.PREVIOUS_EXERCISE_SCORES, d.PREVIOUS_SESSION_DATES,
                                                 (7, 5, 4), (34, 29, 25)):
        accuracy, coverage, smooth = min(100, score + 4), min(100, score + 7), max(0, score - 3)
        db.add(ExerciseSession(
            id=next_sequential_id(db, ExerciseSession, "session"), student_id=d.AARAV_ID,
            exercise_id="exercise_trace_line", target_character="A", score=score, accuracy=accuracy,
            completion_time_seconds=seconds, path_coverage=coverage, smoothness=smooth, deviations=deviations,
            performance_label=performance_label(score),
            feedback=build_feedback(accuracy, coverage, smooth, deviations, score, "A"), created_at=when,
        ))
        db.flush()
    db.commit()
    return {"status": status, "student_id": d.AARAV_ID, "assessment_id": assessment_id,
            "exercise_sessions": len(d.PREVIOUS_EXERCISE_SCORES)}

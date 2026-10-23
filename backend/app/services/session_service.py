"""Exercise-session submission: validate, label, generate supportive feedback, persist."""
import logging

from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import APIError
from app.models import ExerciseSession, Student
from app.schemas import ExerciseSessionCreate, ExerciseSessionOut
from app.services.exercise_catalog import CATALOG
from app.services.lookups import next_sequential_id
from app.utils import performance_label, round_half_up

logger = logging.getLogger("neurotrace")
DIAGONAL_LETTERS = set("AKMNVWXYZ")


def composite_score(path_coverage: int, accuracy: int, smoothness: int) -> int:
    """Contract section 7.2: 0.45*coverage + 0.35*proximity + 0.20*smoothness."""
    return round_half_up(0.45 * path_coverage + 0.35 * accuracy + 0.20 * smoothness)


def build_feedback(accuracy: int, path_coverage: int, smoothness: int, deviations: int,
                   score: int, target: str) -> list[str]:
    """Short, supportive, child-friendly lines (never diagnostic)."""
    tips: list[str] = []
    if accuracy >= 85:
        tips.append("You stayed close to the target path.")
    elif accuracy >= 70:
        tips.append("You followed the path well. Try to keep your finger even closer to the line.")
    else:
        tips.append("Take your time and try to stay a little closer to the path.")
    if path_coverage < 80:
        tips.append("Try to trace the whole shape from start to finish.")
    if smoothness < 80 or deviations >= 3:
        if target[:1].upper() in DIAGONAL_LETTERS:
            tips.append("Try to slow down slightly on diagonal strokes.")
        else:
            tips.append("Try to slow down slightly so your movement stays steady.")
    if score >= 85:
        tips.append("Great control! You are ready for a new challenge.")
    return tips[:3]


def submit_session(db: Session, student: Student, payload: ExerciseSessionCreate) -> ExerciseSession:
    settings = get_settings()
    if settings.strict_exercise_ids and payload.exercise_id not in CATALOG:
        raise APIError(
            404, "NOT_FOUND",
            f"Exercise '{payload.exercise_id}' was not found. Use an exercise id from a generated therapy plan "
            f"(for example '{next(iter(CATALOG))}').",
            {"exercise_id": payload.exercise_id, "known_exercise_ids": sorted(CATALOG)},
        )
    expected = composite_score(payload.path_coverage, payload.accuracy, payload.smoothness)
    if abs(expected - payload.score) > 5:
        logger.info("Submitted score %s differs from contract formula result %s (student=%s, exercise=%s); "
                    "keeping the submitted score.", payload.score, expected, student.id, payload.exercise_id)

    row = ExerciseSession(
        id=next_sequential_id(db, ExerciseSession, "session"), student_id=student.id,
        exercise_id=payload.exercise_id, target_character=payload.target_character,
        score=payload.score, accuracy=payload.accuracy,
        completion_time_seconds=payload.completion_time_seconds,
        path_coverage=payload.path_coverage, smoothness=payload.smoothness, deviations=payload.deviations,
        performance_label=performance_label(payload.score),
        feedback=build_feedback(payload.accuracy, payload.path_coverage, payload.smoothness,
                                payload.deviations, payload.score, payload.target_character),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def to_response(row: ExerciseSession) -> ExerciseSessionOut:
    return ExerciseSessionOut(
        session_id=row.id, student_id=row.student_id, exercise_id=row.exercise_id,
        target_character=row.target_character, score=row.score, accuracy=row.accuracy,
        completion_time_seconds=row.completion_time_seconds, path_coverage=row.path_coverage,
        smoothness=row.smoothness, deviations=row.deviations, performance_label=row.performance_label,
        feedback=row.feedback or [], created_at=row.created_at,
    )

"""Student progress (contract section 8)."""
from sqlalchemy import literal_column, select
from sqlalchemy.orm import Session

from app.models import Assessment, ExerciseSession
from app.schemas import ProgressOut, ProgressPointOut, RecentSessionOut
from app.services.exercise_catalog import METRIC_KEYS


def build_progress(db: Session, student_id: str, recent_limit: int = 5) -> ProgressOut:
    sessions = db.scalars(
        select(ExerciseSession).where(ExerciseSession.student_id == student_id)
        .order_by(ExerciseSession.created_at, literal_column("rowid"))
    ).all()
    assessments = db.scalars(
        select(Assessment).where(Assessment.student_id == student_id, Assessment.status == "completed")
        .order_by(Assessment.created_at, literal_column("rowid"))
    ).all()

    points: dict[str, dict] = {}

    def point(date: str) -> dict:
        return points.setdefault(date, {"date": date, **{k: None for k in METRIC_KEYS}, "exercise_score": None})

    for a in assessments:  # latest completed assessment of a day wins
        p = point(a.created_at.date().isoformat())
        for key in METRIC_KEYS:
            p[key] = int(a.metrics[key]["score"])
    per_day: dict[str, list[int]] = {}
    for s in sessions:
        per_day.setdefault(s.created_at.date().isoformat(), []).append(s.score)
    for date, scores in per_day.items():
        point(date)["exercise_score"] = int(round(sum(scores) / len(scores)))

    # overall_progress: points gained from the first to the most recent exercise score (0-100, never negative).
    overall = max(0, min(100, sessions[-1].score - sessions[0].score)) if len(sessions) >= 2 else 0

    return ProgressOut(
        student_id=student_id,
        overall_progress=overall,
        sessions_completed=len(sessions),
        metrics=[ProgressPointOut(**points[d]) for d in sorted(points)],
        recent_sessions=[
            RecentSessionOut(session_id=s.id, exercise_id=s.exercise_id, target_character=s.target_character,
                             score=s.score, performance_label=s.performance_label, created_at=s.created_at)
            for s in reversed(sessions[-recent_limit:])
        ],
    )

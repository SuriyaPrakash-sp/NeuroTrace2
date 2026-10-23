"""SQLAlchemy ORM models."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.utils import utc_now


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    age: Mapped[int] = mapped_column(Integer)
    grade: Mapped[str] = mapped_column(String(40))
    avatar_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    primary_goals: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    status: Mapped[str] = mapped_column(String(20))  # processing | completed | failed
    sample_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    overall_score: Mapped[int] = mapped_column(Integer)
    analysis_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSON)
    observations: Mapped[list] = mapped_column(JSON, default=list)
    warnings: Mapped[list] = mapped_column(JSON, default=list)
    generator: Mapped[str] = mapped_column(String(20), default="heuristic")  # heuristic | ai | demo | seed | none
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class TherapyPlan(Base):
    __tablename__ = "therapy_plans"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    assessment_id: Mapped[str] = mapped_column(ForeignKey("assessments.id"))
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text)
    primary_focus: Mapped[list] = mapped_column(JSON)
    weeks: Mapped[list] = mapped_column(JSON)
    duration_weeks: Mapped[int] = mapped_column(Integer)
    therapist_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    therapist_review_required: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    generator: Mapped[str] = mapped_column(String(20), default="fallback")  # ai | fallback
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class ExerciseSession(Base):
    __tablename__ = "exercise_sessions"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"), index=True)
    exercise_id: Mapped[str] = mapped_column(String(100))
    target_character: Mapped[str] = mapped_column(String(50))
    score: Mapped[int] = mapped_column(Integer)
    accuracy: Mapped[int] = mapped_column(Integer)
    completion_time_seconds: Mapped[float] = mapped_column(Float)
    path_coverage: Mapped[int] = mapped_column(Integer)
    smoothness: Mapped[int] = mapped_column(Integer)
    deviations: Mapped[int] = mapped_column(Integer)
    performance_label: Mapped[str] = mapped_column(String(40))
    feedback: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

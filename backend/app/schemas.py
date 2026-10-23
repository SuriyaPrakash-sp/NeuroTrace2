"""Pydantic schemas. These mirror shared/api-contract.md (NeuroTrace Shared API Contract v1.0).

Response field names/types must not change without updating the contract first.
"""
import math
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, PlainSerializer, StringConstraints

from app.utils import iso_z

# --------------------------------------------------------------------------- #
# Reusable types
# --------------------------------------------------------------------------- #
UTCDateTime = Annotated[
    datetime,
    PlainSerializer(iso_z, return_type=str, when_used="always"),
    Field(description="ISO 8601 UTC timestamp, e.g. 2026-10-24T08:00:00Z"),
]


def _coerce_score(value):
    """Accept ints/floats/numeric strings; round and clamp to 0-100 (contract section 2)."""
    if isinstance(value, bool) or value is None:
        raise ValueError("must be a number between 0 and 100")
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError as exc:
            raise ValueError("must be a number between 0 and 100") from exc
    if isinstance(value, (int, float)):
        if not math.isfinite(value):
            raise ValueError("must be a finite number between 0 and 100")
        return int(max(0, min(100, math.floor(value + 0.5))))
    raise ValueError("must be a number between 0 and 100")


def _coerce_count(value):
    if isinstance(value, bool) or value is None:
        raise ValueError("must be a non-negative whole number")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("must be a non-negative whole number") from exc
    if not math.isfinite(number) or number < 0:
        raise ValueError("must be a non-negative whole number")
    return int(math.floor(number + 0.5))


def _none_to_list(value):
    return [] if value is None else value


Score = Annotated[int, BeforeValidator(_coerce_score), Field(ge=0, le=100, description="Integer 0-100")]
Count = Annotated[int, BeforeValidator(_coerce_count), Field(ge=0, le=100000)]
ShortId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]

MetricLabel = Literal["Excellent", "Good", "Developing", "Needs attention"]
ExerciseType = Literal["tracing", "letter_formation", "spacing", "copying", "ar_exercise"]
Difficulty = Literal["Beginner", "Intermediate", "Advanced"]


# --------------------------------------------------------------------------- #
# Errors (section 9)
# --------------------------------------------------------------------------- #
class ErrorDetail(BaseModel):
    code: str = Field(examples=["VALIDATION_ERROR"])
    message: str
    details: dict = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail


# --------------------------------------------------------------------------- #
# Health (section 3)
# --------------------------------------------------------------------------- #
class HealthOut(BaseModel):
    status: str = "ok"
    service: str = "neurotrace-api"
    version: str = "1.0.0"


# --------------------------------------------------------------------------- #
# Students (section 4)
# --------------------------------------------------------------------------- #
class StudentCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Aarav Sharma",
                "age": 9,
                "grade": "Grade 4",
                "primary_goals": ["Improve baseline alignment", "Improve letter formation"],
                "notes": "Initial assessment",
            }
        }
    )

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    age: int = Field(ge=1, le=120)
    grade: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
    avatar_url: str | None = Field(default=None, max_length=2048)
    primary_goals: Annotated[
        list[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]],
        BeforeValidator(_none_to_list),
    ] = Field(default_factory=list, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    age: int
    grade: str
    avatar_url: str | None = None
    primary_goals: list[str] = Field(default_factory=list)
    notes: str | None = None
    created_at: UTCDateTime


class StudentListOut(BaseModel):
    items: list[StudentOut]
    total: int


# --------------------------------------------------------------------------- #
# Assessments (section 5)
# --------------------------------------------------------------------------- #
class MetricOut(BaseModel):
    score: int = Field(ge=0, le=100)
    label: MetricLabel
    description: str


class MetricsOut(BaseModel):
    """Exactly the five required keys (section 5.2)."""

    letter_formation: MetricOut
    baseline_alignment: MetricOut
    word_spacing: MetricOut
    letter_size_consistency: MetricOut
    stroke_control: MetricOut


class AssessmentOut(BaseModel):
    assessment_id: str
    student_id: str
    status: Literal["processing", "completed", "failed"]
    sample_url: str | None = None
    overall_score: int = Field(ge=0, le=100)
    analysis_confidence: float | None = Field(default=None, ge=0, le=1)
    metrics: MetricsOut
    observations: list[str]
    warnings: list[str]
    created_at: UTCDateTime


# --------------------------------------------------------------------------- #
# Therapy plans (section 6)
# --------------------------------------------------------------------------- #
class TherapyExerciseOut(BaseModel):
    id: str
    name: str
    type: ExerciseType
    duration_minutes: int = Field(ge=1)
    difficulty: Difficulty
    instructions: str
    target_character: str
    repetitions: int = Field(ge=1)


class PlanWeekOut(BaseModel):
    week: int = Field(ge=1)
    goal: str
    exercises: list[TherapyExerciseOut]


class TherapyPlanRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "student_id": "student_aarav_001",
                "assessment_id": "assessment_001",
                "duration_weeks": 4,
                "therapist_notes": "Prioritize baseline alignment and letter formation.",
            }
        }
    )

    student_id: ShortId
    assessment_id: ShortId | None = Field(
        default=None, description="Defaults to the student's most recent completed assessment."
    )
    duration_weeks: int = Field(default=4, ge=1, le=12)
    therapist_notes: str | None = Field(default=None, max_length=2000)


class TherapyPlanOut(BaseModel):
    plan_id: str
    student_id: str
    assessment_id: str
    title: str
    summary: str
    primary_focus: list[str]
    weeks: list[PlanWeekOut]
    therapist_review_required: bool
    status: str
    created_at: UTCDateTime


# --------------------------------------------------------------------------- #
# Exercise sessions (section 7)
# --------------------------------------------------------------------------- #
class ExerciseSessionCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "student_id": "student_aarav_001",
                "exercise_id": "exercise_trace_line",
                "target_character": "A",
                "score": 84,
                "accuracy": 88,
                "completion_time_seconds": 21,
                "path_coverage": 91,
                "smoothness": 76,
                "deviations": 3,
            }
        }
    )

    student_id: ShortId
    exercise_id: ShortId
    target_character: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
    score: Score
    accuracy: Score
    completion_time_seconds: float = Field(ge=0, le=86400)
    path_coverage: Score
    smoothness: Score
    deviations: Count


class ExerciseSessionOut(BaseModel):
    session_id: str
    student_id: str
    exercise_id: str
    target_character: str
    score: int
    accuracy: int
    completion_time_seconds: float
    path_coverage: int
    smoothness: int
    deviations: int
    performance_label: str
    feedback: list[str]
    created_at: UTCDateTime


# --------------------------------------------------------------------------- #
# Progress (section 8)
# --------------------------------------------------------------------------- #
class ProgressPointOut(BaseModel):
    date: str = Field(description="YYYY-MM-DD (UTC)")
    baseline_alignment: int | None = None
    letter_formation: int | None = None
    word_spacing: int | None = None
    letter_size_consistency: int | None = None
    stroke_control: int | None = None
    exercise_score: int | None = None


class RecentSessionOut(BaseModel):
    session_id: str
    exercise_id: str
    target_character: str
    score: int
    performance_label: str
    created_at: UTCDateTime


class ProgressOut(BaseModel):
    student_id: str
    overall_progress: int
    sessions_completed: int
    metrics: list[ProgressPointOut]
    recent_sessions: list[RecentSessionOut]


# --------------------------------------------------------------------------- #
# Demo seed (extra, non-contract admin route)
# --------------------------------------------------------------------------- #
class SeedOut(BaseModel):
    status: Literal["seeded", "already_seeded", "reseeded"]
    student_id: str
    assessment_id: str | None
    exercise_sessions: int

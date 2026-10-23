"""Handwriting analysis orchestration: validate -> store -> measure -> (optional AI) -> persist.

Order of precedence for results:
  1. DEMO_ANALYSIS=true  -> canonical contract sample scores (flagged in `warnings`)
  2. AI (if configured and its JSON validates)  -> scores/descriptions/observations from the model
  3. Deterministic heuristic measurements (always available)
An AI failure at any point silently falls back to (3); it never fails the request.
"""
import logging
from dataclasses import dataclass, field

from fastapi import UploadFile
from pydantic import BaseModel, Field, StringConstraints, ValidationError
from sqlalchemy.orm import Session
from typing import Annotated

from app.config import get_settings
from app.errors import APIError
from app.models import Assessment, Student
from app.schemas import AssessmentOut, Score
from app.services import demo_data, storage
from app.services.ai_client import complete_json, image_to_b64_jpeg
from app.services.exercise_catalog import FOCUS_NAMES, METRIC_KEYS
from app.services.image_analysis import analyze_image_bytes
from app.services.lookups import next_sequential_id
from app.utils import clamp_score, contains_banned, label_for_score

logger = logging.getLogger("neurotrace")
ALLOWED_SAMPLE_TYPES = {"handwriting_sample"}

DESCRIPTIONS = {
    "letter_formation": {
        "Excellent": "Letter shapes are clear and consistently formed.",
        "Good": "Most letter shapes are clear with only a few inconsistencies.",
        "Developing": "Letter shapes are recognizable but stroke structure varies from letter to letter.",
        "Needs attention": "Several letter shapes show inconsistent stroke structure.",
    },
    "baseline_alignment": {
        "Excellent": "Writing sits steadily on the baseline.",
        "Good": "Most characters sit on the writing line with minor drift.",
        "Developing": "Characters frequently drift above or below the writing line.",
        "Needs attention": "Characters often drift well above or below the writing line.",
    },
    "word_spacing": {
        "Excellent": "Spacing between words is even and easy to read.",
        "Good": "Word spacing is mostly even with a few tight or wide gaps.",
        "Developing": "Spacing is present but inconsistent across words.",
        "Needs attention": "Words are often crowded together or spaced very unevenly.",
    },
    "letter_size_consistency": {
        "Excellent": "Letter height is steady throughout the sample.",
        "Good": "Letter height is mostly steady with minor variation.",
        "Developing": "Letter height varies moderately.",
        "Needs attention": "Letter height varies a lot across the sample.",
    },
    "stroke_control": {
        "Excellent": "Strokes are smooth and continuous.",
        "Good": "Most strokes are continuous with a few visible hesitations.",
        "Developing": "Strokes show frequent changes in pressure or small hesitations.",
        "Needs attention": "Strokes are often uneven or interrupted.",
    },
}

OBSERVATION_TEXT = {
    "letter_formation": "Letter shapes would benefit from guided formation practice.",
    "baseline_alignment": "Characters drift above or below the writing line.",
    "word_spacing": "Word spacing should be reinforced through guided exercises.",
    "letter_size_consistency": "Letter size varies across the sample.",
    "stroke_control": "Stroke control could be supported with slow, continuous tracing.",
}


@dataclass
class Outcome:
    status: str
    metrics: dict
    overall: int
    confidence: float | None
    observations: list[str]
    warnings: list[str] = field(default_factory=list)
    generator: str = "heuristic"


def build_metrics(scores: dict[str, int], descriptions: dict[str, str] | None = None) -> dict:
    out = {}
    for key in METRIC_KEYS:
        score = clamp_score(scores[key])
        label = label_for_score(score)
        out[key] = {
            "score": score,
            "label": label,
            "description": (descriptions or {}).get(key) or DESCRIPTIONS[key][label],
        }
    return out


def observations_for(scores: dict[str, int]) -> list[str]:
    ranked = sorted(METRIC_KEYS, key=lambda m: (scores[m], METRIC_KEYS.index(m)))
    needy = [m for m in ranked if scores[m] < 85]
    if not needy:
        return ["Handwriting looks consistent across all measured areas. Regular practice will help keep it steady."]
    obs = [f"{FOCUS_NAMES[needy[0]]} is the highest-priority area."]
    obs += [OBSERVATION_TEXT[m] for m in needy[1:3]]
    return obs


def _failed(warnings: list[str]) -> Outcome:
    blank = {k: {"score": 0, "label": "Needs attention",
                 "description": "Not available because the sample could not be analyzed."} for k in METRIC_KEYS}
    return Outcome(
        status="failed", metrics=blank, overall=0, confidence=None, generator="none",
        observations=["No observations are available because the sample could not be analyzed."],
        warnings=warnings or ["The sample could not be analyzed. Please upload a clearer image."],
    )


# ----------------------------------------------------------------------------------------------
# Optional AI step (strictly validated; never trusted blindly)
# ----------------------------------------------------------------------------------------------
Short = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=240)]


class _AIMetric(BaseModel):
    score: Score
    description: Short


class _AIAnalysis(BaseModel):
    letter_formation: _AIMetric
    baseline_alignment: _AIMetric
    word_spacing: _AIMetric
    letter_size_consistency: _AIMetric
    stroke_control: _AIMetric
    observations: list[Short] = Field(min_length=1, max_length=6)
    warnings: list[Short] = Field(default_factory=list, max_length=6)
    confidence: float = Field(ge=0, le=1)


AI_SYSTEM = (
    "You are an assistive handwriting-observation tool that supports occupational therapists working "
    "with school-age children. You describe observable handwriting qualities only. You never diagnose, "
    "never name medical or learning conditions, never promise outcomes, and never suggest replacing a "
    "therapist. Use supportive, neutral language. Respond with a single JSON object and nothing else."
)
AI_PROMPT = """Analyze the attached handwriting sample. Return ONLY this JSON structure:
{
  "letter_formation": {"score": <int 0-100>, "description": "<one short sentence>"},
  "baseline_alignment": {"score": <int 0-100>, "description": "<one short sentence>"},
  "word_spacing": {"score": <int 0-100>, "description": "<one short sentence>"},
  "letter_size_consistency": {"score": <int 0-100>, "description": "<one short sentence>"},
  "stroke_control": {"score": <int 0-100>, "description": "<one short sentence>"},
  "observations": ["<2-4 short therapist-facing observations>"],
  "warnings": ["<image-quality caveats, may be empty>"],
  "confidence": <number 0-1>
}
Higher scores mean steadier, clearer handwriting. Be conservative about confidence."""


def _try_ai(data: bytes) -> Outcome | None:
    if not get_settings().ai_configured:
        return None
    try:
        b64, media = image_to_b64_jpeg(data)
        parsed = _AIAnalysis.model_validate(
            complete_json(AI_SYSTEM, AI_PROMPT, image_b64=b64, image_media_type=media, max_tokens=1200)
        )
        texts = [parsed.observations, parsed.warnings] + [[getattr(parsed, k).description] for k in METRIC_KEYS]
        if contains_banned(*[t for group in texts for t in group]):
            raise ValueError("AI text contained language the contract prohibits")
        scores = {k: getattr(parsed, k).score for k in METRIC_KEYS}
        return Outcome(
            status="completed",
            metrics=build_metrics(scores, {k: getattr(parsed, k).description for k in METRIC_KEYS}),
            overall=clamp_score(sum(scores.values()) / len(scores)),
            confidence=round(min(parsed.confidence, 0.95), 2),
            observations=list(parsed.observations),
            warnings=list(parsed.warnings),
            generator="ai",
        )
    except (ValidationError, ValueError, Exception) as exc:  # noqa: BLE001
        logger.warning("AI analysis unavailable or rejected, using deterministic fallback: %s", exc)
        return None


def run_analysis(data: bytes) -> Outcome:
    settings = get_settings()
    heur = analyze_image_bytes(data)
    if not heur.ok:
        return _failed(heur.warnings)

    if settings.demo_analysis:
        scores = {k: v["score"] for k, v in demo_data.CANONICAL_METRICS.items()}
        return Outcome(
            status="completed",
            metrics={k: dict(v) for k, v in demo_data.CANONICAL_METRICS.items()},
            overall=demo_data.CANONICAL_OVERALL,
            confidence=demo_data.CANONICAL_CONFIDENCE,
            observations=list(demo_data.CANONICAL_OBSERVATIONS),
            warnings=["Demo mode: these are canonical sample results, not measured from this image."],
            generator="demo",
        )

    ai = _try_ai(data)
    if ai is not None:
        ai.warnings = heur.warnings + [w for w in ai.warnings if w not in heur.warnings]
        return ai

    return Outcome(
        status="completed",
        metrics=build_metrics(heur.scores),
        overall=clamp_score(sum(heur.scores.values()) / len(heur.scores)),
        confidence=heur.confidence,
        observations=observations_for(heur.scores),
        warnings=heur.warnings,
        generator="heuristic",
    )


# ----------------------------------------------------------------------------------------------
def analyze_upload(db: Session, student: Student, upload: UploadFile, sample_type: str) -> Assessment:
    if sample_type not in ALLOWED_SAMPLE_TYPES:
        raise APIError(
            400, "VALIDATION_ERROR",
            f"sample_type must be one of: {', '.join(sorted(ALLOWED_SAMPLE_TYPES))}.",
            {"sample_type": sample_type, "allowed": sorted(ALLOWED_SAMPLE_TYPES)},
        )
    data, kind = storage.read_and_validate_upload(upload)
    assessment_id = next_sequential_id(db, Assessment, "assessment")
    sample_url = storage.save_sample(data, kind, assessment_id)
    outcome = run_analysis(data)

    row = Assessment(
        id=assessment_id, student_id=student.id, status=outcome.status, sample_url=sample_url,
        original_filename=(upload.filename or None), overall_score=outcome.overall,
        analysis_confidence=outcome.confidence, metrics=outcome.metrics,
        observations=outcome.observations, warnings=outcome.warnings, generator=outcome.generator,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def to_response(row: Assessment) -> AssessmentOut:
    return AssessmentOut(
        assessment_id=row.id, student_id=row.student_id, status=row.status, sample_url=row.sample_url,
        overall_score=row.overall_score, analysis_confidence=row.analysis_confidence,
        metrics=row.metrics, observations=row.observations or [], warnings=row.warnings or [],
        created_at=row.created_at,
    )

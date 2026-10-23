"""Therapy-plan generation: optional AI (strictly validated) with a deterministic fallback."""
import json
import logging

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Assessment, Student, TherapyPlan
from app.schemas import TherapyPlanOut
from app.services.ai_client import complete_json
from app.services.exercise_catalog import BY_METRIC, CATALOG, COMBO, FOCUS_NAMES, METRIC_KEYS
from app.services.lookups import next_sequential_id
from app.utils import contains_banned

logger = logging.getLogger("neurotrace")

# Words in the student's goals / therapist notes that signal a metric the therapist cares about.
KEYWORDS = {
    "baseline_alignment": ("baseline", "alignment"),
    "letter_formation": ("formation", "letter shape"),
    "word_spacing": ("spacing", "space between"),
    "letter_size_consistency": ("letter size", "letter height", "size", "height"),
    "stroke_control": ("stroke", "control", "smooth", "pressure"),
}
STAGE_GOALS = {
    "baseline_alignment": "Recognize and maintain the writing baseline",
    "letter_formation": "Improve letter formation and stroke direction",
    "word_spacing": "Improve spacing between letters and words",
    "letter_size_consistency": "Keep letter heights even and consistent",
    "stroke_control": "Build smooth and steady pen strokes",
}
INTEGRATION_GOAL = "Combine skills in short writing tasks"


def rank_focus(scores: dict[str, int], goals: list[str], notes: str | None, top: int = 3) -> list[str]:
    """Lowest scores first, nudged toward what the therapist/goals explicitly prioritize."""
    goal_text, note_text = " ".join(goals).lower(), (notes or "").lower()

    def priority(metric: str):
        value = float(scores[metric])
        if any(k in goal_text for k in KEYWORDS[metric]):
            value -= 8
        if any(k in note_text for k in KEYWORDS[metric]):
            value -= 8
        return (value, scores[metric], METRIC_KEYS.index(metric))

    return sorted(METRIC_KEYS, key=priority)[:top]


def _tier(week: int, total: int) -> int:
    p = (week - 1) / max(total - 1, 1)
    return 0 if p < 0.34 else 1 if p < 0.67 else 2


def _stage(week: int, total: int) -> int:
    if total >= 2 and week == total:
        return 3  # integration week
    return min(2, int((week - 1) * 4 / total))


def _pick(metric: str, tier: int):
    options = BY_METRIC[metric]
    return options[min(tier, len(options) - 1)]


def _join(items: list[str]) -> str:
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]


def build_fallback_plan(student: Student, focus: list[str], weeks: int) -> dict:
    first_name = student.name.split()[0] if student.name.strip() else "The student"
    plan_weeks, prev_stage = [], None
    for week in range(1, weeks + 1):
        stage, tier = _stage(week, weeks), _tier(week, weeks)
        if stage == 3:
            goal = INTEGRATION_GOAL
            exercises = [_pick(focus[0], tier), _pick(focus[1] if len(focus) > 1 else focus[0], tier), COMBO]
        else:
            metric = focus[min(stage, len(focus) - 1)]
            goal = STAGE_GOALS[metric]
            if stage == prev_stage:
                goal = "Build on last week: " + goal[0].lower() + goal[1:]
            exercises = [_pick(metric, tier)]
            if metric != focus[0]:
                exercises.append(_pick(focus[0], tier))  # keep revisiting the weakest area
        seen, unique = set(), []
        for ex in exercises:
            if ex.id not in seen:
                seen.add(ex.id); unique.append(ex)
        plan_weeks.append({"week": week, "goal": goal, "exercises": [e.as_contract_dict() for e in unique]})
        prev_stage = stage
    names = [FOCUS_NAMES[m] for m in focus]
    return {
        "title": f"{first_name}'s {weeks}-Week Handwriting Control Plan",
        "summary": (f"A progressive {weeks}-week plan focused on {_join([n.lower() for n in names])}, "
                    "moving from guided tracing to short writing tasks. "
                    "Please review and adjust it before assigning."),
        "primary_focus": names,
        "weeks": plan_weeks,
    }


# ----------------------------------------------------------------------------------------------
AI_SYSTEM = (
    "You help occupational therapists draft handwriting-practice plans for school-age children. "
    "The output is a DRAFT for therapist review. Never diagnose, never name medical or learning "
    "conditions, never promise improvement, never replace the therapist. Use supportive, age-appropriate "
    "language. Prioritize the lowest-scoring areas and make the plan progressive week by week. "
    "You may ONLY use exercise ids from the provided catalog. Respond with a single JSON object."
)


def _ai_plan(student: Student, scores: dict[str, int], focus: list[str], weeks: int, notes: str | None) -> dict:
    catalog = [{"id": e.id, "name": e.name, "difficulty": e.difficulty, "type": e.type,
                "practises": FOCUS_NAMES[e.metric]} for e in CATALOG.values()]
    prompt = (
        f"Student: {student.name}, age {student.age}, {student.grade}. Goals: {student.primary_goals}.\n"
        f"Assessment scores (0-100, lower = needs more support): {json.dumps(scores)}\n"
        f"Suggested focus order: {[FOCUS_NAMES[m] for m in focus]}\n"
        f"Therapist notes: {notes or 'none'}\n"
        f"Plan length: exactly {weeks} weeks.\n"
        f"Exercise catalog: {json.dumps(catalog)}\n\n"
        'Return ONLY: {"title": str, "summary": str, "primary_focus": [str], '
        '"weeks": [{"week": 1, "goal": str, "exercise_ids": [str, ...1-4 ids]}]}'
    )
    raw = complete_json(AI_SYSTEM, prompt, max_tokens=2500)

    title, summary = str(raw.get("title", "")).strip(), str(raw.get("summary", "")).strip()
    primary = raw.get("primary_focus")
    ai_weeks = raw.get("weeks")
    if not (1 <= len(title) <= 160 and 1 <= len(summary) <= 800):
        raise ValueError("title/summary missing or too long")
    if not (isinstance(primary, list) and 1 <= len(primary) <= 5 and all(isinstance(x, str) and x.strip() for x in primary)):
        raise ValueError("primary_focus invalid")
    if not (isinstance(ai_weeks, list) and len(ai_weeks) == weeks):
        raise ValueError("wrong number of weeks")

    out_weeks, texts = [], [title, summary, *primary]
    for i, w in enumerate(ai_weeks, start=1):
        goal, ids = str(w.get("goal", "")).strip(), w.get("exercise_ids")
        if w.get("week") != i or not (1 <= len(goal) <= 200):
            raise ValueError("week numbering/goal invalid")
        if not (isinstance(ids, list) and 1 <= len(ids) <= 4 and all(x in CATALOG for x in ids)):
            raise ValueError("unknown or missing exercise ids")
        texts.append(goal)
        out_weeks.append({"week": i, "goal": goal,
                          "exercises": [CATALOG[x].as_contract_dict() for x in dict.fromkeys(ids)]})
    if contains_banned(*texts):
        raise ValueError("AI text contained language the contract prohibits")
    return {"title": title, "summary": summary, "primary_focus": [x.strip() for x in primary], "weeks": out_weeks}


# ----------------------------------------------------------------------------------------------
def generate_plan(db: Session, student: Student, assessment: Assessment, weeks: int,
                  therapist_notes: str | None) -> TherapyPlan:
    scores = {m: int(assessment.metrics[m]["score"]) for m in METRIC_KEYS}
    focus = rank_focus(scores, student.primary_goals or [], therapist_notes)

    body, generator = None, "fallback"
    if get_settings().ai_configured:
        try:
            body, generator = _ai_plan(student, scores, focus, weeks, therapist_notes), "ai"
        except Exception as exc:  # noqa: BLE001 - invalid AI output is rejected, never surfaced
            logger.warning("AI plan unavailable or rejected, using deterministic fallback: %s", exc)
    if body is None:
        body = build_fallback_plan(student, focus, weeks)

    row = TherapyPlan(
        id=next_sequential_id(db, TherapyPlan, "plan"), student_id=student.id, assessment_id=assessment.id,
        title=body["title"], summary=body["summary"], primary_focus=body["primary_focus"], weeks=body["weeks"],
        duration_weeks=weeks, therapist_notes=therapist_notes,
        therapist_review_required=True,  # contract: always true for generated plans
        status="draft", generator=generator,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def to_response(row: TherapyPlan) -> TherapyPlanOut:
    return TherapyPlanOut(
        plan_id=row.id, student_id=row.student_id, assessment_id=row.assessment_id, title=row.title,
        summary=row.summary, primary_focus=row.primary_focus, weeks=row.weeks,
        therapist_review_required=row.therapist_review_required, status=row.status, created_at=row.created_at,
    )

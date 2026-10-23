"""Small shared helpers: time, score clamping, labels, language-safety filter."""
from __future__ import annotations

import math
import re
from datetime import datetime, timezone


def utc_now() -> datetime:
    """Naive UTC datetime at second precision (what we store in SQLite)."""
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def iso_z(dt: datetime) -> str:
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def round_half_up(value: float) -> int:
    return int(math.floor(float(value) + 0.5))


def clamp_score(value: float) -> int:
    """Contract rule: every score is an integer clamped to 0-100."""
    return max(0, min(100, round_half_up(value)))


def label_for_score(score: int) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 55:
        return "Developing"
    return "Needs attention"


def performance_label(score: int) -> str:
    """Contract section 7.2 labels."""
    if score >= 85:
        return "Excellent control"
    if score >= 70:
        return "Good progress"
    if score >= 50:
        return "Developing"
    return "Keep practicing"


# Contract section 13: terms we must not produce unless clinically validated.
_BANNED = re.compile(
    r"diagnos|disorder|dyslex|dysgraph|\badhd\b|autis|guarantee|medical[- ]grade|"
    r"\bcures?d?\b|replac\w*\s+(?:for\s+)?(?:a\s+|the\s+|your\s+)?therapist",
    re.IGNORECASE,
)


def contains_banned(*texts: str) -> bool:
    return any(t and _BANNED.search(t) for t in texts)

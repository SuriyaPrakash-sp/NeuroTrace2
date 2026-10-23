"""Canonical demo content taken from the contract (sections 4.1, 5.2 and 12)."""
from datetime import datetime

AARAV_ID = "student_aarav_001"
AARAV = {
    "id": AARAV_ID,
    "name": "Aarav Sharma",
    "age": 9,
    "grade": "Grade 4",
    "avatar_url": None,
    "primary_goals": ["Improve baseline alignment", "Improve letter formation", "Improve word spacing"],
    "notes": "Shows inconsistent letter height and spacing.",
    "created_at": datetime(2026, 10, 24, 8, 0, 0),
}

CANONICAL_ASSESSMENT_ID = "assessment_001"
CANONICAL_ASSESSMENT_CREATED = datetime(2026, 10, 24, 8, 10, 0)
CANONICAL_CONFIDENCE = 0.86
CANONICAL_OVERALL = 68

# Verbatim from contract section 5.2. NOTE: the contract's labels are not monotonic in score
# (64 -> "Needs attention" but 58 -> "Developing"), so they are stored as given, not recomputed.
# The descriptions for baseline_alignment and stroke_control were cut off in the PDF; the endings
# ("...writing line." / "...visible hesitations.") are the obvious completions.
CANONICAL_METRICS = {
    "letter_formation": {"score": 64, "label": "Needs attention",
                         "description": "Several letter shapes show inconsistent stroke structure."},
    "baseline_alignment": {"score": 58, "label": "Developing",
                           "description": "Characters frequently drift above or below the writing line."},
    "word_spacing": {"score": 72, "label": "Developing",
                     "description": "Spacing is present but inconsistent across words."},
    "letter_size_consistency": {"score": 70, "label": "Developing",
                                "description": "Letter height varies moderately."},
    "stroke_control": {"score": 76, "label": "Good",
                       "description": "Most strokes are continuous with a few visible hesitations."},
}
CANONICAL_OBSERVATIONS = [
    "Baseline alignment is the highest-priority area.",
    "Letter size varies across the sample.",
    "Word spacing should be reinforced through guided exercises.",
]
CANONICAL_SAMPLE_URL = "/uploads/handwriting.png"

# Contract section 12: previous exercise scores, oldest first.
PREVIOUS_EXERCISE_SCORES = [61, 68, 76]
PREVIOUS_SESSION_DATES = [datetime(2026, 10, 21, 10, 0, 0), datetime(2026, 10, 22, 10, 0, 0),
                          datetime(2026, 10, 23, 10, 0, 0)]

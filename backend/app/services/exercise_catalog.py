"""Deterministic exercise library. Therapy plans (AI or fallback) are built from these entries,
so every exercise id handed to the frontend is valid and the wording is vetted/age-appropriate."""
from dataclasses import dataclass

METRIC_KEYS = (
    "letter_formation",
    "baseline_alignment",
    "word_spacing",
    "letter_size_consistency",
    "stroke_control",
)

FOCUS_NAMES = {
    "baseline_alignment": "Baseline alignment",
    "letter_formation": "Letter formation",
    "word_spacing": "Word spacing",
    "letter_size_consistency": "Letter size consistency",
    "stroke_control": "Stroke control",
}


@dataclass(frozen=True)
class Exercise:
    id: str
    name: str
    type: str
    duration_minutes: int
    difficulty: str
    instructions: str
    target_character: str
    repetitions: int
    metric: str  # which handwriting metric this practises

    def as_contract_dict(self) -> dict:
        return {
            "id": self.id, "name": self.name, "type": self.type,
            "duration_minutes": self.duration_minutes, "difficulty": self.difficulty,
            "instructions": self.instructions, "target_character": self.target_character,
            "repetitions": self.repetitions,
        }


_E = Exercise
_ALL = [
    # baseline_alignment (Beginner -> Advanced)
    _E("exercise_trace_line", "Trace the Path", "tracing", 5, "Beginner",
       "Follow the highlighted path using your index finger.", "A", 3, "baseline_alignment"),
    _E("exercise_baseline_rows", "Stay on the Line", "copying", 8, "Intermediate",
       "Copy the letter m along each ruled line. Keep the bottom of every letter touching the line.", "m", 4, "baseline_alignment"),
    _E("exercise_baseline_words", "Sit on the Line", "copying", 10, "Advanced",
       "Write short words so every letter rests neatly on the writing line.", "cat", 4, "baseline_alignment"),
    # letter_formation
    _E("exercise_ar_letter_a", "Air-Trace Capital A", "ar_exercise", 5, "Beginner",
       "Face the camera and trace a big capital A in the air with your index finger.", "A", 3, "letter_formation"),
    _E("exercise_form_stroke_order", "Stroke Order Practice", "letter_formation", 8, "Intermediate",
       "Say the steps out loud as you form each letter: start at the top, then follow the arrows.", "B", 4, "letter_formation"),
    _E("exercise_form_mixed", "Mixed Letter Practice", "letter_formation", 10, "Advanced",
       "Write each capital letter and its small partner side by side, starting every stroke at the right spot.", "Bb", 3, "letter_formation"),
    # word_spacing
    _E("exercise_space_finger", "Finger Space Game", "spacing", 5, "Beginner",
       "Write two words and leave one finger-width gap between them.", "a b", 3, "word_spacing"),
    _E("exercise_space_sentences", "Spacing Sentences", "copying", 8, "Intermediate",
       "Copy the short sentence and keep the gaps between words the same size.", "I can write.", 3, "word_spacing"),
    _E("exercise_space_paragraph", "Neat Sentences", "copying", 10, "Advanced",
       "Copy two sentences with even gaps between every word.", "The sun is bright.", 3, "word_spacing"),
    # letter_size_consistency
    _E("exercise_size_tall_short", "Tall and Short Letters", "letter_formation", 6, "Beginner",
       "Write tall letters up to the top line and short letters up to the middle line.", "lo", 4, "letter_size_consistency"),
    _E("exercise_size_guides", "Between the Lines", "copying", 8, "Intermediate",
       "Copy the letters so each one stays between the guide lines.", "dnh", 4, "letter_size_consistency"),
    _E("exercise_size_words", "Even Size Words", "copying", 10, "Advanced",
       "Write each word so all the small letters are the same height.", "moon", 3, "letter_size_consistency"),
    # stroke_control
    _E("exercise_ar_smooth_line", "Smooth Air Line", "ar_exercise", 5, "Beginner",
       "Slowly draw a smooth wavy line in the air with your index finger.", "S", 3, "stroke_control"),
    _E("exercise_stroke_waves", "Wave Tracing", "tracing", 6, "Intermediate",
       "Trace the waves from left to right without lifting your finger.", "S", 4, "stroke_control"),
    _E("exercise_stroke_continuous", "One Smooth Stroke", "tracing", 8, "Advanced",
       "Trace each shape in one smooth, steady stroke.", "O", 4, "stroke_control"),
    # integration (last week of a plan)
    _E("exercise_combo_sentence", "Short Writing Task", "copying", 12, "Advanced",
       "Write a short sentence using neat letters, even spacing and steady strokes.", "A cat sat.", 2, "letter_formation"),
]

CATALOG: dict[str, Exercise] = {e.id: e for e in _ALL}
COMBO = CATALOG["exercise_combo_sentence"]
BY_METRIC: dict[str, list[Exercise]] = {
    m: [e for e in _ALL if e.metric == m and e is not COMBO] for m in METRIC_KEYS
}

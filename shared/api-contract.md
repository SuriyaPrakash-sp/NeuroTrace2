# NeuroTrace Shared API Contract v1.0

The single source of truth for request / response shapes, HTTP methods, route paths, status codes, and error formats across the NeuroTrace system.

---

## 1. Conventions

### 1.1 Base URL and Transport
- Development backend URL: `http://localhost:8000`
- All contract endpoints (except `/health`) use the `/api` prefix.
- All request bodies are JSON (`application/json`) unless explicitly stated otherwise (e.g. multipart for image upload).
- All successful JSON responses return status `200 OK` or `201 Created`.
- Datetimes are ISO-8601 strings in UTC with a trailing `Z`, formatted as `YYYY-MM-DDTHH:MM:SSZ`.

### 1.2 Error Envelope
When any request fails (status >= 400), the response body is always:

```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation suitable for display.",
    "details": {}
  }
}
```

Standard error codes:
- `VALIDATION_ERROR` (400 or 422)
- `NOT_FOUND` (404)
- `UNSUPPORTED_MEDIA_TYPE` (415)
- `PAYLOAD_TOO_LARGE` (413)
- `AI_SERVICE_UNAVAILABLE` (503)
- `INTERNAL_ERROR` (500)

---

## 2. Health & Meta

### `GET /health`
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "neurotrace-api",
  "version": "1.0.0"
}
```

---

## 3. Students

### `POST /api/students`
- **Body**:
```json
{
  "name": "Aarav Sharma",
  "age": 9,
  "grade": "Grade 4",
  "primary_goals": ["Improve baseline alignment", "Consistent letter sizing"],
  "notes": "Referred by school OT."
}
```
- **Response**: `201 Created`
```json
{
  "id": "student_aarav_001",
  "name": "Aarav Sharma",
  "age": 9,
  "grade": "Grade 4",
  "avatar_url": null,
  "primary_goals": ["Improve baseline alignment", "Consistent letter sizing"],
  "notes": "Referred by school OT.",
  "created_at": "2026-10-24T00:00:00Z"
}
```

### `GET /api/students`
- **Response**: `200 OK`
```json
{
  "items": [ /* array of Student objects */ ],
  "total": 1
}
```

### `GET /api/students/{id}`
- **Response**: `200 OK` with single Student object.

---

## 4. Assessments

### `POST /api/assessments/analyze`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: image file (JPEG, PNG; <= 10MB)
  - `student_id`: string
  - `sample_type`: `"handwriting_sample"`
- **Response**: `200 OK`
```json
{
  "assessment_id": "asm_20261024_001",
  "student_id": "student_aarav_001",
  "status": "completed",
  "sample_url": "/uploads/asm_20261024_001.png",
  "overall_score": 72,
  "analysis_confidence": 0.88,
  "metrics": {
    "letter_formation": { "score": 70, "label": "Developing", "description": "Closed loops inconsistent on o and a." },
    "baseline_alignment": { "score": 64, "label": "Developing", "description": "Words drift downward towards right margin." },
    "word_spacing": { "score": 80, "label": "Good", "description": "Even spacing between words." },
    "letter_size_consistency": { "score": 68, "label": "Developing", "description": "Ascender heights vary." },
    "stroke_control": { "score": 78, "label": "Good", "description": "Firm pencil pressure with minimal jitter." }
  },
  "observations": [
    "Baseline drift becomes pronounced in multi-line writing.",
    "Good pencil grip stability observed."
  ],
  "warnings": [],
  "created_at": "2026-10-24T00:00:00Z"
}
```

---

## 5. Therapy Plans

### `POST /api/therapy-plans/generate`
- **Body**:
```json
{
  "student_id": "student_aarav_001",
  "assessment_id": "asm_20261024_001",
  "duration_weeks": 4,
  "therapist_notes": "Focus on baseline alignment."
}
```
- **Response**: `200 OK`
```json
{
  "plan_id": "plan_20261024_001",
  "student_id": "student_aarav_001",
  "assessment_id": "asm_20261024_001",
  "title": "Targeted Baseline & Graphomotor Alignment",
  "summary": "4-week progressive plan emphasizing spatial tracking and line adherence.",
  "primary_focus": ["Baseline alignment", "Letter formation"],
  "weeks": [
    {
      "week": 1,
      "goal": "Improve baseline awareness with guided tracking",
      "exercises": [
        {
          "id": "trace_a",
          "name": "Guided 'a' Tracing",
          "type": "tracing",
          "duration_minutes": 5,
          "difficulty": "Easy",
          "instructions": "Follow the dotted guidelines without lifting finger.",
          "target_character": "a",
          "repetitions": 5
        }
      ]
    }
  ],
  "therapist_review_required": true,
  "status": "draft",
  "created_at": "2026-10-24T00:00:00Z"
}
```

---

## 6. Exercises & Progress

### `GET /api/exercises/catalog`
Returns list of standard therapy exercises.

### `POST /api/exercises/sessions`
Records completed interactive exercise session telemetry.
- **Body**:
```json
{
  "student_id": "student_aarav_001",
  "exercise_id": "trace_a",
  "target_character": "a",
  "path_coverage": 90,
  "accuracy": 84,
  "smoothness": 78,
  "deviations": 3,
  "completion_time_seconds": 22,
  "score": 84
}
```
- **Response**: `201 Created`

### `GET /api/students/{id}/progress`
- **Response**: `200 OK`
```json
{
  "student_id": "student_aarav_001",
  "overall_progress": 14,
  "sessions_completed": 6,
  "metrics": [
    {
      "date": "2026-10-18",
      "baseline_alignment": 64,
      "letter_formation": 70,
      "word_spacing": 80,
      "letter_size_consistency": 68,
      "stroke_control": 78,
      "exercise_score": 84
    }
  ],
  "recent_sessions": [
    {
      "session_id": "session_001",
      "exercise_id": "trace_a",
      "target_character": "a",
      "score": 84,
      "performance_label": "Good",
      "created_at": "2026-10-24T00:00:00Z"
    }
  ]
}
```

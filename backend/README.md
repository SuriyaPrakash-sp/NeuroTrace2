# NeuroTrace Backend

FastAPI + Pydantic + SQLAlchemy + SQLite implementation of **NeuroTrace Shared API Contract v1.0**.

> NeuroTrace provides AI-assisted handwriting observations and therapy-support recommendations.
> It is not a medical diagnostic tool and does not replace professional therapist judgment.

## Install & run

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # optional; defaults work out of the box
python scripts/seed.py                                 # optional: load demo student Aarav
uvicorn app.main:app --reload --port 8000
```

- API docs (Swagger): http://localhost:8000/docs  ·  ReDoc: `/redoc`  ·  OpenAPI JSON: `/openapi.json`
- Health: http://localhost:8000/health
- Frontend: set `VITE_API_BASE_URL=http://localhost:8000`
- Tests: `python -m pytest -q`

## Database
SQLite file `neurotrace.db` (override with `DATABASE_URL`). Tables are created automatically at startup.
Tables: `students`, `assessments`, `therapy_plans`, `exercise_sessions`. Delete the file to reset everything.
Seeding: `python scripts/seed.py [--reset]` or `POST /api/seed[?reset=true]` (disable with `ENABLE_SEED_ENDPOINT=false`).

## Routes
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{"status":"ok","service":"neurotrace-api","version":"1.0.0"}` |
| POST | `/api/students` | 201 |
| GET | `/api/students`, `/api/students/{id}` | list returns `{items,total}` |
| POST | `/api/assessments/analyze` | multipart: `student_id`, `sample_type`, `file` |
| POST | `/api/therapy-plans/generate` | always `therapist_review_required: true`, `status: "draft"` |
| POST | `/api/exercises/sessions` | |
| GET | `/api/students/{id}/progress` | optional `?recent_limit=5` |
| POST | `/api/seed` | extra, non-contract helper |
| GET | `/uploads/<file>` | static uploaded images |

All errors: `{"error":{"code","message","details"}}` (VALIDATION_ERROR, NOT_FOUND, UPLOAD_ERROR, DATABASE_ERROR, INTERNAL_ERROR).
Analyze / generate responses carry an `X-NeuroTrace-Generator` header (`heuristic|ai|demo`, `ai|fallback`) for debugging;
it is not part of the JSON body.

## How analysis and plans work
- **Analysis** always runs a deterministic, offline image analyzer (Pillow/NumPy/SciPy): lighting flattening,
  component/line/word segmentation, then baseline drift, word-gap evenness, letter-height spread and stroke-width
  uniformity. Blank, tiny, corrupt or low-contrast images return a valid response (`failed`, or `completed` with
  warnings) instead of an error. If `AI_ENABLED=true` a vision model is asked first; its JSON is strictly validated
  and language-filtered, and on *any* problem the heuristic result is used.
- **Plans** are built from a fixed, vetted exercise catalog (`app/services/exercise_catalog.py`), ranked by the lowest
  scores nudged by the student's goals and therapist notes. AI may only choose catalog ids; invalid output is discarded.
- Valid `exercise_id` values for `POST /api/exercises/sessions` (when `STRICT_EXERCISE_IDS=true`) are the ids in the catalog file.
- `DEMO_ANALYSIS=true` makes every valid upload return the contract's canonical sample scores (flagged in `warnings`).

## Layout
```
app/main.py  database.py  models.py  schemas.py  config.py  errors.py  utils.py
app/routers/   health students assessments therapy_plans exercises admin
app/services/  image_analysis ai_client assessment_service therapy_service session_service
               progress_service seed_service exercise_catalog storage lookups demo_data demo_image
scripts/seed.py   tests/   requirements.txt   .env.example
```

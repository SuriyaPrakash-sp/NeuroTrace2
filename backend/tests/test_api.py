"""End-to-end contract tests. Runs the contract's 'definition of done' flow in order."""
import io

import pytest
from PIL import Image

from app.services.demo_image import render_text_sample

METRIC_KEYS = {"letter_formation", "baseline_alignment", "word_spacing", "letter_size_consistency", "stroke_control"}


def png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO(); img.save(buf, "PNG"); return buf.getvalue()


def sample(**kw) -> bytes:
    return png_bytes(render_text_sample(["the quick brown fox jumps", "over the lazy dog again"], **kw))


def upload(client, student_id, data, name="handwriting.png", ctype="image/png", sample_type="handwriting_sample"):
    return client.post("/api/assessments/analyze", data={"student_id": student_id, "sample_type": sample_type},
                       files={"file": (name, data, ctype)})


def assert_error(resp, status, code):
    assert resp.status_code == status, resp.text
    body = resp.json()
    assert set(body) == {"error"} and set(body["error"]) == {"code", "message", "details"}
    assert body["error"]["code"] == code and body["error"]["message"]


# --------------------------------------------------------------------------- basics
def test_health_and_docs(client):
    assert client.get("/health").json() == {"status": "ok", "service": "neurotrace-api", "version": "1.0.0"}
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200


def test_cors_preflight(client):
    r = client.options("/api/students", headers={"Origin": "http://localhost:5173",
                                                 "Access-Control-Request-Method": "POST"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
    r = client.options("/api/students", headers={"Origin": "http://localhost:5199",
                                                 "Access-Control-Request-Method": "POST"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5199"  # any localhost port


# --------------------------------------------------------------------------- students
def test_student_crud_and_validation(client):
    r = client.post("/api/students", json={"name": "Aarav Sharma", "age": 9, "grade": "Grade 4",
                                           "primary_goals": ["Improve baseline alignment"], "notes": "Initial assessment"})
    assert r.status_code == 201
    s = r.json()
    assert set(s) == {"id", "name", "age", "grade", "avatar_url", "primary_goals", "notes", "created_at"}
    assert s["id"] == "student_aarav_001" and s["avatar_url"] is None
    assert s["created_at"].endswith("Z") and len(s["created_at"]) == 20

    s2 = client.post("/api/students", json={"name": "Aarav Verma", "age": 8, "grade": "Grade 3"}).json()
    assert s2["id"] == "student_aarav_002" and s2["primary_goals"] == [] and s2["notes"] is None

    lst = client.get("/api/students").json()
    assert set(lst) == {"items", "total"} and lst["total"] == len(lst["items"]) == 2
    assert client.get(f"/api/students/{s['id']}").json() == s

    assert_error(client.get("/api/students/nope"), 404, "NOT_FOUND")
    bad = client.post("/api/students", json={"name": "  ", "age": "x", "grade": ""})
    assert_error(bad, 422, "VALIDATION_ERROR")
    assert {e["field"] for e in bad.json()["error"]["details"]["errors"]} == {"name", "age", "grade"}
    assert_error(client.post("/api/students", content="{not json", headers={"content-type": "application/json"}),
                 422, "VALIDATION_ERROR")


# --------------------------------------------------------------------------- seed
def test_seed_matches_contract(client):
    # The CRUD test already created student_aarav_001, so reset to get a deterministic state.
    r = client.post("/api/seed?reset=true")
    assert r.json() == {"status": "reseeded", "student_id": "student_aarav_001",
                        "assessment_id": "assessment_001", "exercise_sessions": 3}
    assert client.post("/api/seed").json()["status"] == "already_seeded"

    st = client.get("/api/students/student_aarav_001").json()
    assert st["name"] == "Aarav Sharma" and st["created_at"] == "2026-10-24T08:00:00Z"
    assert st["primary_goals"] == ["Improve baseline alignment", "Improve letter formation", "Improve word spacing"]

    prog = client.get("/api/students/student_aarav_001/progress").json()
    assert prog["sessions_completed"] == 3 and prog["overall_progress"] == 15
    assert [p["exercise_score"] for p in prog["metrics"] if p["exercise_score"] is not None] == [61, 68, 76]
    assert client.get("/uploads/handwriting.png").status_code == 200  # static serving of demo sample


# --------------------------------------------------------------------------- analysis
def test_analyze_response_shape_and_static_serving(client):
    r = upload(client, "student_aarav_001", sample(seed=1))
    assert r.status_code == 200, r.text
    a = r.json()
    assert list(a) == ["assessment_id", "student_id", "status", "sample_url", "overall_score",
                       "analysis_confidence", "metrics", "observations", "warnings", "created_at"]
    assert a["status"] == "completed" and a["student_id"] == "student_aarav_001"
    assert set(a["metrics"]) == METRIC_KEYS
    for m in a["metrics"].values():
        assert list(m) == ["score", "label", "description"]
        assert isinstance(m["score"], int) and 0 <= m["score"] <= 100
        assert m["label"] in {"Excellent", "Good", "Developing", "Needs attention"}
    assert a["overall_score"] == round(sum(m["score"] for m in a["metrics"].values()) / 5)
    assert 0 <= a["analysis_confidence"] <= 1 and a["observations"] and isinstance(a["warnings"], list)
    assert client.get(a["sample_url"]).status_code == 200
    assert r.headers["x-neurotrace-generator"] == "heuristic"


def test_messy_scores_lower_than_tidy(client):
    tidy = upload(client, "student_aarav_001", sample(seed=3)).json()
    messy = upload(client, "student_aarav_001", sample(seed=3, baseline_jitter=0.3, space_jitter=0.9)).json()
    assert messy["metrics"]["baseline_alignment"]["score"] < tidy["metrics"]["baseline_alignment"]["score"]
    assert messy["overall_score"] < tidy["overall_score"]
    assert messy["observations"][0].endswith("is the highest-priority area.")


def test_blank_and_corrupt_images_do_not_crash(client):
    blank = upload(client, "student_aarav_001", png_bytes(Image.new("RGB", (800, 600), "white")))
    assert blank.status_code == 200
    b = blank.json()
    assert b["status"] == "failed" and b["warnings"] and set(b["metrics"]) == METRIC_KEYS
    assert b["analysis_confidence"] is None and b["sample_url"]

    corrupt = upload(client, "student_aarav_001", b"\x89PNG\r\n\x1a\n" + b"garbage" * 20)
    assert corrupt.status_code == 200 and corrupt.json()["status"] == "failed" and corrupt.json()["warnings"]


def test_low_contrast_is_completed_with_warning(client):
    img = render_text_sample(["the quick brown fox jumps", "over the lazy dog again"], seed=4)
    faded = Image.blend(img, Image.new("RGB", img.size, (250, 248, 242)), 0.82)
    r = upload(client, "student_aarav_001", png_bytes(faded)).json()
    assert r["status"] in {"completed", "failed"} and r["warnings"]


def test_upload_validation(client):
    assert_error(upload(client, "student_aarav_001", b"%PDF-1.4 fake", "x.pdf", "application/pdf"), 400, "VALIDATION_ERROR")
    assert_error(upload(client, "student_aarav_001", b"%PDF-1.4 fake", "x.png", "image/png"), 400, "VALIDATION_ERROR")
    assert_error(upload(client, "student_aarav_001", b"", "x.png"), 400, "UPLOAD_ERROR")
    assert_error(upload(client, "student_aarav_001", b"\x89PNG\r\n\x1a\n" + b"0" * (1024 * 1024 + 10)), 413, "UPLOAD_ERROR")
    assert_error(upload(client, "no_such_student", sample()), 404, "NOT_FOUND")
    assert_error(upload(client, "student_aarav_001", sample(), sample_type="selfie"), 400, "VALIDATION_ERROR")
    missing = client.post("/api/assessments/analyze", data={"student_id": "student_aarav_001"})
    assert_error(missing, 422, "VALIDATION_ERROR")


def test_jpeg_accepted(client):
    buf = io.BytesIO(); render_text_sample(["hello there my friend", "writing practice"]).save(buf, "JPEG")
    assert upload(client, "student_aarav_001", buf.getvalue(), "a.JPG", "image/jpeg").status_code == 200


# --------------------------------------------------------------------------- therapy plans
def test_therapy_plan_contract_and_rules(client):
    r = client.post("/api/therapy-plans/generate", json={
        "student_id": "student_aarav_001", "assessment_id": "assessment_001", "duration_weeks": 4,
        "therapist_notes": "Prioritize baseline alignment and letter formation."})
    assert r.status_code == 200, r.text
    p = r.json()
    assert list(p) == ["plan_id", "student_id", "assessment_id", "title", "summary", "primary_focus", "weeks",
                       "therapist_review_required", "status", "created_at"]
    assert p["title"] == "Aarav's 4-Week Handwriting Control Plan"
    assert p["primary_focus"] == ["Baseline alignment", "Letter formation", "Word spacing"]  # contract example
    assert p["therapist_review_required"] is True and p["status"] == "draft"
    assert [w["week"] for w in p["weeks"]] == [1, 2, 3, 4]
    assert p["weeks"][0]["goal"] == "Recognize and maintain the writing baseline"
    assert p["weeks"][0]["exercises"][0] == {
        "id": "exercise_trace_line", "name": "Trace the Path", "type": "tracing", "duration_minutes": 5,
        "difficulty": "Beginner", "instructions": "Follow the highlighted path using your index finger.",
        "target_character": "A", "repetitions": 3}
    assert p["weeks"][3]["goal"] == "Combine skills in short writing tasks"
    assert all(w["exercises"] for w in p["weeks"])
    order = {"Beginner": 0, "Intermediate": 1, "Advanced": 2}
    assert order[p["weeks"][0]["exercises"][0]["difficulty"]] <= order[p["weeks"][3]["exercises"][0]["difficulty"]]
    blob = str(p).lower()
    assert "diagnos" not in blob and "disorder" not in blob


@pytest.mark.parametrize("weeks", [1, 2, 3, 6, 12])
def test_plan_durations(client, weeks):
    p = client.post("/api/therapy-plans/generate", json={"student_id": "student_aarav_001", "duration_weeks": weeks}).json()
    assert [w["week"] for w in p["weeks"]] == list(range(1, weeks + 1))
    assert all(w["exercises"] for w in p["weeks"])


def test_plan_errors(client):
    assert_error(client.post("/api/therapy-plans/generate", json={"student_id": "ghost"}), 404, "NOT_FOUND")
    assert_error(client.post("/api/therapy-plans/generate",
                             json={"student_id": "student_aarav_001", "assessment_id": "nope"}), 404, "NOT_FOUND")
    assert_error(client.post("/api/therapy-plans/generate",
                             json={"student_id": "student_aarav_001", "duration_weeks": 99}), 422, "VALIDATION_ERROR")
    other = client.post("/api/students", json={"name": "Meera", "age": 8, "grade": "Grade 3"}).json()["id"]
    assert_error(client.post("/api/therapy-plans/generate", json={"student_id": other}), 404, "NOT_FOUND")  # no assessment yet
    assert_error(client.post("/api/therapy-plans/generate",
                             json={"student_id": other, "assessment_id": "assessment_001"}), 400, "VALIDATION_ERROR")
    failed = upload(client, "student_aarav_001", png_bytes(Image.new("RGB", (800, 600), "white"))).json()
    assert_error(client.post("/api/therapy-plans/generate",
                             json={"student_id": "student_aarav_001", "assessment_id": failed["assessment_id"]}),
                 400, "VALIDATION_ERROR")


def test_ai_garbage_falls_back(client, monkeypatch):
    """AI enabled but returning junk / raising must never fail the request."""
    from app.config import get_settings
    from app.services import ai_client, assessment_service, therapy_service

    s = get_settings()
    configured = type("S", (), {"__getattr__": lambda self, k: getattr(s, k), "ai_configured": True})()
    monkeypatch.setattr(therapy_service, "get_settings", lambda: configured)
    monkeypatch.setattr(assessment_service, "get_settings", lambda: configured)

    for behaviour in (lambda *a, **k: {"title": "x"},                       # invalid shape
                      lambda *a, **k: (_ for _ in ()).throw(ai_client.AIUnavailable("down")),
                      lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom"))):
        monkeypatch.setattr(therapy_service, "complete_json", behaviour)
        monkeypatch.setattr(assessment_service, "complete_json", behaviour)
        r = client.post("/api/therapy-plans/generate", json={"student_id": "student_aarav_001"})
        assert r.status_code == 200 and r.headers["x-neurotrace-generator"] == "fallback"
        r = upload(client, "student_aarav_001", sample(seed=9))
        assert r.status_code == 200 and r.headers["x-neurotrace-generator"] == "heuristic"

    # A valid-looking AI plan with a banned word and one with a made-up exercise id are rejected.
    bad = {"title": "Plan", "summary": "This will diagnose the issue.", "primary_focus": ["Baseline alignment"],
           "weeks": [{"week": i, "goal": "g", "exercise_ids": ["exercise_trace_line"]} for i in range(1, 5)]}
    monkeypatch.setattr(therapy_service, "complete_json", lambda *a, **k: bad)
    assert client.post("/api/therapy-plans/generate", json={"student_id": "student_aarav_001"}).headers[
        "x-neurotrace-generator"] == "fallback"
    ok = {**bad, "summary": "A supportive four-week plan."}
    monkeypatch.setattr(therapy_service, "complete_json", lambda *a, **k: ok)
    r = client.post("/api/therapy-plans/generate", json={"student_id": "student_aarav_001"})
    assert r.headers["x-neurotrace-generator"] == "ai" and r.json()["therapist_review_required"] is True
    ok["weeks"][0]["exercise_ids"] = ["exercise_made_up"]
    r = client.post("/api/therapy-plans/generate", json={"student_id": "student_aarav_001"})
    assert r.headers["x-neurotrace-generator"] == "fallback"


# --------------------------------------------------------------------------- sessions + progress
SESSION = {"student_id": "student_aarav_001", "exercise_id": "exercise_trace_line", "target_character": "A",
           "score": 84, "accuracy": 88, "completion_time_seconds": 21, "path_coverage": 91, "smoothness": 76,
           "deviations": 3}


def test_session_submission_and_progress(client):
    before = client.get("/api/students/student_aarav_001/progress").json()["sessions_completed"]
    r = client.post("/api/exercises/sessions", json=SESSION)
    assert r.status_code == 200, r.text
    s = r.json()
    assert list(s) == ["session_id", "student_id", "exercise_id", "target_character", "score", "accuracy",
                       "completion_time_seconds", "path_coverage", "smoothness", "deviations",
                       "performance_label", "feedback", "created_at"]
    assert s["performance_label"] == "Good progress" and s["score"] == 84
    assert "You stayed close to the target path." in s["feedback"]
    assert "Try to slow down slightly on diagonal strokes." in s["feedback"]  # 'A' has diagonals

    prog = client.get("/api/students/student_aarav_001/progress").json()
    assert list(prog) == ["student_id", "overall_progress", "sessions_completed", "metrics", "recent_sessions"]
    assert prog["sessions_completed"] == before + 1
    assert prog["recent_sessions"][0]["session_id"] == s["session_id"]
    assert list(prog["recent_sessions"][0]) == ["session_id", "exercise_id", "target_character", "score",
                                                "performance_label", "created_at"]
    point = prog["metrics"][-1]
    assert list(point) == ["date", "baseline_alignment", "letter_formation", "word_spacing",
                           "letter_size_consistency", "stroke_control", "exercise_score"]
    assert prog["metrics"] == sorted(prog["metrics"], key=lambda m: m["date"])
    assert prog["overall_progress"] == 84 - 61  # latest (84) minus first recorded session (61)


@pytest.mark.parametrize("score,label", [(100, "Excellent control"), (85, "Excellent control"), (84, "Good progress"),
                                         (70, "Good progress"), (69, "Developing"), (50, "Developing"),
                                         (49, "Keep practicing"), (0, "Keep practicing")])
def test_performance_labels(client, score, label):
    r = client.post("/api/exercises/sessions", json={**SESSION, "score": score})
    assert r.json()["performance_label"] == label


def test_session_validation_and_clamping(client):
    r = client.post("/api/exercises/sessions", json={**SESSION, "score": 140.6, "accuracy": -4, "smoothness": 76.4,
                                                     "deviations": 2.6})
    assert r.status_code == 200
    j = r.json()
    assert (j["score"], j["accuracy"], j["smoothness"], j["deviations"]) == (100, 0, 76, 3)
    assert_error(client.post("/api/exercises/sessions", json={**SESSION, "student_id": "ghost"}), 404, "NOT_FOUND")
    assert_error(client.post("/api/exercises/sessions", json={**SESSION, "exercise_id": "exercise_unknown"}), 404, "NOT_FOUND")
    assert_error(client.post("/api/exercises/sessions", json={**SESSION, "score": "high"}), 422, "VALIDATION_ERROR")
    assert_error(client.post("/api/exercises/sessions", json={**SESSION, "completion_time_seconds": -1}), 422, "VALIDATION_ERROR")
    bad = {k: v for k, v in SESSION.items() if k != "target_character"}
    assert_error(client.post("/api/exercises/sessions", json=bad), 422, "VALIDATION_ERROR")


def test_progress_empty_and_404(client):
    sid = client.post("/api/students", json={"name": "Zoya", "age": 7, "grade": "Grade 2"}).json()["id"]
    assert client.get(f"/api/students/{sid}/progress").json() == {
        "student_id": sid, "overall_progress": 0, "sessions_completed": 0, "metrics": [], "recent_sessions": []}
    assert_error(client.get("/api/students/ghost/progress"), 404, "NOT_FOUND")


def test_unknown_route_uses_error_shape(client):
    assert_error(client.get("/api/does-not-exist"), 404, "NOT_FOUND")


def test_demo_analysis_mode_returns_canonical_contract_values(client, monkeypatch):
    from app.config import get_settings
    from app.services import assessment_service

    s = get_settings()
    demo = type("S", (), {"__getattr__": lambda self, k: getattr(s, k), "demo_analysis": True})()
    monkeypatch.setattr(assessment_service, "get_settings", lambda: demo)
    a = upload(client, "student_aarav_001", sample(seed=5)).json()
    assert a["overall_score"] == 68 and a["analysis_confidence"] == 0.86
    assert {k: v["score"] for k, v in a["metrics"].items()} == {
        "letter_formation": 64, "baseline_alignment": 58, "word_spacing": 72,
        "letter_size_consistency": 70, "stroke_control": 76}
    assert a["metrics"]["letter_formation"]["label"] == "Needs attention"  # verbatim contract quirk
    assert a["warnings"] and "Demo mode" in a["warnings"][0]

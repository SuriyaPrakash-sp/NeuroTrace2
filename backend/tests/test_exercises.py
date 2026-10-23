def test_exercise_session_submission(client):
    s = client.post("/api/students", json={"name": "Sophia Taylor", "age": 7, "grade": "Grade 2"}).json()
    
    res = client.post("/api/exercises/sessions", json={
        "student_id": s["id"],
        "exercise_id": "trace_a",
        "target_character": "a",
        "path_coverage": 88,
        "accuracy": 82,
        "smoothness": 76,
        "deviations": 3,
        "completion_time_seconds": 25,
        "score": 82
    })
    assert res.status_code == 201
    data = res.json()
    assert data["score"] == 82
    assert "performance_label" in data

def test_create_and_list_students(client):
    res = client.post("/api/students", json={
        "name": "Maya Patel",
        "age": 8,
        "grade": "Grade 3",
        "primary_goals": ["Improve spacing"],
        "notes": "Mild dysgraphia"
    })
    assert res.status_code == 201
    student = res.json()
    assert student["name"] == "Maya Patel"

    list_res = client.get("/api/students")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1

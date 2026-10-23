import io
from PIL import Image

def test_analyze_assessment(client):
    s = client.post("/api/students", json={"name": "Liam Henderson", "age": 8, "grade": "Grade 3"}).json()
    
    img = Image.new("RGB", (200, 100), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    
    res = client.post(
        "/api/assessments/analyze",
        data={"student_id": s["id"], "sample_type": "handwriting_sample"},
        files={"file": ("sample.png", buf.getvalue(), "image/png")}
    )
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "overall_score" in data

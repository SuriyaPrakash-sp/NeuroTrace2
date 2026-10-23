import io
from PIL import Image, ImageDraw, ImageFont

def test_generate_therapy_plan(client):
    s = client.post("/api/students", json={"name": "Noah Chen", "age": 9, "grade": "Grade 4"}).json()
    img = Image.new("RGB", (700, 220), color="white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 42)
    except OSError:
        try:
            font = ImageFont.truetype("arial.ttf", 42)
        except OSError:
            font = ImageFont.load_default()

    draw.text((25, 25), "Aarav writes neatly", fill="black", font=font)
    draw.text((25, 105), "The cat sat here", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    
    asm = client.post(
        "/api/assessments/analyze",
        data={"student_id": s["id"], "sample_type": "handwriting_sample"},
        files={"file": ("sample.png", buf.getvalue(), "image/png")}
    ).json()

    res = client.post("/api/therapy-plans/generate", json={
        "student_id": s["id"],
        "assessment_id": asm["assessment_id"],
        "duration_weeks": 4
    })
    assert res.status_code == 200
    plan = res.json()
    assert plan["student_id"] == s["id"]
    assert len(plan["weeks"]) == 4

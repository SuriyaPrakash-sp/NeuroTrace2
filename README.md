# NeuroTrace 2.0

An AI-assisted platform for occupational therapists and educators to evaluate pediatric handwriting samples, synthesize personalized therapy plans, and guide interactive motor rehabilitation exercises.

---

## 🏗️ Monorepo Structure

```text
NeuroTrace2/
├── frontend/       # Vite + React + TypeScript + Tailwind CSS UI
├── backend/        # FastAPI + SQLite + SQLAlchemy + OpenCV / AI Analysis
├── shared/         # Shared API specifications (api-contract.md)
└── docker-compose.yml
```

---

## ⚡ Quick Start

### Backend
```bash
cd backend
py -m venv venv
# Windows
.\\venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API docs: `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Development web app: `http://localhost:5173`

---

## 🧪 Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm run build
```

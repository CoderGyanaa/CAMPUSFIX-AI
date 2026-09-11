# CampusFix AI — Campus Sustainability Platform

Tagline: *"See It. Report It. Fix It. Make Campus Better."*

An AI-powered campus sustainability operations and community engagement platform supporting **SDG 11 (Sustainable Cities and Communities)**, **SDG 6 (Clean Water)**, **SDG 7 (Clean Energy)**, **SDG 12 (Responsible Consumption)**, and **SDG 13 (Climate Action)**.

---

## Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide Icons, Leaflet
- **Backend**: Python FastAPI, Pydantic v2, SQLAlchemy, Pytest
- **Database**: PostgreSQL / Supabase
- **AI**: Google Gemini API via server-side `google-genai` SDK
- **Maps**: Google Maps Platform / Leaflet Fallback

---

## Quick Start (Development)

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run lint
npm run build
npm run dev
```

---

## Security Guidelines
- All private credentials (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, database passwords) exist **ONLY** in server-side backend environment variables.
- Client-side code (`frontend/`) contains only public environment variables.

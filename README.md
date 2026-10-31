# Chilika Institute of Technology (CIT) — Campus Scheduling & Venue Management

Built for Crunch Week Hackathon. A high-performance, clash-free academic timetable and venue allocation platform for CIT. Powered by Google OR-Tools CP-SAT with sub-second constraint resolution, stability-minimized disruption recovery, deterministic-guarded AI assistant, and institutional RBAC.

---

## 1. Architecture Overview

```mermaid
flowchart TD
    UI["Frontend (React / Vite / Clean Minimalist Grid)"]
    API["FastAPI Backend (backend/app/main.py)"]
    DB[("DBMS: SQLite / PostgreSQL Supabase")]
    
    subgraph Engine["Deterministic Optimization Engine"]
        CP["Google OR-Tools CP-SAT Solver"]
        VAL["Mirrored Python Rule Validator"]
        BOOK["Priority Booking Engine"]
    end
    
    subgraph AI["AI Layer (Guarded)"]
        GEM["Gemini 2.5 Flash / Fallback NLP"]
        SCHEMA["Pydantic Structured Output"]
    end
    
    UI -->|REST / JWT / Bearer| API
    API -->|ORM Models| DB
    API -->|Prompt Text| AI
    AI -->|Draft JSON| VAL
    VAL -->|Verified Constraint State| API
    API -->|Solve / Re-schedule| Engine
    Engine -->|schedule.json / Diff| API
    API -->|Grid Data & Decision Logs| UI
```

---

## 2. Tech Stack

- **Optimization & Constraint Solver:** Google OR-Tools CP-SAT (`ortools.sat.python.cp_model`)
- **Backend API:** Python 3.10+, FastAPI, Uvicorn, Pydantic v2
- **Database & ORM:** SQLAlchemy 2.0 (Zero-config SQLite for local dev, PostgreSQL / Supabase for production)
- **Natural Language Parsing:** Google Gemini API (`gemini-2.5-flash`) with offline rule-based fallback
- **Authentication & Security:** JWT tokens, PBKDF2 / Bcrypt hashing, strict institutional RBAC
- **Validation:** Official `validator.py` suite (Zero hard violations achieved)

---

## 3. Official Results against Validator

| Benchmark Metric | Official Validator Result | Evaluation Status |
| :--- | :--- | :--- |
| **`schedule.json` Hard Violations** | **0** (`{}`) | **25 / 25 Marks** |
| **`schedule.json` Soft Penalty** | **3** (`S1: 0, S2: 0, S3: 0, S4: 3, S5: 0, S6: 0`) | Top-Tier Optimization |
| **Spectra Fest Booking Score** | **63.0 / 70** (20 Approved, 3 Alternatives, 2 Rejected) | **0 Priority Inversions** |
| **Midsem Exams Hard Violations** | **0** | All 41 exams scheduled |
| **Exam Soft Penalty** | **0** | No students have 2 exams on the same day |
| **`schedule_after.json` Hard Violations** | **0** | **Full 6/6 Marks** |
| **Disruption Stability** | **17 moved** (1 time changed, 16 room-only) | **Theoretical Minimum** (all 17 were directly affected) |

---

## 4. Google Gemini API Key Placement

To enable live Google Gemini parsing for plain English / Hinglish booking prompts:
1. Obtain a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create or open the `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_actual_gemini_key_here
   ```
> [!NOTE]
> Setting `GEMINI_API_KEY` is completely optional. If left blank or not set, the platform uses its deterministic regex and rule-based parser with 0 external network dependencies.

---

## 5. Setup & Running Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ (for frontend)

### Backend Setup
1. Clone the repository and navigate to root:
   ```bash
   git clone https://github.com/ArnavVivek13/Campus-Manager.git
   cd Zephyr
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run automated tests:
   ```bash
   python -m pytest backend/tests/test_api.py -v
   ```
4. Launch the FastAPI backend:
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   Interactive Swagger docs: `http://localhost:8000/docs`.

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Web interface available at: `http://localhost:8080` (or `http://localhost:3000`).

---

## 6. Access Control & Demo Credentials

To prevent unauthorized registrations ("randos"), public self-registration is strictly disabled. Only accounts provisioned by the Administrator can sign in.

### Default Administrator Account
- **Email:** `admin@cit.edu`
- **Password:** `Admin@123`
- **Role:** `ADMIN` (Dean / Academic Operations)

### Provisioning Accounts (User Management)
Once logged in as Admin, navigate to the **User Management** tab (`tabIndex: 5`):
1. **Single Account Provisioning:** Enter email, name, role (`ADMIN`, `FACULTY`, `CLUB_LEAD`, `STUDENT`), department, and password.
2. **Batch Import:** Paste multiple lines:
   ```text
   email, full_name, role, password, department
   ```
   Or click **"Load Sample Roster Template"** and press **"Import Accounts"** to provision standard test users in 1 click:
   - `faculty@cit.edu` / `Faculty@123` (Dr. Arvind Rao)
   - `club@cit.edu` / `Club@123` (Aarav Mehta · SAC)
   - `student@cit.edu` / `Student@123` (Rohan Sharma · Year 2)

---

## 7. Data Lifecycle: Empty Initial State, Restore & Clear

1. **Clean Empty Initial State:** By default, operational timetable sessions, exams, and bookings start empty.
2. **Restore Baseline (`POST /api/admin/restore-baseline`):** Click **"Restore Baseline"** in the sidebar to populate the complete CIT semester dataset, exams, and fest bookings.
3. **Load Custom Dataset (`POST /api/admin/load-dataset`):** Admins can upload any CrunchWeek-compliant JSON file. The backend validates and solves clash-free timetable allocations in real time.
4. **Clear Data (`POST /api/admin/clear-data`):** Clears all timetable sessions, exams, bookings, and disruption logs from memory and database tables, leaving only authorized users.
5. **Export Schedule (`GET /api/export/schedule`):** Click **"Export schedule.json"** to download the official JSON conforming to the CrunchWeek evaluation schema.

---

## 8. Deployment: Vercel + Supabase Guide

This repository is ready to be deployed without Docker:

### 1. Database (Supabase PostgreSQL)
1. Create a project at [supabase.com](https://supabase.com).
2. In Project Settings -> Database, copy the **URI Connection string** (Transaction pooler or direct):
   ```text
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
3. Set this as `DATABASE_URL` in your environment. The backend automatically switches from SQLite to PostgreSQL with connection pooling.

### 2. Frontend (Vercel)
1. Push this repo to GitHub and import the project on [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Set Framework Preset to **Vite**.
4. Set Environment Variable: `VITE_API_URL=https://your-backend-api-url.com`.
5. Deploy! Vercel handles SPA routing via `frontend/vercel.json`.

### 3. Backend (Render / Railway / Vercel Serverless)
- **Recommended (Render/Railway):** Connect repo, set build command `pip install -r requirements.txt`, start command `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`, and set `DATABASE_URL` (Supabase) + `JWT_SECRET_KEY`.
- **Vercel Serverless:** The repository includes `api/index.py` enabling serverless FastAPI deployment on Vercel.

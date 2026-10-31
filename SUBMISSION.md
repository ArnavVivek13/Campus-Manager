# Zephyr Campus Scheduler — Hackathon Submission Guide

**Project Name:** Zephyr — CIT Campus Scheduling & Venue Management Platform  
**Target Event:** Crunch Week / Google APIs Hackathon (PS Submission)  
**Repository:** [https://github.com/ArnavVivek13/Campus-Manager](https://github.com/ArnavVivek13/Campus-Manager)  
**License:** MIT  

---

## 1. Problem Statement & Solution Summary

Chilika Institute of Technology (CIT) faces complex operational scheduling challenges across three demanding phases:
1. **Teaching Timetable:** Scheduling courses across 3 years of students, multiple classrooms, labs, and faculty with zero clashes, lunch break integrity, and compact workdays.
2. **Spectra Fest (Week 7):** Handling intense club venue booking requests with priority scoring, equipment matching, and zero inversions.
3. **Midsem Exams:** Scheduling 41 examinations across 6 days with no two exams on the same day for any student and balanced seating.
4. **Real-Time Disruption Handling:** Recovering from sudden room closures (e.g. LAB-1 shutdown) while minimizing moves and schedule volatility.

### How Zephyr Solves This:
- **Optimization Core:** Built on Google OR-Tools CP-SAT solver, achieving **0 hard violations (25/25 marks)** and theoretical minimum moves during disruptions (17 moved, only 1 time-shifted).
- **Institutional Access & RBAC:** Enforces strict role-based access control. Public self-signup is disabled to prevent unauthorized access. The Administrator can add single users or batch-import user rosters.
- **Dynamic Semester Timetable:** Distinct normal teaching weeks (Weeks 1–6, 9–16), Spectra Fest (Week 7), and Midsem Exams (Week 8) with dynamic dates.
- **Live IST Clock Indicator:** Real-time red indicator line tracking active classes on the timetable grid according to IST timezone.
- **AI Booking Assistant:** Parses English/Hinglish requests via Google Gemini 2.5 Flash, backed by deterministic rule-based fallback when offline.
- **Data Lifecycle Controls:** Clean empty initial state, 1-click baseline restoration, dataset JSON upload & solve, full clear-data wipe, and direct `schedule.json` export.

---

## 2. Evaluation & Demo Credentials

Public registration is disabled to prevent unauthorized account creation. Evaluators can sign in using the seeded default administrator account:

| Account | Email | Password | Role | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator (Dean)** | `admin@cit.edu` | `Admin@123` | `ADMIN` | Full control: Timetable, Fest, Exams, Disruption Studio, User Management, Dataset Load/Export/Clear. |

*Note: On the login screen, clicking the **"Fill Default Admin"** button instantly populates these credentials for quick evaluation.*

### Provisioning Other Test Users (Faculty, Club, Student)
1. Sign in as `admin@cit.edu`.
2. Click the **User Management** tab in the sidebar.
3. Click **"Batch Import Users"** -> **"Load Sample Roster Template"** -> **"Import Accounts"**.
4. This instantly provisions:
   - `faculty@cit.edu` / `Faculty@123` (Faculty role)
   - `club@cit.edu` / `Club@123` (Club Representative role)
   - `student@cit.edu` / `Student@123` (Student role)

---

## 3. Official Evaluation Checklist & Verification

| Requirement / Test Case | Zephyr Implementation | Status |
| :--- | :--- | :--- |
| **Initial Empty State** | Timetable, bookings, and exams start empty until dataset is loaded or baseline restored. | ✅ Complete |
| **Admin Restore Baseline** | `POST /api/admin/restore-baseline` restores full starter pack dataset and solves timetable. | ✅ Verified |
| **Admin Load Dataset** | `POST /api/admin/load-dataset` validates JSON and re-solves clash-free schedule with CP-SAT. | ✅ Verified |
| **Admin Clear Data** | `POST /api/admin/clear-data` clears all operational records from database and memory. | ✅ Verified |
| **Export `schedule.json`** | `GET /api/export/schedule` exports official JSON conforming to starter pack schema with attachment header. | ✅ Verified |
| **User Access Control** | Public signup disabled; admin can add single or batch roster lists with roles. | ✅ Verified |
| **Automated Tests** | 6 Pytest unit tests verifying routes, RBAC, export, and user management (`pytest backend/tests/test_api.py`). | ✅ 100% Passed |
| **CI / CD Pipeline** | GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, tests, and Vite build on push/PR. | ✅ Configured |

---

## 4. Deployment Instructions (Vercel + Supabase)

### Database: Supabase (PostgreSQL)
1. Create a Supabase project and get the database connection URI:
   ```text
   postgresql://postgres.[id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
2. Set `DATABASE_URL` in backend environment variables. The SQLAlchemy engine auto-detects PostgreSQL, adds pool pinging, and creates all tables on launch.

### Frontend: Vercel
1. Link GitHub repository on Vercel.
2. Select Root Directory: `frontend`.
3. Set Framework: `Vite`.
4. Set Environment Variable: `VITE_API_URL=https://<your-backend-api-url>`.
5. Deploy. Routing is automatically handled by `frontend/vercel.json`.

### Backend: Render / Railway or Vercel Serverless
- **Render / Railway (Recommended):** Build command `pip install -r requirements.txt`, start command `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.
- **Vercel Serverless:** The repository includes `api/index.py` configured for Vercel Python serverless execution.

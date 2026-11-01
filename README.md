# Chilika Institute of Technology (CIT) — Campus Scheduling & Venue Management Platform

Built for the **Crunch Week Hackathon**. A deterministic, clash-free academic timetable, exam scheduler, fest venue allocation, and disruption recovery platform for CIT. Powered by **Google OR-Tools CP-SAT** with mathematical constraint proofs, stability-minimized disruption recovery, deterministic-guarded AI natural language booking, and institutional role-based access control (RBAC).

---

## 🌐 Live Deployed Application & Quick Links

| Component | Target URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [https://campus-manager-frontend.vercel.app](https://campus-manager-frontend.vercel.app) | Live interactive UI deployed on Vercel |
| **Backend REST API** | [https://campus-manager-api.onrender.com](https://campus-manager-api.onrender.com) | Live FastAPI backend service deployed on Render |
| **Interactive API Docs** | [https://campus-manager-api.onrender.com/docs](https://campus-manager-api.onrender.com/docs) | Interactive Swagger OpenAPI documentation |
| **GitHub Repository** | [https://github.com/ArnavVivek13/Campus-Manager](https://github.com/ArnavVivek13/Campus-Manager) | Source code, test suites, and CI/CD workflows |

> [!TIP]
> **Connecting Custom or Local Backend:**  
> The web interface includes an integrated client-side endpoint selector. If testing against a local backend or custom instance, click **"Configure Endpoint"** on the login screen or set `localStorage.setItem('custom_api_url', 'http://127.0.0.1:8000')`.

---

## 🔑 Quick Demo Credentials

Public self-registration is guarded by institutional administrator approval to prevent unauthorized access. You can sign in immediately using any of the following pre-provisioned demo accounts:

| Role | Email | Password | Granted Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Administrator (Dean)** | `admin@cit.edu` | `Admin@123` | **Full Platform Authority**: Clear data, restore baseline, upload datasets, approve bookings, commit disruptions, manage users, state rollbacks. |
| **Faculty Member** | `faculty@cit.edu` | `Faculty@123` | Timetable inspection, personal schedule filter, venue booking requests. |
| **Club Lead (SAC)** | `club@cit.edu` | `Club@123` | AI Booking Assistant, Spectra Fest venue requests, fest schedule check. |
| **Student** | `student@cit.edu` | `Student@123` | Timetable matrix viewing, exam schedule check, festival schedule. |

*(On the login screen, clicking any of the **"Quick Demo Sign In"** cards automatically populates these credentials).*

---

## 1. Architecture Overview

```mermaid
flowchart TD
    UI["Frontend (React 19 / Vite / Clean Minimalist Matrix)"]
    API["FastAPI Backend (backend/app/main.py)"]
    DB[("DBMS: SQLite (Dev) / PostgreSQL Supabase (Prod)")]
    
    subgraph Engine["Deterministic Optimization Core"]
        CP["Google OR-Tools CP-SAT Solver"]
        VAL["Mirrored Python Rule Validator"]
        BOOK["Priority Booking Engine"]
    end
    
    subgraph AI["AI Layer (Strictly Guarded)"]
        GEM["Gemini 2.5 Flash / Offline Rule Parser"]
        SCHEMA["Pydantic Structured Output Validation"]
    end
    
    UI -->|REST / JWT Bearer / Role Checks| API
    API -->|SQLAlchemy 2.0 ORM| DB
    API -->|Natural Language Prompt| AI
    AI -->|Draft Structured JSON| VAL
    VAL -->|Deterministic Conflict Trace| API
    API -->|Solve / Re-schedule Jobs| Engine
    Engine -->|schedule.json / Disruption Diff| API
    API -->|Matrix Data & Decision Audit Trail| UI
```

---

## 2. Why Things Are The Way They Are (Design Decisions & Rationales)

### 2.1. Why Google OR-Tools CP-SAT Instead of Heuristic/Greedy Algorithms?
- **Mathematical Clash-Free Guarantee:** Timetable scheduling is an NP-hard multidimensional assignment problem with 14 strict hard constraints (H1–H14) and 6 soft optimization goals (S1–S6). Greedy algorithms and genetic heuristics frequently get trapped in local optima, resulting in unresolved professor clashes or room overlaps.
- **CP-SAT Exact Modeling:** We model room allocations, time slots, elective baskets, and professor availability as integer decision variables. OR-Tools leverages Boolean Satisfiability (SAT) propagation, conflict-driven clause learning (CDCL), and linear relaxation to mathematically prove constraint satisfaction with **0 hard violations**.

### 2.2. Why Zero LLM in Schedule Validation (Guarded AI Architecture)?
- **Hackathon Rule Compliance:** *“If your validity checks depend on an LLM, you get 0 for scheduling correctness.”*
- **Strict Separation of Concerns:** Large language models hallucinate edge-case numbers and slot boundaries. In Zephyr:
  1. The LLM (`gemini-2.5-flash`) is **strictly confined** to translating free-form Hinglish/English text (e.g. *“seminar hall kal shaam 6 baje, 100 log, mic chahiye”*) into a strictly typed Pydantic proposal.
  2. The proposal is evaluated against the live timetable and database bookings by **pure Python code**.
  3. If Gemini is unavailable, offline, or lacks an API key, an internal regex/rule-based parser seamlessly takes over with zero downtime.

### 2.3. Why Disruption Repair Prefers Soft Margin Penalties Over Mass Rescheduling
- When a disruption occurs (e.g., room closure or faculty leave), naive re-solvers shift dozens of unaffected courses to different days, creating campus-wide disruption for hundreds of students and faculty members.
- **CrunchWeek Philosophy:** Hard constraints (H1–H14) are non-negotiable (must remain 0). Soft constraints (S1–S6) are designed as elastic penalty buffers.
- Zephyr’s disruption engine prioritizes **schedule stability** above all else: it absorbs disruptions by moving into soft margin buffers (e.g., relocating to an adjacent room with a small capacity delta or a 1-period gap) rather than cascading moves across unrelated sessions. Over 95% of the campus timetable remains completely untouched.

### 2.4. Why Dual-Engine Database Architecture & Auto-Restore on Startup
- **Local Dev vs Cloud Production:** Uses zero-config SQLite (`campus.db`) locally, and PostgreSQL (Supabase/Neon) in production with connection pooling (`pool_pre_ping=True`, `pool_recycle=300`).
- **Resilience Against Container Redeployment:** Ephemeral cloud hosts (Render/Koyeb) rebuild containers from Git checkout on every deploy, wiping local disk files. Zephyr stores active dataset versions (`DatasetState`) and schedules (`ScheduleVersion`) in the DBMS. On startup, `init_startup_state()` queries the database and immediately restores the active timetable so server reboots never erase campus data.

### 2.5. Why Strict Role-Based Access Control (Admin-Only Clear, Restore & Rollback)
- Operations like **Clear Data**, **Restore Baseline**, **Commit Disruption**, and **Rollback Snapshot** alter the master institution timetable.
- If accessible to unauthenticated callers or students, any user could trigger denial-of-service. These endpoints are strictly protected by `Depends(require_role(RoleEnum.ADMIN))`. Non-admin accounts attempting access receive an immediate `403 Forbidden`, and controls are conditionally hidden in the UI.

---

## 3. Why Computation Takes Time (Performance & Solver Complexity)

During dataset solving or disruption re-optimization, you may notice computation takes several seconds. Here is the mathematical and infrastructure reality behind it:

### 3.1. NP-Hard Combinatorial Complexity
The baseline CIT dataset contains:
- **150+ course sessions** across 3 distinct student years.
- **12 daily periods across 5 calendar days** (60 possible time windows per session).
- **Multiple room types** (auditorium, lecture halls, computer labs, seminar halls) with non-uniform capacities and equipment.
- **Simultaneous parallel elective baskets** (e.g., CS201, CS202, CS203 must run concurrently without faculty conflict).
- **Laboratory blocks** requiring 2 to 3 contiguous periods that cannot cross lunch breaks.

The theoretical search space exceeds $O(M^{N \times T}) \approx 10^{300}+$ states. The solver must prune billions of invalid branches via domain propagation before finding a proven clash-free assignment.

### 3.2. Disruption Pareto Multi-Objective Formulation
When re-solving after a disruption, the solver does not just find *any* valid timetable. It minimizes a weighted multi-objective function:

$$\min \left( W_{\text{time}} \cdot \sum \Delta \text{Time} + W_{\text{room}} \cdot \sum \Delta \text{Room} + \sum \text{SoftPenalties} \right)$$

where $W_{\text{time}} = 100,000$ and $W_{\text{room}} = 1,000$.  
To guarantee minimal displacement, CP-SAT must search across multiple candidate solutions and prove that no alternative placement with fewer moves exists.

### 3.3. Cloud Infrastructure Constraints (Render Free Tier: 0.1 vCPU)
- **Local Workstation (8–16 threads):** CP-SAT parallel search finds optimal solutions in **2 to 5 seconds**.
- **Free Cloud Containers (Render / Koyeb):** Free tier services run on **shared micro-instances throttled to ~0.1 vCPU** with strict CPU quotas. Spawning 8 or 16 parallel search worker threads causes severe thread contention and OOM container termination.
- **Engineering Countermeasures Implemented in Zephyr:**
  1. **Single-Worker Constraint (`num_workers=1`):** Limits CP-SAT to 1 dedicated search thread on cloud deployments, eliminating thread thrashing and memory spikes.
  2. **Frontend Polling & 502 Tolerance:** Implemented a resilient polling loop (8–10s intervals) with retry tolerance (up to 5 consecutive network or 502 blips tolerated before failing) so users on free-tier instances experience smooth progress without crashes.

---

## 4. Official Results against Validator

Every schedule produced by Zephyr is strictly verified against the official `CrunchWeek_StarterPack/validator.py` suite:

| Benchmark Metric | Official Validator Result | Evaluation Status |
| :--- | :--- | :--- |
| **`schedule.json` Hard Violations** | **0** (`{}`) | **25 / 25 Marks** |
| **`schedule.json` Soft Penalty** | **3** (`S1: 0, S2: 0, S3: 0, S4: 3, S5: 0, S6: 0`) | Top-Tier Optimization |
| **Spectra Fest Booking Score** | **65.5 / 70** (21 Approved, 2 Alternatives, 2 Rejected) | **0 Priority Inversions** |
| **Midsem Exams Hard Violations** | **0** | All 41 exams scheduled |
| **Exam Soft Penalty** | **0** | 0 students have 2 exams on the same day |
| **`schedule_after.json` Hard Violations** | **0** | **Full 6 / 6 Marks** |
| **Disruption Stability** | **13 moved** (1 time changed, 12 room-only) | Minimal perturbation achieved |

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
3. Run the automated test suite:
   ```bash
   python -m pytest backend/tests/test_api.py backend/test_auth_and_db.py -v
   ```
4. Launch the FastAPI backend:
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   Interactive Swagger docs available at: `http://localhost:8000/docs`.

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open the web interface at `http://localhost:8080` (or `http://localhost:3000`).

---

## 6. Data Lifecycle: Empty Initial State, Restore & Clear

1. **Clean Empty Initial State:** By default, operational timetable sessions, exams, and bookings start empty.
2. **Restore Baseline (`POST /api/admin/restore-baseline`):** Click **"Restore Baseline"** in the sidebar (Admin only) to populate the complete CIT semester dataset, exams, and fest bookings.
3. **Load Custom Dataset (`POST /api/admin/load-dataset`):** Admins can upload any CrunchWeek-compliant JSON file. The backend validates and solves clash-free timetable allocations in real time.
4. **Disruption Resolution Studio:** Upload custom disruption JSON files (room closures, faculty leave, added sessions) to compute minimal-displacement repair moves.
5. **Clear Data (`POST /api/admin/clear-data`):** Clears all timetable sessions, exams, bookings, and disruption logs from memory and database tables, leaving authorized users intact.
6. **Export Schedule (`GET /api/export/schedule`):** Click **"Export schedule.json"** to download the official JSON conforming to the CrunchWeek evaluation schema.

---

## 7. Production Deployment (Vercel + Render + Supabase)

### 1. Database (Supabase PostgreSQL)
1. Create a free project at [supabase.com](https://supabase.com).
2. Under **Project Settings $\rightarrow$ Database**, copy the **URI Connection string**:
   ```text
   postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
   ```
3. Set this as `DATABASE_URL` in your backend environment variables.

### 2. Backend (Render / Railway)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:**
  - `DATABASE_URL`: Your Supabase connection string.
  - `JWT_SECRET_KEY`: A secure 32+ character string.
  - `GEMINI_API_KEY`: *(Optional)* Your Google AI Studio API key.

### 3. Frontend (Vercel)
- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Environment Variable:** `VITE_API_URL=https://campus-manager-api.onrender.com`
- Routing is pre-configured via `frontend/vercel.json`.

---

## 8. License & Acknowledgements

Developed by **Team Zephyr** for the Crunch Week Hackathon.  
Distributed under the **MIT License**. Reference implementation benchmarked against official `CrunchWeek_StarterPack` standards.

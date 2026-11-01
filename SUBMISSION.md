# Zephyr Campus Scheduler — Hackathon Submission Guide

**Project Name:** Zephyr — CIT Campus Scheduling & Venue Management Platform  
**Target Event:** Crunch Week / Google APIs Hackathon  
**Repository:** [https://github.com/ArnavVivek13/Campus-Manager](https://github.com/ArnavVivek13/Campus-Manager)  
**License:** MIT  

---

## 🌐 Live Deployed Application & Evaluation Endpoints

| Target Component | Deployment URL | Description |
| :--- | :--- | :--- |
| **Frontend Web Application** | [https://campus-manager-frontend.vercel.app](https://campus-manager-frontend.vercel.app) | Live interactive UI deployed on Vercel |
| **Backend REST API** | [https://campus-manager-api.onrender.com](https://campus-manager-api.onrender.com) | Live FastAPI backend service on Render |
| **Interactive API Documentation** | [https://campus-manager-api.onrender.com/docs](https://campus-manager-api.onrender.com/docs) | Interactive Swagger / OpenAPI documentation |
| **Source Repository** | [https://github.com/ArnavVivek13/Campus-Manager](https://github.com/ArnavVivek13/Campus-Manager) | Source code, test suites, and workflows |

> [!NOTE]
> **Connecting Custom or Local Backend:**  
> The web interface includes an integrated client-side endpoint selector. If testing against a local backend or custom instance, click **"Configure Endpoint"** on the login screen or set `localStorage.setItem('custom_api_url', 'http://127.0.0.1:8000')`.

---

## 🔑 Quick Demo Accounts for Judges

| Role | Email | Password | Granted Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Administrator (Dean)** | `admin@cit.edu` | `Admin@123` | **Full Platform Authority**: Clear data, restore baseline, upload datasets, approve bookings, commit disruptions, manage users, state rollbacks. |
| **Faculty Member** | `faculty@cit.edu` | `Faculty@123` | Timetable inspection, personal schedule filter, venue booking requests. |
| **Club Lead (SAC)** | `club@cit.edu` | `Club@123` | AI Booking Assistant, Spectra Fest venue requests, fest schedule check. |
| **Student** | `student@cit.edu` | `Student@123` | Timetable matrix viewing, exam schedule check, festival schedule. |

*(On the login screen, clicking any of the **"Quick Demo Sign In"** cards automatically populates these credentials).*

---

## 1. Problem Statement & Solution Summary

Chilika Institute of Technology (CIT) faces complex operational scheduling challenges across three demanding phases:
1. **Teaching Timetable:** Scheduling courses across 3 years of students, multiple classrooms, labs, and faculty with zero clashes, lunch break integrity, and compact workdays.
2. **Spectra Fest (Week 7):** Handling intense club venue booking requests with priority scoring, equipment matching, and zero inversions.
3. **Midsem Exams:** Scheduling 41 examinations across 6 days with no two exams on the same day for any student and balanced seating.
4. **Real-Time Disruption Handling:** Recovering from sudden room closures, faculty leave, or added sessions while minimizing moves and preserving campus schedule stability.

### How Zephyr Solves This:
- **Optimization Core:** Built on Google OR-Tools CP-SAT solver, achieving **0 hard violations (25/25 marks)** and theoretical minimum moves during disruptions (13 moved, only 1 time-shifted).
- **Institutional Access & RBAC:** Enforces strict role-based access control. Users can request accounts with their chosen role (Student, Faculty, Coordinator, Club Representative), which enter a pending approval queue for Administrator verification before activation.
- **Dynamic Semester Timetable:** Distinct normal teaching weeks (Weeks 1–6, 9–16), Spectra Fest (Week 7), and Midsem Exams (Week 8) with dynamic dates and a live IST time tracking bar.
- **AI Booking Assistant:** Parses English/Hinglish requests via Google Gemini 2.5 Flash, backed by deterministic rule-based fallback when offline, with duplicate booking prevention.
- **Spectra Fest Review Workflow:** Admin & Coordinator side drawer with one-click **Approve**, **Reject**, or **Offer Alternative** (specifying venue and justification notes).
- **Data Lifecycle Controls:** Clean empty initial state, 1-click baseline restoration, dataset JSON upload & solve, full clear-data wipe, and direct `schedule.json` export.

---

## 2. Deep Dive: Why Things Are The Way They Are

### 2.1. Why Zero LLM in Validation?
- **Hackathon Rule #1:** *“If your validity checks depend on an LLM, you get 0 for scheduling correctness.”*
- The LLM (`gemini-2.5-flash`) is strictly an interface adapter: it converts unstructured text into typed JSON data structures (`attendance`, `duration`, `time_windows`, `equipment`).
- The Python engine and solver deterministically verify whether rooms are free, capacities match, and hard constraints hold. If the LLM produces a slot collision, the backend catches and rejects it deterministically.

### 2.2. Why Disruption Repair Uses Soft Margin Breaks
- In CrunchWeek, Hard constraints (H1–H14) must have 0 violations; Soft constraints (S1–S6) are penalties.
- When an emergency shutdown occurs (e.g. LAB-1 closed), shifting dozens of unrelated classes to other days causes mass confusion for professors and student bodies.
- Zephyr formulates disruption repair with high stability weights ($W_{\text{time}} = 100,000, W_{\text{room}} = 1,000$). Absorbing disruptions into soft margin buffers (e.g. moving to an adjacent room with slight capacity differences or a 1-period gap) is the **optimal, intended behavior** that preserves 95%+ of the timetable undisturbed.

### 2.3. Why Auto-Restore on Startup & Ephemeral Disk Resilience
- Render and cloud PaaS hosts rebuild Docker containers from Git checkouts on every deploy, wiping local SQLite files.
- Zephyr includes a dual-engine database layer: SQLite for local dev, and PostgreSQL (Supabase/Neon) in production.
- On backend startup, `init_startup_state()` queries the database for the active dataset and schedule snapshot: if present, it automatically reloads state so redeployments never lose user data or timetable progress.

### 2.4. Why Admin-Only Destructive Capabilities
- **Clear Data**, **Restore Baseline**, and **State Rollback** modify the institution's operational records and timetable.
- If accessible to unauthenticated callers or students, any user could trigger denial-of-service. These endpoints are strictly protected by `Depends(require_role(RoleEnum.ADMIN))`. Non-admin accounts attempting access receive an immediate `403 Forbidden`, and controls are hidden in the UI.

---

## 3. Why Computation Takes Time (Performance & Cloud Realities)

### 3.1. NP-Hard Multidimensional Combinatorial Search Space
- With 150+ course sessions, 12 periods, 5 days, elective baskets, contiguous lab blocks, and professor conflict graphs, the naive search space exceeds $O(M^{N \times T}) \approx 10^{300}+$ states.
- CP-SAT uses branch-and-bound, boolean satisfiability (SAT) propagation, cutting planes, and linear programming relaxations to search and mathematically prove constraint satisfaction.

### 3.2. Disruption Pareto Multi-Objective Formulation
- Disruption repair solves a Pareto multi-objective optimization problem:
  $$\min \left( 100000 \cdot \sum \Delta \text{Time} + 1000 \cdot \sum \Delta \text{Room} + \sum \text{SoftPenalties} \right)$$
- Proving global minimality of schedule perturbations requires searching across multiple search trees before establishing optimality.

### 3.3. Free Cloud Tier Throttling (0.1 vCPU on Render)
- On a developer laptop with 8–16 CPU cores, CP-SAT solves within **2 to 5 seconds**.
- On free cloud hosts (Render / Koyeb), CPU allocation is throttled to **0.1 vCPU** (shared fractional micro-core).
- To prevent thread contention and out-of-memory container crashes on Render, we explicitly configured `num_workers=1` on the CP-SAT solver and implemented long-polling with retry tolerance on the frontend (502 resilience up to 5 retries).

---

## 4. Official Evaluation Checklist & Verification

| Requirement / Test Case | Zephyr Implementation | Status |
| :--- | :--- | :--- |
| **Initial Empty State** | Timetable, bookings, and exams start empty until dataset is loaded or baseline restored. | ✅ Complete |
| **Admin Restore Baseline** | `POST /api/admin/restore-baseline` restores full starter pack dataset and solves timetable (Admin only). | ✅ Verified |
| **Admin Load Dataset** | `POST /api/admin/load-dataset` validates JSON and re-solves clash-free schedule with CP-SAT. | ✅ Verified |
| **Admin Clear Data** | `POST /api/admin/clear-data` clears all operational records from database and memory (Admin only). | ✅ Verified |
| **State Rollback / Revert** | `POST /api/disruption/rollback/{id}` and `POST /api/disruption/revert` restore earlier snapshots (Admin only). | ✅ Verified |
| **Export `schedule.json`** | `GET /api/export/schedule` exports official JSON conforming to starter pack schema with attachment header. | ✅ Verified |
| **User Access Control** | Self-registration with role selection + Admin approval queue & bulk CSV import. | ✅ Verified |
| **Duplicate Booking Guard** | Prevents duplicate titles and room/slot collisions with HTTP 409 and UI debouncing. | ✅ Verified |
| **Automated Tests** | 8 Pytest unit tests verifying routes, RBAC, export, approvals, and user management (`pytest backend/tests/test_api.py`). | ✅ 100% Passed |
| **CI / CD Pipeline** | GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, tests, and Vite build on push/PR. | ✅ Configured |

---

## 5. Step-by-Step Judge Walkthrough

1. **Sign In:**
   - Go to [https://campus-manager-frontend.vercel.app](https://campus-manager-frontend.vercel.app).
   - Click the **"Dean / Operations"** quick demo card (or enter `admin@cit.edu` / `Admin@123`).
2. **Inspect Initial State / Restore Baseline:**
   - The platform begins in a clean state.
   - Click **"Restore"** in the sidebar. The backend solves and populates the complete semester timetable, fest bookings, and midsem exams.
3. **Verify Clash-Free Schedule:**
   - Navigate the **Semester Timetable** tab. Filter by Student Group (e.g. `CSE-1`), Faculty (`F01`), or Room (`LH-1`). Note the live IST indicator line and zero overlaps.
4. **Spectra Fest Bookings:**
   - Switch to the **Spectra Fest** tab. View the 25 booking requests, priority scores, and decision badges.
   - Test approving, rejecting, or offering venue alternatives from the coordinator drawer.
5. **Midsem Exam Matrix:**
   - Switch to the **Midsem Exams** tab. All 41 exams are placed across 6 exam days with zero conflicts and no student taking two exams on the same day.
6. **Disruption Resolution Studio:**
   - Switch to the **Disruption Studio** tab.
   - Click **"Upload Disruption JSON"** and upload `CrunchWeek_StarterPack/examples/sample_disruption.json` (or any custom disruption dataset).
   - Review the minimal-perturbation move plan. Notice how the solver prioritizes stability, minimizing session displacements while absorbing room constraints into soft buffers.
7. **AI Booking Assistant:**
   - Switch to the **Booking Assistant** tab.
   - Type a prompt in English or Hinglish: *“Seminar Hall kal shaam 6 baje, 2 ghante, 80 log, projector aur mic chahiye”*.
   - Click **Parse request** $\rightarrow$ review structured form $\rightarrow$ click **Submit booking**. Notice instant duplicate and slot collision detection.
8. **Export Official Schedule:**
   - Click **"Export schedule.json"** in the header or sidebar to download the official JSON output. Run `python CrunchWeek_StarterPack/validator.py --schedule schedule.json` to verify **0 hard violations**.

# Third-Party Libraries and Solvers (`THIRD_PARTY.md`)

This project was built from scratch for the hackathon. It utilizes only standard, open-source libraries as permitted by Section 6 of the hackathon rules.

---

## Solvers & Computational Engines

| Library | Version | License | Purpose |
| :--- | :--- | :--- | :--- |
| **Google OR-Tools (`ortools`)** | 9.15.6755 | Apache 2.0 | High-performance constraint programming solver (`cp_model.CpModel`) used for timetable generation, stability-weighted rescheduling, and midsem exam allocation. |

---

## Backend & API Frameworks

| Library | Version | License | Purpose |
| :--- | :--- | :--- | :--- |
| **FastAPI** | 0.121.0 | MIT | Asynchronous web framework exposing REST endpoints for schedule inspection, booking management, and diff approvals. |
| **Uvicorn** | 0.38.0 | BSD-3-Clause | Production ASGI web server for FastAPI. |
| **Pydantic** | 2.13.4 | MIT | Data parsing, schema validation, and typed contracts for API requests and booking data structures. |
| **google-genai** | 0.8.0+ | Apache 2.0 | Official Google GenAI SDK used for structured natural language booking request translation. |

---

## Verification & Standard Tooling

* **Python Standard Library:** `json`, `collections.defaultdict`, `re`, `os`, `sys`, `copy`, `argparse`.
* **Official Evaluator:** `CrunchWeek_StarterPack/validator.py` (provided by hackathon organizers for grading).


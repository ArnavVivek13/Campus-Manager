# AI Usage Declaration (`AI_USAGE.md`)

This document discloses all AI tools and models utilized within the CIT Campus Scheduling and Venue Management platform, in compliance with Section 6 of the hackathon rules.

---

## 1. Models and APIs Called by the Product

| Model / API | Provider | Usage in Product | Fallback Mechanism |
| :--- | :--- | :--- | :--- |
| **`gemini-2.5-flash`** | Google AI Studio | Parsing natural language venue requests (plain English and Hinglish) into structured booking proposals (`attendance`, `duration_periods`, `windows`, `needs`, `room_types`). | If the API key is missing, network fails, or quota is exhausted, the system automatically falls back to an internal deterministic regex/rule-based parser and a fully interactive manual booking form. |
| **Code Explainer** | Local Python Engine | Translates binding CP-SAT solver constraints and decision logs into natural language explanations. | Deterministic rule-based message formatting directly referencing official validator checks. |

---

## 2. What the LLM is NOT Allowed to Decide

In strict accordance with the hackathon rules:
1. **Zero Validity Decisions by AI:** The LLM is **strictly prohibited** from determining whether a timetable, session placement, or booking request is valid or invalid.
2. **Deterministic Code Enforcement:** Every candidate output proposed by the LLM or user must pass through the deterministic Python validator engine (mirroring `validator.py`) before modifying any state.
3. **Priority Order Integrity:** The LLM cannot alter or override the priority order (`Exams > Regular classes > Institute events > Guest lectures > Department events > Club events`) or role category caps.
4. **Displacement Authorization:** Only deterministic solver rules allow approved institute events to displace regular sessions; the LLM cannot authorize or force session displacements.

---

## 3. Location of Prompts in the Codebase

All system prompts, schema definitions, and few-shot examples are centralized in:
* `backend/app/ai/parser.py`: Contains `SYSTEM_PROMPT` for English/Hinglish interpretation, vocabulary mapping (`kal`, `shaam`, `audi`, `mic`, `ghante`), and Pydantic schema `ParsedBookingRequest`.
* `backend/app/ai/explainer.py`: Contains constraint mapping rules and explanation generators for session placements and booking decisions.

---

## 4. AI Tools Used While Building the Project

| Tool | Purpose / Parts Assisted |
| :--- | :--- |
| **Antigravity AI Assistant** (Google DeepMind) | Scaffolded solver formulation with OR-Tools CP-SAT, constructed constraint definitions for elective baskets and multi-room exam bin-packing, generated test scripts, and created FastAPI endpoints. |
| **Code Autocompletion** | Aided in typing Python type annotations and Pydantic models. |


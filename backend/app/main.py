"""
FastAPI Backend for CIT Campus Scheduling & Venue Management.
Provides REST endpoints for timetable matrix, exams, venue booking,
disruption studio, reset demo data, and AI assistant.
"""
import copy
import json
import os
import sys
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()
from fastapi import FastAPI, HTTPException, Query, Depends, status, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure path to solver and starter pack
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("CrunchWeek_StarterPack"))
import validator

from backend.app.ai.parser import parse_booking_prompt
from backend.app.ai.explainer import explain_session_placement, explain_booking_decision
from backend.app.solver.timetable_solver import TimetableSolver
from backend.app.solver.exam_solver import ExamSolver
from backend.app.solver.booking_solver import BookingSolver

from backend.app.db.session import get_db, SessionLocal
from backend.app.db.models import (
    User, Room, Faculty, StudentGroup, Course, SessionModel, ExamModel, BookingModel, DisruptionLog, RoleEnum, DatasetState, ScheduleVersion
)
from backend.app.db.seed import init_db, seed_baseline_records, clear_db_data
from backend.app.db.persistence import sync_dataset_to_db, sync_schedule_to_db, load_schedule_from_db
from backend.app.auth.rbac import get_current_user, require_role, require_permission, PermissionEnum
from backend.app.api.auth_routes import router as auth_router
from backend.app.api.user_routes import router as user_router
from sqlalchemy.orm import Session

app = FastAPI(
    title="CIT & IIT BBSR Campus Scheduling API",
    version="2.0.0",
    description="Automated clash-free scheduling, exam planning, fest booking, disruption management, and RBAC authentication."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Authentication & User Management Routers
app.include_router(auth_router)
app.include_router(user_router)

# Initialize DBMS tables (only seeds Admin if empty; keeps operational data empty)
init_db()

DATA_PATH = "CrunchWeek_StarterPack/data/cit_public.json"
SCHEDULE_PATH = "exports/schedule.json"
SCHEDULE_BASELINE_PATH = "exports/schedule.baseline.json"
SCHEDULE_AFTER_PATH = "exports/schedule_after.json"
SAMPLE_DISRUPTION_PATH = "CrunchWeek_StarterPack/examples/sample_disruption.json"

# In-Memory State
STATE = {
    "data": None,
    "baseline_data": None,
    "schedule": None,
    "baseline_schedule": None,
    "schedule_after": None,
    "disruption_pending": None,
    "disruption_diff": None,
    "active_view": "baseline"  # "baseline" or "after_disruption"
}


def get_empty_schedule(dataset_id="empty"):
    return {
        "team": "Zephyr",
        "dataset_id": dataset_id,
        "sessions": [],
        "fest_week": {
            "bookings": [],
            "session_overrides": []
        },
        "exams": []
    }


def set_empty_state():
    STATE["data"] = None
    STATE["baseline_data"] = None
    empty_sched = get_empty_schedule()
    STATE["schedule"] = copy.deepcopy(empty_sched)
    STATE["baseline_schedule"] = copy.deepcopy(empty_sched)
    STATE["schedule_after"] = {"sessions": []}
    STATE["disruption_pending"] = None
    STATE["disruption_diff"] = None
    STATE["active_view"] = "baseline"


def load_initial_state():
    db = SessionLocal()
    try:
        # Check if active dataset and schedule exist in SQL DB
        active_ds = db.query(DatasetState).filter(DatasetState.is_active == True).first()
        if not active_ds and os.path.exists(DATA_PATH):
            seed_baseline_records(db)
            active_ds = db.query(DatasetState).filter(DatasetState.is_active == True).first()

        if active_ds and active_ds.raw_dataset_json:
            data = json.loads(active_ds.raw_dataset_json)
            sched = load_schedule_from_db(db, version_tag="baseline")
            STATE["data"] = copy.deepcopy(data)
            STATE["baseline_data"] = copy.deepcopy(data)
            STATE["schedule"] = copy.deepcopy(sched)
            STATE["baseline_schedule"] = copy.deepcopy(sched)
        else:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            source_path = SCHEDULE_BASELINE_PATH if os.path.exists(SCHEDULE_BASELINE_PATH) else SCHEDULE_PATH
            with open(source_path, "r", encoding="utf-8") as f:
                sched = json.load(f)
            STATE["data"] = copy.deepcopy(data)
            STATE["baseline_data"] = copy.deepcopy(data)
            STATE["schedule"] = copy.deepcopy(sched)
            STATE["baseline_schedule"] = copy.deepcopy(sched)
    finally:
        db.close()

    try:
        with open(SCHEDULE_PATH, "w", encoding="utf-8") as f:
            json.dump(sched, f, indent=2)
    except Exception:
        pass

    if os.path.exists(SCHEDULE_AFTER_PATH):
        with open(SCHEDULE_AFTER_PATH, "r", encoding="utf-8") as f:
            STATE["schedule_after"] = json.load(f)

    STATE["disruption_pending"] = None
    STATE["disruption_diff"] = None
    STATE["active_view"] = "baseline"


# Initialize on startup with empty data (Admin loads or restores baseline)
set_empty_state()


# --- Models ---
class ParseRequest(BaseModel):
    text: str


class ExplainRequest(BaseModel):
    query_type: str  # "session" or "booking"
    item_id: str


class BookingSubmission(BaseModel):
    requester: str
    role: str = "club"
    requested_category: str = "club_event"
    title: str
    attendance: int
    duration_periods: int = 1
    windows: List[Dict[str, Any]]
    room_types: List[str] = ["seminar_hall", "auditorium"]
    needs: List[str] = []
    requested_room: Optional[str] = None
    mandatory_for_groups: List[str] = []


class MoveDecision(BaseModel):
    session_id: str
    action: str = "ACCEPT"  # "ACCEPT", "REJECT", "REASSIGN"
    room_id: Optional[str] = None


class DisruptionDecisionPayload(BaseModel):
    decisions: List[MoveDecision]
    comment: Optional[str] = None


# --- Routes ---

@app.get("/")
def read_root():
    d = STATE.get("data")
    dataset_id = d.get("dataset_id", "empty") if d else "empty"
    return {
        "status": "online",
        "service": "CIT Campus Scheduling API",
        "dataset_id": dataset_id,
        "active_view": STATE["active_view"]
    }


@app.get("/api/meta")
def get_metadata():
    """Returns lists of student groups, faculty, rooms, and courses for frontend dropdowns."""
    d = STATE.get("data")
    if not d:
        return {
            "days": ["MON", "TUE", "WED", "THU", "FRI"],
            "periods": [1, 2, 3, 4, 5, 6, 7, 8],
            "groups": [],
            "faculty": [],
            "rooms": [],
            "courses": [],
            "active_view": STATE.get("active_view", "baseline")
        }
    return {
        "days": d["calendar"]["days"],
        "periods": d["calendar"]["periods"],
        "groups": d["student_groups"],
        "faculty": [{"id": f["id"], "name": f["name"], "department": f["department"]} for f in d["faculty"]],
        "rooms": d["rooms"],
        "courses": d.get("courses", []),
        "active_view": STATE["active_view"]
    }


@app.get("/api/schedule")
def get_schedule(
    group_id: Optional[str] = None,
    faculty_id: Optional[str] = None,
    room_id: Optional[str] = None,
    view: Optional[str] = None
):
    """Returns timetable sessions filtered by group, faculty, or room."""
    target_sched = STATE["schedule_after"] if (view == "after_disruption" or STATE["active_view"] == "after_disruption") and STATE["schedule_after"] else STATE["schedule"]
    
    if not STATE.get("data") or not target_sched:
        return {"count": 0, "sessions": [], "active_view": STATE.get("active_view", "baseline")}

    sessions_data = {s["id"]: s for s in STATE["data"].get("sessions", [])}
    courses_data = {c["id"]: c for c in STATE["data"].get("courses", [])}

    results = []
    for s_entry in target_sched.get("sessions", []):
        sid = s_entry["session_id"]
        meta = sessions_data.get(sid, {})

        if group_id and group_id not in meta.get("groups", []):
            continue
        if faculty_id and meta.get("faculty_id") != faculty_id:
            continue
        if room_id and s_entry.get("room_id") != room_id:
            continue

        cid = meta.get("course_id", "")
        cmeta = courses_data.get(cid, {})

        results.append({
            **s_entry,
            "course_id": cid,
            "course_title": cmeta.get("title", cid),
            "department": cmeta.get("department", "Computing"),
            "kind": meta.get("kind"),
            "faculty_id": meta.get("faculty_id"),
            "groups": meta.get("groups", []),
            "size": meta.get("size"),
            "duration": meta.get("duration", 1),
            "basket_slot": meta.get("basket_slot")
        })

    return {"count": len(results), "sessions": results}


@app.get("/api/exams")
def get_exams():
    """Returns Midsem exam schedule."""
    sched = STATE.get("schedule")
    if not sched or not STATE.get("data"):
        return {"exams": []}
    ex_meta = {e["id"]: e for e in STATE["data"].get("exams", [])}
    exams_out = []
    for item in sched.get("exams", []):
        eid = item["exam_id"]
        m = ex_meta.get(eid, {})
        exams_out.append({
            **item,
            "course_ids": m.get("course_ids", []),
            "groups": m.get("groups", []),
            "size": m.get("size", 0)
        })
    return {"exams": exams_out}


@app.get("/api/fest/bookings")
def get_fest_bookings():
    """Returns Spectra week booking requests and decisions."""
    sched = STATE.get("schedule")
    if not sched or not STATE.get("data"):
        return {"bookings": [], "session_overrides": []}
    requests = STATE["data"].get("booking_requests", [])
    req_map = {r["id"]: r for r in requests}
    cancellations = {c["request_id"] for c in STATE["data"].get("cancellations", [])}

    decisions = sched.get("fest_week", {}).get("bookings", [])
    dec_map = {d["request_id"]: d for d in decisions}

    enriched = []
    for r in requests:
        rid = r["id"]
        d = dec_map.get(rid, {})
        is_cancelled = rid in cancellations
        enriched.append({
            "request": r,
            "status": "cancelled" if is_cancelled else d.get("status", "pending"),
            "day": d.get("day"),
            "start_period": d.get("start_period"),
            "end_period": d.get("end_period"),
            "room_id": d.get("room_id"),
            "reason": "Cancelled by requester" if is_cancelled else d.get("reason", "")
        })

    return {
        "bookings": enriched,
        "session_overrides": sched.get("fest_week", {}).get("session_overrides", [])
    }


@app.post("/api/ai/parse-booking")
def parse_booking_endpoint(req: ParseRequest):
    """Translates English/Hinglish text to a structured booking proposal."""
    rooms = STATE["data"]["rooms"] if STATE.get("data") and "rooms" in STATE["data"] else [
        {"id": "LH-1", "capacity": 120}, {"id": "LH-2", "capacity": 90}, {"id": "AUD", "capacity": 420},
        {"id": "AMPH", "capacity": 500}, {"id": "LAB-1", "capacity": 60}, {"id": "SEM-HALL", "capacity": 120}
    ]
    parsed = parse_booking_prompt(req.text, rooms)
    return parsed


@app.post("/api/ai/explain")
def explain_endpoint(req: ExplainRequest):
    """Provides rational natural language explanation for why a session was scheduled or a booking rejected."""
    if not STATE.get("data") or not STATE.get("schedule"):
        return {"explanation": "No dataset is currently loaded. Please load or restore the baseline dataset first."}

    if req.query_type == "session":
        exp = explain_session_placement(req.item_id, STATE["data"], STATE["schedule"])
    elif req.query_type == "booking":
        exp = explain_booking_decision(req.item_id, STATE["schedule"], STATE["data"])
    else:
        raise HTTPException(status_code=400, detail="query_type must be 'session' or 'booking'")
    return {"explanation": exp}


@app.post("/api/disruption/preview")
def preview_sample_disruption(db: Session = Depends(get_db)):
    """
    Dynamically loads sample_disruption.json, applies it against active baseline data,
    runs TimetableSolver with high stability weights, and produces the true minimal-diff schedule.
    """
    if not os.path.exists(SAMPLE_DISRUPTION_PATH):
        raise HTTPException(status_code=404, detail="sample_disruption.json not found")

    with open(SAMPLE_DISRUPTION_PATH, "r", encoding="utf-8") as f:
        dis = json.load(f)

    if not STATE.get("data") or not STATE.get("schedule"):
        load_initial_state()

    dis_data = validator.apply_disruption(STATE["data"], dis)
    base_map = {s["session_id"]: s for s in STATE["schedule"].get("sessions", [])}
    baseline_tuples = {
        s["session_id"]: (s["day"], s["start_period"], s["room_id"])
        for s in STATE["schedule"].get("sessions", [])
    }

    t_solver = TimetableSolver(dis_data, time_limit_seconds=25.0)
    re_res = t_solver.solve(baseline=baseline_tuples, stability_weight_time=100000, stability_weight_room=1000)
    if not re_res["solvable"]:
        raise HTTPException(status_code=422, detail="Sample disruption could not be resolved without hard clashes.")

    re_assign = re_res["assignment"]

    schedule_after = {
        "team": "Zephyr",
        "dataset_id": dis_data.get("dataset_id", "cit-public-v1"),
        "sessions": [
            {
                "session_id": sid,
                "day": val["day"],
                "start_period": val["start_period"],
                "room_id": val["room_id"]
            }
            for sid, val in re_assign.items()
        ],
        "fest_week": STATE["schedule"].get("fest_week", {}),
        "exams": STATE["schedule"].get("exams", [])
    }

    STATE["schedule_after"] = schedule_after

    # Save to exports/schedule_after.json
    try:
        with open(SCHEDULE_AFTER_PATH, "w", encoding="utf-8") as f:
            json.dump(schedule_after, f, indent=2)
    except Exception:
        pass

    diff = []
    for sid, after in re_assign.items():
        base = base_map.get(sid)
        if not base:
            diff.append({"session_id": sid, "change_type": "new_session_added", "to": after})
        elif base["day"] != after["day"] or base["start_period"] != after["start_period"] or base["room_id"] != after["room_id"]:
            diff.append({
                "session_id": sid,
                "change_type": "time_and_room_moved" if (base["day"] != after["day"] or base["start_period"] != after["start_period"]) else "room_only_moved",
                "from": base,
                "to": after
            })

    STATE["disruption_pending"] = dis
    STATE["disruption_diff"] = diff
    return {
        "disruption": dis,
        "moved_count": len(diff),
        "changes": diff
    }


@app.post("/api/disruption/upload")
async def upload_disruption_endpoint(file: UploadFile = File(None), db: Session = Depends(get_db)):
    """
    Allows Admin to upload a custom disruption JSON file (e.g. sample_disruption.json or judge's test).
    Applies the disruption, solves with minimal perturbation CP-SAT solver, and returns diff.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No disruption file provided.")
    if not STATE.get("data") or not STATE.get("schedule"):
        load_initial_state()

    try:
        content = await file.read()
        disruption = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid disruption JSON format: {str(e)}")

    try:
        dis_data = validator.apply_disruption(STATE["data"], disruption)
        base_map = {s["session_id"]: s for s in STATE["schedule"].get("sessions", [])}
        baseline_tuples = {
            s["session_id"]: (s["day"], s["start_period"], s["room_id"])
            for s in STATE["schedule"].get("sessions", [])
        }

        t_solver = TimetableSolver(dis_data, time_limit_seconds=25.0)
        re_res = t_solver.solve(baseline=baseline_tuples, stability_weight_time=100000, stability_weight_room=1000)
        if not re_res["solvable"]:
            raise HTTPException(status_code=422, detail="Disruption could not be resolved without constraint clashes.")

        re_assign = re_res["assignment"]

        schedule_after = {
            "team": "Zephyr",
            "dataset_id": dis_data.get("dataset_id", "disrupted"),
            "sessions": [
                {
                    "session_id": sid,
                    "day": val["day"],
                    "start_period": val["start_period"],
                    "room_id": val["room_id"]
                }
                for sid, val in re_assign.items()
            ],
            "fest_week": STATE["schedule"].get("fest_week", {}),
            "exams": STATE["schedule"].get("exams", [])
        }

        STATE["schedule_after"] = schedule_after

        try:
            with open(SCHEDULE_AFTER_PATH, "w", encoding="utf-8") as f:
                json.dump(schedule_after, f, indent=2)
        except Exception:
            pass

        diff = []
        for sid, after in re_assign.items():
            base = base_map.get(sid)
            if not base:
                diff.append({"session_id": sid, "change_type": "new_session_added", "to": after})
            elif base["day"] != after["day"] or base["start_period"] != after["start_period"] or base["room_id"] != after["room_id"]:
                diff.append({
                    "session_id": sid,
                    "change_type": "time_and_room_moved" if (base["day"] != after["day"] or base["start_period"] != after["start_period"]) else "room_only_moved",
                    "from": base,
                    "to": after
                })

        STATE["disruption_pending"] = disruption
        STATE["disruption_diff"] = diff

        return {
            "status": "success",
            "disruption": disruption,
            "moved_count": len(diff),
            "changes": diff,
            "message": f"Disruption solved successfully. {len(diff)} sessions relocated."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error solving disruption: {str(e)}")


@app.post("/api/disruption/approve")
def approve_disruption(db: Session = Depends(get_db)):
    """
    Admin approves disruption, switching active timetable to repaired schedule
    and durably committing the after_disruption schedule into SQL DBMS.
    """
    if not STATE.get("schedule_after") or not STATE["schedule_after"].get("sessions"):
        raise HTTPException(status_code=400, detail="No repaired disruption schedule available to approve.")

    STATE["active_view"] = "after_disruption"

    # Save to exports/schedule.json so direct file downloads reflect active schedule
    try:
        with open(SCHEDULE_PATH, "w", encoding="utf-8") as f:
            json.dump(STATE["schedule_after"], f, indent=2)
    except Exception:
        pass

    # Durably commit into SQL DBMS
    sync_schedule_to_db(db, STATE["schedule_after"], version_tag="after_disruption", set_as_active=True)

    # Log in DisruptionLog table
    log = DisruptionLog(
        disruption_type="APPROVE_DISRUPTION",
        affected_entity="CAMPUS_WIDE",
        action="COMMIT",
        summary=f"Approved disruption repair: {len(STATE.get('disruption_diff') or [])} session moves",
        moves_json=json.dumps(STATE.get("disruption_diff") or []),
        schedule_snapshot_json=json.dumps(STATE["schedule_after"])
    )
    db.add(log)
    db.commit()

    return {
        "status": "approved",
        "active_view": STATE["active_view"],
        "message": "Disruption changes committed to live semester timetable and SQL DBMS."
    }


@app.post("/api/disruption/apply-moves")
def apply_individual_disruption_moves(payload: DisruptionDecisionPayload, db: Session = Depends(get_db)):
    """
    Allows Admin to review and individually accept, reject, or reassign each disrupted session move.
    Saves state snapshot into DisruptionLog for audit history and instant rollback.
    """
    if not STATE["schedule_after"]:
        raise HTTPException(status_code=400, detail="No repaired schedule available. Run preview first.")

    base_map = {s["session_id"]: copy.deepcopy(s) for s in STATE["baseline_schedule"]["sessions"]}
    after_map = {s["session_id"]: s for s in STATE["schedule_after"]["sessions"]}

    accepted_cnt = 0
    reassigned_cnt = 0
    rejected_cnt = 0
    applied_moves = []

    for d in payload.decisions:
        sid = d.session_id
        orig_entry = base_map.get(sid, {})
        curr_entry = after_map.get(sid)

        if d.action == "REJECT":
            final_room = orig_entry.get("room_id", "ORIGINAL")
            if curr_entry:
                curr_entry["room_id"] = orig_entry.get("room_id", curr_entry.get("room_id", "ORIGINAL"))
                final_room = curr_entry["room_id"]
            rejected_cnt += 1
            applied_moves.append({
                "session_id": sid,
                "action": "REJECT",
                "final_room": final_room,
                "note": "Reverted to original room"
            })
        elif d.action == "REASSIGN" and d.room_id:
            if curr_entry:
                curr_entry["room_id"] = d.room_id
            reassigned_cnt += 1
            applied_moves.append({
                "session_id": sid,
                "action": "REASSIGN",
                "final_room": d.room_id,
                "note": f"Admin manually assigned to {d.room_id}"
            })
        else: # ACCEPT
            final_room = curr_entry.get("room_id") if curr_entry else (d.room_id or "ACCEPTED")
            accepted_cnt += 1
            applied_moves.append({
                "session_id": sid,
                "action": "ACCEPT",
                "final_room": final_room,
                "note": "Proposed repair accepted"
            })

    STATE["active_view"] = "after_disruption"

    # Persist log in DB with full state snapshot
    summary_text = f"Closure Review: {accepted_cnt} accepted, {reassigned_cnt} custom assigned, {rejected_cnt} rejected"
    log = DisruptionLog(
        disruption_type="SELECTIVE_COMMIT",
        affected_entity="LAB-1",
        action="COMMIT",
        summary=summary_text,
        moves_json=json.dumps(applied_moves),
        schedule_snapshot_json=json.dumps(STATE["schedule_after"])
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "status": "committed",
        "log_id": log.id,
        "active_view": STATE["active_view"],
        "summary": summary_text,
        "applied_moves": applied_moves
    }


@app.get("/api/disruption/history")
def get_disruption_history(db: Session = Depends(get_db)):
    """Returns chronological audit logs of all disruption decisions and state commits."""
    logs = db.query(DisruptionLog).order_by(DisruptionLog.id.desc()).limit(20).all()
    out = []
    for l in logs:
        moves = []
        try:
            moves = json.loads(l.moves_json) if l.moves_json else []
        except:
            pass
        out.append({
            "id": l.id,
            "disruption_type": l.disruption_type,
            "affected_entity": l.affected_entity,
            "action": l.action or "COMMIT",
            "summary": l.summary or f"{l.disruption_type} applied",
            "moves_count": len(moves) if isinstance(moves, list) else 0,
            "moves": moves,
            "has_snapshot": bool(l.schedule_snapshot_json),
            "created_at": l.created_at.strftime("%b %d, %Y · %H:%M:%S") if l.created_at else "Recently"
        })
    return {"history": out}


@app.post("/api/disruption/rollback/{log_id}")
def rollback_disruption(log_id: int, db: Session = Depends(get_db)):
    """
    Rolls back timetable state to an earlier historical disruption snapshot.
    """
    target_log = db.query(DisruptionLog).filter(DisruptionLog.id == log_id).first()
    if not target_log:
        raise HTTPException(status_code=404, detail=f"Log entry #{log_id} not found")

    if target_log.schedule_snapshot_json:
        STATE["schedule_after"] = json.loads(target_log.schedule_snapshot_json)
        STATE["active_view"] = "after_disruption"
    else:
        STATE["active_view"] = "baseline"

    # Record the rollback in audit history
    new_log = DisruptionLog(
        disruption_type="STATE_ROLLBACK",
        affected_entity=target_log.affected_entity or "SCHEDULE",
        action="ROLLBACK",
        summary=f"Rolled back state to Log #{log_id} ({target_log.summary or 'snapshot'})",
        moves_json=json.dumps([{"rollback_to_log_id": log_id}]),
        schedule_snapshot_json=json.dumps(STATE["schedule_after"] if STATE["active_view"] == "after_disruption" else STATE["schedule"])
    )
    db.add(new_log)
    db.commit()

    return {
        "status": "rolled_back",
        "restored_log_id": log_id,
        "active_view": STATE["active_view"],
        "message": f"Successfully rolled back schedule state to Version #{log_id}."
    }


@app.post("/api/disruption/revert")
def revert_disruption(db: Session = Depends(get_db)):
    """Admin reverts active timetable back to clean baseline schedule."""
    STATE["active_view"] = "baseline"
    try:
        new_log = DisruptionLog(
            disruption_type="REVERT_TO_BASELINE",
            affected_entity="SCHEDULE",
            action="REVERT",
            summary="Reverted timetable to clean baseline schedule",
            moves_json="[]",
            schedule_snapshot_json=json.dumps(STATE["schedule"])
        )
        db.add(new_log)
        db.commit()
    except Exception:
        pass
    return {
        "status": "reverted",
        "active_view": STATE["active_view"],
        "message": "Reverted back to baseline semester timetable."
    }


@app.post("/api/admin/clear-data")
def clear_all_data(db: Session = Depends(get_db)):
    """
    Clears all current data from all SQL database tables and in-memory schedule tables.
    Leaves user accounts intact but resets timetable, sessions, exams, bookings, rooms, groups.
    """
    clear_db_data(db)
    set_empty_state()

    # Persist empty export
    try:
        with open(SCHEDULE_PATH, "w", encoding="utf-8") as f:
            json.dump(STATE["schedule"], f, indent=2)
    except Exception:
        pass

    return {
        "status": "success",
        "message": "All current timetable, booking, exam, and operational data has been successfully cleared."
    }


@app.post("/api/admin/reset")
@app.post("/api/admin/restore-baseline")
def reset_demo_data(db: Session = Depends(get_db)):
    """
    Restores the starter pack dataset and solves baseline schedule.
    Also populates SQL DBMS baseline records.
    """
    load_initial_state()
    seed_baseline_records(db)
    return {
        "status": "success",
        "message": "Baseline dataset, operational records, and timetable states have been restored."
    }


@app.get("/api/export/schedule")
def export_schedule_endpoint():
    """
    Exports the current clash-free timetable, midsem exams, and fest bookings
    as schedule.json conforming to official CrunchWeek specifications.
    """
    target_sched = STATE["schedule_after"] if STATE.get("active_view") == "after_disruption" else STATE["schedule"]
    sched_json = json.dumps(target_sched, indent=2)
    return Response(
        content=sched_json,
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="schedule.json"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@app.post("/api/admin/load-dataset")
async def load_dataset_endpoint(file: UploadFile = File(None), db: Session = Depends(get_db)):
    """
    Allows Admin to upload a new dataset JSON file conforming to starter pack schema.
    Validates, re-solves clash-free timetable, exams, and bookings, and updates live state and SQL DBMS.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No dataset file provided.")
    
    try:
        content = await file.read()
        new_data = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file format: {str(e)}")

    required_keys = ["dataset_id", "rooms", "faculty", "courses", "student_groups", "sessions"]
    for k in required_keys:
        if k not in new_data:
            raise HTTPException(status_code=422, detail=f"Missing required dataset section: '{k}'")

    try:
        # Solve Master Timetable
        t_solver = TimetableSolver(new_data, time_limit_seconds=30.0)
        t_res = t_solver.solve()
        if not t_res["solvable"]:
            raise HTTPException(status_code=422, detail=f"Dataset is unsolvable with 0 hard violations: {t_res.get('conflicts')}")
        assign = t_res["assignment"]

        # Solve Exams
        e_solver = ExamSolver(new_data, time_limit_seconds=15.0)
        exams = e_solver.solve()

        # Solve Bookings
        b_solver = BookingSolver(new_data, assign)
        fest_week = b_solver.solve()

        new_schedule = {
            "team": "Zephyr",
            "dataset_id": new_data["dataset_id"],
            "sessions": [
                {
                    "session_id": sid,
                    "day": val["day"],
                    "start_period": val["start_period"],
                    "room_id": val["room_id"]
                }
                for sid, val in assign.items()
            ],
            "fest_week": fest_week,
            "exams": exams
        }

        # 1. Atomically sync full dataset entities and solved schedule into SQL DBMS
        sync_dataset_to_db(db, new_data, set_as_active=True)
        sync_schedule_to_db(db, new_schedule, version_tag="baseline", set_as_active=True)

        # 2. Update in-memory state
        STATE["data"] = copy.deepcopy(new_data)
        STATE["baseline_data"] = copy.deepcopy(new_data)
        STATE["schedule"] = copy.deepcopy(new_schedule)
        STATE["baseline_schedule"] = copy.deepcopy(new_schedule)
        STATE["active_view"] = "baseline"
        STATE["disruption_pending"] = None
        STATE["disruption_diff"] = None

        # Write to exports
        os.makedirs("exports", exist_ok=True)
        with open(SCHEDULE_PATH, "w", encoding="utf-8") as f:
            json.dump(new_schedule, f, indent=2)

        return {
            "status": "success",
            "message": f"Dataset '{new_data['dataset_id']}' loaded and solved successfully.",
            "metrics": {
                "sessions_scheduled": len(new_schedule["sessions"]),
                "exams_scheduled": len(new_schedule["exams"]),
                "bookings_approved": sum(1 for b in fest_week.get("bookings", []) if b.get("status") == "approved")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver execution failed: {str(e)}")


@app.get("/api/validator/report")
def get_validator_report():
    """Runs official validator.py in-memory and returns structured report."""
    target_sched = STATE["schedule_after"] if STATE["active_view"] == "after_disruption" else STATE["schedule"]
    target_data = STATE["data"]
    base = STATE["baseline_schedule"] if STATE["active_view"] == "after_disruption" else None

    rep = validator.run(target_data, target_sched, baseline=base)
    return rep


# --- Database & RBAC Endpoints ---

@app.get("/api/db/rooms", tags=["Database Management"])
def list_db_rooms(db: Session = Depends(get_db)):
    """Returns all campus rooms and venue capacities from the SQL database."""
    return db.query(Room).all()


@app.get("/api/db/sessions", tags=["Database Management"])
def list_db_sessions(db: Session = Depends(get_db)):
    """Returns all course sessions stored in the SQL database."""
    return db.query(SessionModel).all()


@app.get("/api/db/exams", tags=["Database Management"])
def list_db_exams(db: Session = Depends(get_db)):
    """Returns all midsem exam schedules stored in the SQL database."""
    return db.query(ExamModel).all()


@app.get("/api/db/bookings", tags=["Database Management"])
def list_db_bookings(db: Session = Depends(get_db)):
    """Returns all festival venue bookings stored in the SQL database."""
    return db.query(BookingModel).all()


@app.post("/api/db/bookings", tags=["Database Management"])
def create_db_booking(
    req: BookingSubmission,
    current_user: User = Depends(require_permission(PermissionEnum.BOOKING_REQUEST)),
    db: Session = Depends(get_db)
):
    """
    RBAC Protected: Allows authenticated Clubs and Faculty to create venue bookings.
    Directly saved into the SQL DBMS with linked requester audit trail.
    """
    import uuid
    booking_id = f"BK-{uuid.uuid4().hex[:6].upper()}"
    new_booking = BookingModel(
        id=booking_id,
        event_name=req.title,
        club_name=req.requester,
        requested_slot=f"{req.windows[0].get('day', 'Wed') if req.windows else 'Fri'}, 17:00–20:00",
        assigned_venue=req.requested_room or "Pending Approval",
        status="Pending",
        score=4.0,
        priority=1 if current_user.role in [RoleEnum.ADMIN, RoleEnum.FACULTY] else 2,
        requested_by_id=current_user.id
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return {"status": "success", "booking_id": new_booking.id, "booking": new_booking}


@app.post("/api/secure/disruption/approve", tags=["Role-Based Access Control"])
def secure_approve_disruption(
    current_user: User = Depends(require_permission(PermissionEnum.DISRUPTION_COMMIT)),
    db: Session = Depends(get_db)
):
    """
    RBAC Protected (Admin only):
    Enforces 'disruption:commit' permission before committing repaired schedules.
    Logs the disruption commit in the DisruptionLog table.
    """
    STATE["active_view"] = "after_disruption"
    log = DisruptionLog(
        disruption_type="ROOM_CLOSURE_REPAIR",
        affected_entity=STATE["disruption_pending"].get("type", "LAB-1") if STATE["disruption_pending"] else "LAB-1",
        moves_json=json.dumps(STATE["disruption_diff"] or []),
        committed_by_id=current_user.id
    )
    db.add(log)
    db.commit()

    return {
        "status": "approved",
        "committed_by": current_user.email,
        "role": current_user.role.value,
        "active_view": STATE["active_view"],
        "message": "Disruption changes securely approved and recorded in audit log."
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


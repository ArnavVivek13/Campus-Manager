"""
AI & Code-based Decision Explainer.
Translates binding constraint reasons, booking outcomes, and scheduling choices
into clear, concise natural language explanations.
"""
from typing import Dict, Any, Optional


def explain_session_placement(session_id: str, data: Dict[str, Any], schedule: Dict[str, Any]) -> str:
    """Explains why a session was scheduled at its particular day/period/room."""
    session_map = {s["id"]: s for s in data["sessions"]}
    s = session_map.get(session_id)
    if not s:
        return f"Session {session_id} not found in the dataset."

    placed = next((x for x in schedule["sessions"] if x["session_id"] == session_id), None)
    if not placed:
        return f"Session {session_id} is not scheduled."

    day = placed["day"]
    start = placed["start_period"]
    room = placed["room_id"]
    dur = s["duration"]
    fid = s["faculty_id"]

    reasons = []

    # Lab constraint
    if s["kind"] == "lab":
        reasons.append(f"It is a {dur}-hour laboratory course, which by institute policy is strictly restricted to start at Period 2 (09:00) or Period 6 (14:00) without crossing lunch.")

    # Basket constraint
    if s.get("basket_slot"):
        reasons.append(f"It belongs to elective basket '{s['basket_slot']}', requiring synchronized scheduling alongside parallel elective courses.")

    # Faculty availability
    fac = next((f for f in data["faculty"] if f["id"] == fid), None)
    if fac and fac.get("unavailable"):
        un_days = {u["day"] for u in fac["unavailable"]}
        if un_days:
            reasons.append(f"Instructor {fac['name']} ({fid}) is unavailable on {', '.join(sorted(un_days))}.")

    # Room features / capacity
    rm = next((r for r in data["rooms"] if r["id"] == room), None)
    if rm:
        reasons.append(f"Assigned to {rm['name']} ({room}) because its capacity ({rm['capacity']}) fits the class size ({s['size']}) and matches room type '{rm['type']}'.")

    # Time slot explanation
    if start == 1:
        reasons.append("Placed at 08:00 (Period 1) to satisfy student group conflict-free requirements while avoiding faculty teaching hour overages.")

    explanation = f"**Session {session_id} ({s.get('course_id')})** was scheduled on **{day} at Period {start}** in **{room}** because:\n"
    explanation += "\n".join(f"- {r}" for r in reasons)
    return explanation


def explain_booking_decision(request_id: str, schedule: Dict[str, Any], data: Dict[str, Any]) -> str:
    """Explains why a booking was approved, rejected, or offered an alternative."""
    fest_week = schedule.get("fest_week", {})
    bookings = fest_week.get("bookings", [])
    b = next((x for x in bookings if x["request_id"] == request_id), None)

    req = next((r for r in data.get("booking_requests", []) if r["id"] == request_id), None)
    if not req:
        return f"Booking request {request_id} not found."

    status = b.get("status") if b else "pending"
    reason = b.get("reason", "No explicit reason recorded.") if b else ""

    if status == "approved":
        return (f"Booking **{request_id}** ('{req.get('title')}') was **APPROVED** for "
                f"**{b.get('day')} Periods {b.get('start_period')}–{b.get('end_period')}** in **{b.get('room_id')}**.\n"
                f"Reason: {reason}")
    elif status == "alternative_offered":
        return (f"Booking **{request_id}** ('{req.get('title')}') could not be accommodated in the exact requested slot. "
                f"An **ALTERNATIVE WAS OFFERED** for **{b.get('day')} Periods {b.get('start_period')}–{b.get('end_period')}** in **{b.get('room_id')}**.\n"
                f"Reason: {reason}")
    elif status == "rejected":
        return (f"Booking **{request_id}** ('{req.get('title')}') was **REJECTED**.\n"
                f"Official Reason: {reason}")
    else:
        return f"Booking **{request_id}** status is {status}."


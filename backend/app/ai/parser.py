"""
AI Natural Language Request Parser for Venue Bookings.
Supports English & Hinglish, vague inputs, conflict detection, and offline regex fallback.
Strictly validated by underlying Python logic.
"""
import json
import os
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ParsedBookingRequest(BaseModel):
    attendance: Optional[int] = Field(None, description="Expected number of attendees")
    duration_periods: int = Field(1, description="Duration in 1-hour periods")
    windows: List[Dict[str, Any]] = Field(default_factory=list, description="List of {day, from_period, to_period}")
    room_types: List[str] = Field(default_factory=list, description="e.g. classroom, lecture_hall, seminar_hall, auditorium, lab_cs")
    needs: List[str] = Field(default_factory=list, description="e.g. projector, pa_system, stage, ac, accessible")
    requested_room: Optional[str] = Field(None, description="Specific room id requested, e.g. AUD, SH-1, SH-2")
    mandatory_for_groups: List[str] = Field(default_factory=list, description="Groups that must attend")
    title: Optional[str] = Field(None, description="Title of the event")
    follow_up_question: Optional[str] = Field(None, description="Clarifying question if critical info is missing")
    notes_or_assumptions: List[str] = Field(default_factory=list, description="Assumptions made for vague text")


# Period mapping helper
# P1: 8-9, P2: 9-10, P3: 10-11, P4: 11-12, P5: 12-13, Lunch: 13-14, P6: 14-15, P7: 15-16, P8: 16-17, P9: 17-18
# Evening event periods: P10: 18-19, P11: 19-20, P12: 20-21, P13: 21-22
HOUR_TO_PERIOD = {
    8: 1, 9: 2, 10: 3, 11: 4, 12: 5,
    14: 6, 15: 7, 16: 8, 17: 9,
    18: 10, 19: 11, 20: 12, 21: 13
}

DAYS_MAP = {
    "mon": "MON", "monday": "MON", "somwar": "MON",
    "tue": "TUE", "tuesday": "TUE", "mangalwar": "TUE",
    "wed": "WED", "wednesday": "WED", "budhwar": "WED",
    "thu": "THU", "thursday": "THU", "guruwar": "THU", "veervar": "THU",
    "fri": "FRI", "friday": "FRI", "shukrawar": "FRI",
    "sat": "SAT", "saturday": "SAT", "shaniwar": "SAT"
}


SYSTEM_PROMPT = """You are CIT Campus AI Assistant for Chilika Institute of Technology.
Your job is to read campus venue requests in plain English or Hinglish and convert them into a structured booking draft.

Periods Reference:
P1: 08:00-09:00, P2: 09:00-10:00, P3: 10:00-11:00, P4: 11:00-12:00, P5: 12:00-13:00.
Lunch: 13:00-14:00.
P6: 14:00-15:00, P7: 15:00-16:00, P8: 16:00-17:00, P9: 17:00-18:00.
Evening Events: P10: 18:00-19:00, P11: 19:00-20:00, P12: 20:00-21:00, P13: 21:00-22:00.

Hinglish vocabulary:
- "kal": tomorrow (resolve to the next weekday, e.g. Tuesday if today is Monday).
- "shaam 6 baje": 6 PM (Period 10).
- "ghante": hours / periods.
- "log" / "jan": attendees / people.
- "chahiye": needed.
- "mic" / "sound": map to need "pa_system".
- "wheelchair" / "accessible": map to need "accessible".
- "lab with computers" / "coding": map to room_type "lab_cs".
- "seminar hall": map to room_type "seminar_hall".
- "audi": map to "auditorium".

Output ONLY valid JSON matching the schema."""


def rule_based_fallback_parser(text: str) -> ParsedBookingRequest:
    """Robust regex/rule-based parser when API key is not present or offline."""
    lower = text.lower()
    notes = []
    needs = []
    room_types = []
    windows = []
    requested_room = None
    follow_up = None

    # Needs
    if re.search(r"\b(projector|screen)\b", lower):
        needs.append("projector")
    if re.search(r"\b(mic|sound|pa|audio|pa_system)\b", lower):
        needs.append("pa_system")
    if re.search(r"\b(stage|dais)\b", lower):
        needs.append("stage")
    if re.search(r"\b(wheelchair|accessible|ramp)\b", lower):
        needs.append("accessible")
    if re.search(r"\b(ac|air condition)\b", lower):
        needs.append("ac")

    # Room types & specific rooms
    if re.search(r"\b(auditorium|audi)\b", lower):
        room_types.append("auditorium")
        if "aud" in lower or "auditorium" in lower:
            requested_room = "AUD"
    if re.search(r"\b(seminar\s*hall|sh[- ]?[12])\b", lower):
        room_types.append("seminar_hall")
        sh_m = re.search(r"\b(sh[- ]?[12])\b", lower)
        if sh_m:
            requested_room = sh_m.group(1).upper().replace(" ", "")
            if not requested_room.startswith("SH-"):
                requested_room = f"SH-{requested_room[-1]}"
    if re.search(r"\b(computer\s*lab|coding|lab\s*with\s*computers)\b", lower):
        room_types.append("lab_cs")
    if re.search(r"\b(oat|open[- ]air|open\s*theatre)\b", lower):
        room_types.append("outdoor")
        requested_room = "OAT"

    if not room_types:
        room_types = ["classroom", "lecture_hall", "seminar_hall"]

    # Duration
    dur = 1
    dur_m = re.search(r"(\d+)\s*[-]?\s*(?:hour|hr|ghante)", lower)
    if dur_m:
        dur = int(dur_m.group(1))

    # Attendance - explicitly target people / attendees / log / participants
    att = None
    att_explicit = re.search(r"(\d+)\s*(?:people|students|attendees|participants|log|jan|members)", lower)
    if att_explicit:
        att = int(att_explicit.group(1))
    else:
        # Fallback to general number that isn't the duration or hour
        for num_m in re.finditer(r"\b(\d+)\b", lower):
            val = int(num_m.group(1))
            if val != dur and val not in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12):
                att = val
                break

    # Day determination
    day = "MON"
    for d_key, d_val in DAYS_MAP.items():
        if re.search(rf"\b{d_key}\b", lower):
            day = d_val
            break
    if "kal" in lower:
        # Tomorrow (default to TUE if not specified)
        day = "TUE"
        notes.append("Interpreted 'kal' as Tuesday.")

    # Time / Window determination
    from_p = 10  # default evening
    to_p = from_p + dur - 1

    time_range_m = re.search(r"(\d+)\s*(?:to|-)\s*(\d+)\s*(pm|am)?", lower)
    single_time_m = re.search(r"(?:at|@)\s*(\d+)\s*(am|pm)", lower)

    if time_range_m:
        h1 = int(time_range_m.group(1))
        h2 = int(time_range_m.group(2))
        is_pm = (time_range_m.group(3) == "pm") or (h1 >= 1 and h1 <= 9 and "pm" in lower) or h1 >= 6
        if is_pm and h1 < 12:
            h1 += 12
        if is_pm and h2 < 12:
            h2 += 12
        from_p = HOUR_TO_PERIOD.get(h1, 10)
        to_p = HOUR_TO_PERIOD.get(h2, from_p + dur) - 1
        dur = max(1, to_p - from_p + 1)
    elif single_time_m:
        h = int(single_time_m.group(1))
        is_pm = (single_time_m.group(2) == "pm")
        if is_pm and h < 12:
            h += 12
        from_p = HOUR_TO_PERIOD.get(h, 3)
        to_p = from_p + dur - 1
    elif "after lunch" in lower or "afternoon" in lower:
        from_p = 6
        to_p = from_p + dur - 1
        notes.append("Assumed 'after lunch' / 'afternoon' starts at P6 (14:00).")
    elif "evening" in lower or "shaam 6" in lower or "6 pm" in lower:
        from_p = 10
        to_p = from_p + dur - 1

    windows.append({"day": day, "from_period": from_p, "to_period": to_p})

    # Missing critical info
    if att is None:
        follow_up = "Could you please specify how many attendees are expected?"

    # Mandatory groups
    mand = []
    if "mechanical third" in lower or "me-3" in lower:
        mand = ["ME-3"]
    elif "cse" in lower and "third" in lower:
        mand = ["CSE-3"]

    return ParsedBookingRequest(
        attendance=att or 50,
        duration_periods=dur,
        windows=windows,
        room_types=room_types,
        needs=needs,
        requested_room=requested_room,
        mandatory_for_groups=mand,
        title="Event Request",
        follow_up_question=follow_up,
        notes_or_assumptions=notes
    )


def parse_booking_prompt(text: str, rooms_data: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Main entry point: Attempts Gemini API call, falls back to rule parser,
    and runs deterministic checks against actual campus rooms data.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    result: Optional[ParsedBookingRequest] = None

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            prompt = f"{SYSTEM_PROMPT}\n\nUser request: \"{text}\"\n\nJSON Output:"
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ParsedBookingRequest
                )
            )
            result = ParsedBookingRequest.model_validate_json(response.text)
        except Exception as e:
            print(f"Gemini API parse failed ({e}), falling back to offline parser.")

    if result is None:
        result = rule_based_fallback_parser(text)

    # Convert to dict
    data_dict = result.model_dump()

    # Deterministic Post-Check: check for room accessibility/features conflict (e.g. Request 7)
    if rooms_data and data_dict.get("requested_room"):
        req_r_id = data_dict["requested_room"]
        room_map = {r["id"]: r for r in rooms_data}
        target_room = room_map.get(req_r_id)

        if target_room:
            # Check accessibility mismatch
            if "accessible" in data_dict.get("needs", []) and not target_room.get("accessible"):
                # Find an accessible alternative room of same type
                alt_room = next(
                    (r["id"] for r in rooms_data if r["type"] == target_room["type"] and r.get("accessible")),
                    None
                )
                if alt_room:
                    data_dict["notes_or_assumptions"].append(
                        f"Notice: {req_r_id} is not wheelchair accessible. Automatically updated requested room to {alt_room}."
                    )
                    data_dict["requested_room"] = alt_room

    return data_dict

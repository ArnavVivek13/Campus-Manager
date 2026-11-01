"""
Spectra Week Venue Booking Engine.
Allocates venue booking requests strictly by priority order, avoiding priority inversions.
Handles cancellations, displacement by institute events, alternative offerings, and structured rejection reasons.
"""
from collections import defaultdict
import copy


CAT_WEIGHT = {"institute_event": 5, "guest_lecture": 4, "department_event": 3, "club_event": 2}
MAX_PERIOD = 13
LAST_TEACHING = 9


def effective_category(data, req):
    order = data["priority_order"]
    cap = data["role_category_cap"].get(req["role"], "club_event")
    a = order.index(req["requested_category"]) if req["requested_category"] in order else len(order) - 1
    return order[max(a, order.index(cap))]


def outranks(data, r1, r2):
    """True if request r1 has priority over r2."""
    order = data["priority_order"]
    c1, c2 = order.index(effective_category(data, r1)), order.index(effective_category(data, r2))
    if c1 != c2:
        return c1 < c2
    return r1["submitted_at"] < r2["submitted_at"]


class BookingSolver:
    def __init__(self, data, base_timetable):
        self.data = data
        self.base_timetable = base_timetable  # dict of sid -> {day, start_period, room_id}
        self.days = data["calendar"]["days"]
        self.rooms = {r["id"]: r for r in data["rooms"]}
        self.sessions = {s["id"]: s for s in data["sessions"]}
        self.requests = {b["id"]: b for b in data["booking_requests"]}
        self.cancelled_ids = {c["request_id"] for c in data.get("cancellations", [])}

        # Room unavailabilities
        self.room_un = defaultdict(set)
        for u in data.get("room_unavailability", []):
            for p in u["periods"]:
                self.room_un[u["room_id"]].add((u["day"], p))

    def solve(self):
        """
        Returns (bookings, session_overrides)
        """
        # Copy base timetable for fest week
        week_timetable = {
            sid: (info["day"], info["start_period"], info["room_id"])
            for sid, info in self.base_timetable.items()
        }

        # Group occupancy from regular sessions
        grp_occ = defaultdict(set)
        for sid, (day, start, rid) in week_timetable.items():
            s = self.sessions.get(sid)
            if s:
                dur = s["duration"]
                key = s.get("basket_slot") or sid
                for p in range(start, start + dur):
                    for g in s["groups"]:
                        grp_occ[(g, day, p)].add(key)

        # Room occupancy
        room_busy = defaultdict(list)
        for sid, (day, start, rid) in week_timetable.items():
            s = self.sessions.get(sid)
            if s:
                dur = s["duration"]
                for p in range(start, start + dur):
                    room_busy[(rid, day, p)].append(sid)

        # Sort non-cancelled requests strictly by outranks
        req_list = list(self.requests.values())
        # Sort key using outranks comparator
        from functools import cmp_to_key
        def cmp_req(a, b):
            if outranks(self.data, a, b):
                return -1
            elif outranks(self.data, b, a):
                return 1
            return 0

        req_list.sort(key=cmp_to_key(cmp_req))

        decisions = []
        session_overrides = []

        # Track placed bookings
        placed_bookings = {}

        for req in req_list:
            req_id = req["id"]
            if req_id in self.cancelled_ids:
                decisions.append({
                    "request_id": req_id,
                    "status": "rejected",
                    "reason": "Request was withdrawn/cancelled by the requester"
                })
                continue

            eff_cat = effective_category(self.data, req)
            dur = req["duration_periods"]
            att = req["attendance"]
            req_needs = set(req["needs"])
            mand_groups = req.get("mandatory_for_groups", [])

            # Check if any room in institute can possibly hold this attendance
            max_inst_cap = max(r["capacity"] for r in self.rooms.values() if "event" in r["allowed_uses"])
            if att > max_inst_cap:
                decisions.append({
                    "request_id": req_id,
                    "status": "rejected",
                    "reason": f"No venue seats {att} (largest venue capacity is {max_inst_cap})"
                })
                continue

            # Candidate rooms matching hard room requirements
            def room_qualifies(room):
                if "event" not in room["allowed_uses"]:
                    return False
                if room["type"] not in req["room_types"]:
                    return False
                if room["capacity"] < att:
                    return False
                feats = set(room["features"]) | ({"accessible"} if room.get("accessible") else set())
                if req_needs - feats:
                    return False
                return True

            qualifying_rooms = [r for r in self.rooms.values() if room_qualifies(r)]
            if not qualifying_rooms:
                decisions.append({
                    "request_id": req_id,
                    "status": "rejected",
                    "reason": f"No eligible room has required features {sorted(req_needs)} and capacity >= {att}"
                })
                continue

            # Preference: preferred requested_room first if qualifying, else sort by capacity
            if req.get("requested_room") and any(r["id"] == req["requested_room"] for r in qualifying_rooms):
                qualifying_rooms.sort(key=lambda r: (0 if r["id"] == req["requested_room"] else 1, r["capacity"]))
            else:
                qualifying_rooms.sort(key=lambda r: r["capacity"])

            # Check if this request is an institute event that can displace regular classes
            is_institute_event = (eff_cat == "institute_event")

            # Try to place inside requested windows (status: "approved")
            found_approved = False
            for win in req.get("windows", []):
                w_day = win["day"]
                w_from = win["from_period"]
                w_to = win["to_period"]

                # Candidate start periods within window
                for start_p in range(w_from, w_to - dur + 2):
                    end_p = start_p + dur - 1
                    if end_p > MAX_PERIOD:
                        continue
                    pers = list(range(start_p, end_p + 1))

                    # Mandatory groups free check
                    if any(grp_occ.get((g, w_day, p)) for g in mand_groups for p in pers):
                        continue

                    for room in qualifying_rooms:
                        rid = room["id"]
                        # Maintenance check
                        if any((rid, w_day, p) in self.room_un[rid] for p in pers):
                            continue

                        # Check occupancy
                        occupants = set()
                        for p in pers:
                            for occ in room_busy[(rid, w_day, p)]:
                                occupants.add(occ)

                        if not occupants:
                            # Perfect fit!
                            for p in pers:
                                room_busy[(rid, w_day, p)].append(req_id)
                            placed_bookings[req_id] = (rid, w_day, start_p, end_p)
                            decisions.append({
                                "request_id": req_id,
                                "status": "approved",
                                "day": w_day,
                                "start_period": start_p,
                                "end_period": end_p,
                                "room_id": rid,
                                "reason": f"Approved for {eff_cat.replace('_', ' ')}"
                            })
                            found_approved = True
                            break
                        elif is_institute_event and all(occ in self.sessions for occ in occupants):
                            # Institute event can displace regular sessions!
                            # Let's try to relocate the displaced sessions
                            displaced_sessions = list(occupants)
                            relocation_ok = True
                            temp_overrides = []

                            for d_sid in displaced_sessions:
                                d_s = self.sessions[d_sid]
                                d_assign = self.base_timetable[d_sid]
                                d_day = d_assign["day"]
                                d_start = d_assign["start_period"]
                                d_dur = d_s["duration"]
                                d_pers = list(range(d_start, d_start + d_dur))

                                # Find another compatible room at the same time slot
                                relocated = False
                                for alt_r in self.rooms.values():
                                    if alt_r["id"] == rid:
                                        continue
                                    if alt_r["capacity"] < d_s["size"] or alt_r["type"] not in d_s["room_types"]:
                                        continue
                                    if d_s.get("needs_accessible") and not alt_r.get("accessible"):
                                        continue
                                    # Check alt_r availability at d_day, d_pers
                                    if any((alt_r["id"], d_day, p) in self.room_un[alt_r["id"]] for p in d_pers):
                                        continue
                                    if any(room_busy[(alt_r["id"], d_day, p)] for p in d_pers):
                                        continue
                                    # Alt room fits!
                                    temp_overrides.append({
                                        "session_id": d_sid,
                                        "day": d_day,
                                        "start_period": d_start,
                                        "room_id": alt_r["id"],
                                        "displaced_by": req_id,
                                        "d_pers": d_pers
                                    })
                                    relocated = True
                                    break
                                if not relocated:
                                    relocation_ok = False
                                    break

                            if relocation_ok:
                                # Apply displacements
                                for ovr in temp_overrides:
                                    session_overrides.append({
                                        "session_id": ovr["session_id"],
                                        "day": ovr["day"],
                                        "start_period": ovr["start_period"],
                                        "room_id": ovr["room_id"],
                                        "displaced_by": ovr["displaced_by"]
                                    })
                                    # Update room_busy
                                    for p in ovr["d_pers"]:
                                        if ovr["session_id"] in room_busy[(rid, ovr["day"], p)]:
                                            room_busy[(rid, ovr["day"], p)].remove(ovr["session_id"])
                                        room_busy[(ovr["room_id"], ovr["day"], p)].append(ovr["session_id"])

                                # Place the institute event
                                for p in pers:
                                    room_busy[(rid, w_day, p)].append(req_id)
                                placed_bookings[req_id] = (rid, w_day, start_p, end_p)
                                decisions.append({
                                    "request_id": req_id,
                                    "status": "approved",
                                    "day": w_day,
                                    "start_period": start_p,
                                    "end_period": end_p,
                                    "room_id": rid,
                                    "reason": "Approved institute event (displaced regular classes to available lecture hall)"
                                })
                                found_approved = True
                                break

                    if found_approved:
                        break
                if found_approved:
                    break

            if found_approved:
                continue

            # If not approved in requested window, search for alternative slot (status: "alternative_offered")
            found_alt = False
            # Search evening periods P10-P13 across all days first (ideal for events), then daytime
            alt_periods = list(range(10, MAX_PERIOD - dur + 2)) + list(range(1, LAST_TEACHING - dur + 2))
            for a_day in self.days:
                for a_start in alt_periods:
                    a_end = a_start + dur - 1
                    if a_end > MAX_PERIOD:
                        continue
                    a_pers = list(range(a_start, a_end + 1))

                    if any(grp_occ.get((g, a_day, p)) for g in mand_groups for p in a_pers):
                        continue

                    for room in qualifying_rooms:
                        rid = room["id"]
                        if any((rid, a_day, p) in self.room_un[rid] for p in a_pers):
                            continue
                        if any(room_busy[(rid, a_day, p)] for p in a_pers):
                            continue

                        # Alternative found!
                        for p in a_pers:
                            room_busy[(rid, a_day, p)].append(req_id)
                        placed_bookings[req_id] = (rid, a_day, a_start, a_end)
                        decisions.append({
                            "request_id": req_id,
                            "status": "alternative_offered",
                            "day": a_day,
                            "start_period": a_start,
                            "end_period": a_end,
                            "room_id": rid,
                            "reason": f"Requested slot was unavailable; offered alternative slot on {a_day} P{a_start}-P{a_end} in {rid}"
                        })
                        found_alt = True
                        break
                    if found_alt:
                        break
                if found_alt:
                    break

            if not found_alt:
                decisions.append({
                    "request_id": req_id,
                    "status": "rejected",
                    "reason": "Requested venue and all compatible rooms are fully occupied during available event windows"
                })

        return {"bookings": decisions, "session_overrides": session_overrides}


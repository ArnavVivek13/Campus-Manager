"""
Timetable Solver using Google OR-Tools CP-SAT.
Solves all sessions respecting Hard Constraints (H1-H12, H14) and
minimizing Soft Penalties (S1-S6).
"""
import copy
from collections import defaultdict
from ortools.sat.python import cp_model


class TimetableSolver:
    def __init__(self, data, time_limit_seconds=30.0, num_workers=8):
        self.data = data
        self.time_limit_seconds = time_limit_seconds
        self.num_workers = num_workers

        self.days = data["calendar"]["days"]  # ['MON', 'TUE', 'WED', 'THU', 'FRI']
        self.day_indices = {d: i for i, d in enumerate(self.days)}
        self.periods = [p["id"] for p in data["calendar"]["periods"] if p.get("teaching")]  # [1..9]
        self.lunch_after = data["calendar"]["lunch"]["after_period"]  # 5
        self.lab_starts = data["calendar"]["lab_start_periods"]  # [2, 6]

        self.rooms = {r["id"]: r for r in data["rooms"]}
        self.faculty = {f["id"]: f for f in data["faculty"]}
        self.groups = {g["id"]: g for g in data["student_groups"]}
        self.sessions = {s["id"]: s for s in data["sessions"]}

        # Unavailability sets: (id, day, period)
        self.fac_un = set()
        for f in data["faculty"]:
            for u in f.get("unavailable", []):
                for p in u["periods"]:
                    self.fac_un.add((f["id"], u["day"], p))

        self.room_un = set()
        for u in data.get("room_unavailability", []):
            for p in u["periods"]:
                self.room_un.add((u["room_id"], u["day"], p))

        # Basket slots
        self.basket_sessions = defaultdict(list)
        for s in data["sessions"]:
            if s.get("basket_slot"):
                self.basket_sessions[s["basket_slot"]].append(s["id"])

    def solve(self, baseline=None, stability_weight_time=1000, stability_weight_room=100, pinned_assignments=None):
        """
        Solves timetable.
        If baseline is provided (dict of {sid: (day, start, room)}), penalizes moves to ensure minimal perturbation.
        If pinned_assignments is provided (dict of {sid: room_id or (day, start, room)}), forces those sessions to specified placement.
        """
        model = cp_model.CpModel()

        # Build candidate (d, p, r) for each session
        session_candidates = {}
        for s in self.data["sessions"]:
            sid = s["id"]
            dur = s["duration"]
            allowed_starts = self.lab_starts if s["kind"] == "lab" else self.periods
            fx = s.get("fixed_slot")

            # Check if pinned by user in disruption re-solve
            pinned = (pinned_assignments or {}).get(sid)

            cands = []
            for d in self.days:
                if fx and fx["day"] != d:
                    continue
                if isinstance(pinned, tuple) and pinned[0] != d:
                    continue
                for p in allowed_starts:
                    if fx and fx["start_period"] != p:
                        continue
                    if isinstance(pinned, tuple) and pinned[1] != p:
                        continue
                    pers = list(range(p, p + dur))
                    if pers[-1] > max(self.periods):
                        continue
                    # Lunch check: cannot span lunch
                    if pers[0] <= self.lunch_after < pers[-1]:
                        continue
                    # Faculty unavailability
                    if any((s["faculty_id"], d, per) in self.fac_un for per in pers):
                        continue

                    # Room filtering
                    for rid, r in self.rooms.items():
                        if isinstance(pinned, str) and rid != pinned:
                            continue
                        if isinstance(pinned, tuple) and len(pinned) >= 3 and rid != pinned[2]:
                            continue
                        if r["capacity"] < s["size"]:
                            continue
                        if r["type"] not in s["room_types"]:
                            continue
                        if s.get("needs_accessible") and not r.get("accessible"):
                            continue
                        if any((rid, d, per) in self.room_un for per in pers):
                            continue
                        cands.append((d, p, rid))

            session_candidates[sid] = cands

        # Detect Level 1: Sessions with 0 candidate slots
        unsolvable_sessions = []
        for sid, cands in session_candidates.items():
            if not cands:
                s = self.sessions[sid]
                # Explain why 0 candidates exist
                reasons = []
                fid = s["faculty_id"]
                fac_un_count = sum(1 for d in self.days for p in self.periods if (fid, d, p) in self.fac_un)
                if fac_un_count >= len(self.days) * len(self.periods) * 0.8:
                    reasons.append(f"Faculty {fid} is unavailable for almost the entire teaching week ({fac_un_count} periods blocked).")
                
                eligible_rooms = [r for r in self.rooms.values() if r["capacity"] >= s["size"] and r["type"] in s["room_types"]]
                if not eligible_rooms:
                    reasons.append(f"No active room has capacity >= {s['size']} and type in {s['room_types']}.")
                else:
                    reasons.append(f"All {len(eligible_rooms)} compatible rooms ({', '.join(r['id'] for r in eligible_rooms)}) are closed/unavailable during allowable periods.")
                
                unsolvable_sessions.append({
                    "session_id": sid,
                    "detail": f"Session {sid} ({s.get('course_id')}) cannot be scheduled: " + " ".join(reasons)
                })

        if unsolvable_sessions:
            return {
                "solvable": False,
                "status": "INFEASIBLE_DOMAIN",
                "conflicts": unsolvable_sessions,
                "assignment": None,
                "objective": None
            }

        # Create Decision Variables: X[sid, d, p, r]
        X = {}
        for sid, cands in session_candidates.items():
            for (d, p, rid) in cands:
                X[(sid, d, p, rid)] = model.NewBoolVar(f"X_{sid}_{d}_{p}_{rid}")

        # H1: Exactly one assignment per session
        for sid, cands in session_candidates.items():
            model.AddExactlyOne(X[(sid, d, p, rid)] for (d, p, rid) in cands)

        # H11: Elective baskets synchronization
        # All sessions in basket_slot b must share the same (day, start_period)
        basket_time_vars = {}
        for b_slot, sids in self.basket_sessions.items():
            # Possible (day, start_period) for this basket
            b_starts = self.periods
            for d in self.days:
                for p in b_starts:
                    b_var = model.NewBoolVar(f"Basket_{b_slot}_{d}_{p}")
                    basket_time_vars[(b_slot, d, p)] = b_var

            # Exactly one (d, p) for the basket
            model.AddExactlyOne(basket_time_vars[(b_slot, d, p)] for d in self.days for p in b_starts)

            # Link every session in the basket to this basket_time_var
            for sid in sids:
                for d in self.days:
                    for p in b_starts:
                        matching_x = [
                            X[(sid, d, p, rid)]
                            for (d_c, p_c, rid) in session_candidates[sid]
                            if d_c == d and p_c == p
                        ]
                        if matching_x:
                            model.Add(sum(matching_x) == basket_time_vars[(b_slot, d, p)])
                        else:
                            # If session has no valid rooms at this (d, p), then basket cannot be at (d, p)
                            model.Add(basket_time_vars[(b_slot, d, p)] == 0)

        # Precompute activity mappings: (resource, day, period) -> list of X variables
        room_period_activity = defaultdict(list)
        fac_period_activity = defaultdict(list)
        group_period_activity = defaultdict(list)
        fac_day_hours = defaultdict(list)

        for sid, cands in session_candidates.items():
            s = self.sessions[sid]
            dur = s["duration"]
            fid = s["faculty_id"]
            b_slot = s.get("basket_slot")

            for (d, p, rid) in cands:
                var = X[(sid, d, p, rid)]
                # Faculty day hours
                fac_day_hours[(fid, d)].append(dur * var)

                for t in range(p, p + dur):
                    room_period_activity[(rid, d, t)].append(var)
                    fac_period_activity[(fid, d, t)].append(var)

                    if not b_slot:
                        for g in s["groups"]:
                            group_period_activity[(g, d, t)].append(var)

        # Add basket active variable to groups
        for b_slot, sids in self.basket_sessions.items():
            first_s = self.sessions[sids[0]]
            dur = first_s["duration"]
            groups = first_s["groups"]
            for d in self.days:
                for p in self.periods:
                    b_var = basket_time_vars[(b_slot, d, p)]
                    for t in range(p, min(p + dur, max(self.periods) + 1)):
                        for g in groups:
                            group_period_activity[(g, d, t)].append(b_var)

        # H4: Room no double booking
        for (rid, d, t), vars_list in room_period_activity.items():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)

        # H2: Faculty no double booking
        for (fid, d, t), vars_list in fac_period_activity.items():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)

        # H3: Student group no double booking
        for (g, d, t), vars_list in group_period_activity.items():
            if len(vars_list) > 1:
                model.Add(sum(vars_list) <= 1)

        # H12: Faculty max hours per day
        for (fid, d), weighted_vars in fac_day_hours.items():
            mx = self.faculty[fid].get("max_hours_per_day", 4)
            model.Add(sum(weighted_vars) <= mx)

        # ------------------- Objective Formulation (Soft Penalties) -------------------
        obj_terms = []

        # S1: Faculty preferences (avoid) - 2 points per hour in avoided period
        for sid, cands in session_candidates.items():
            s = self.sessions[sid]
            fid = s["faculty_id"]
            dur = s["duration"]
            prefs = self.faculty[fid].get("preferences", [])
            for (d, p, rid) in cands:
                cost = 0
                pers = range(p, p + dur)
                for pref in prefs:
                    if pref.get("type") == "avoid" and d in pref.get("days", self.days):
                        cost += 2 * sum(1 for per in pers if per in pref.get("periods", []))
                if cost > 0:
                    obj_terms.append(cost * X[(sid, d, p, rid)])

        # S5: Room capacity < 40% - 1 point
        for sid, cands in session_candidates.items():
            s = self.sessions[sid]
            for (d, p, rid) in cands:
                r_cap = self.rooms[rid]["capacity"]
                if r_cap > 0 and (s["size"] / r_cap) < 0.4:
                    obj_terms.append(1 * X[(sid, d, p, rid)])

        # S6: Class scheduled in P9 - 1 point
        for sid, cands in session_candidates.items():
            dur = self.sessions[sid]["duration"]
            for (d, p, rid) in cands:
                if 9 in range(p, p + dur):
                    obj_terms.append(1 * X[(sid, d, p, rid)])

        # S4: Same course lecture twice in a day for student group - 3 points per duplicate
        course_group_days = defaultdict(list)
        for sid, cands in session_candidates.items():
            s = self.sessions[sid]
            if s["kind"] == "lecture" and not s.get("basket_slot"):
                cid = s["course_id"]
                for g in s["groups"]:
                    for (d, p, rid) in cands:
                        course_group_days[(cid, g, d)].append(X[(sid, d, p, rid)])

        for (cid, g, d), var_list in course_group_days.items():
            if len(var_list) > 1:
                dup_var = model.NewIntVar(0, len(var_list), f"dup_{cid}_{g}_{d}")
                model.Add(dup_var >= sum(var_list) - 1)
                obj_terms.append(3 * dup_var)

        # S4 for basket courses:
        basket_courses = defaultdict(set)
        for b_slot, sids in self.basket_sessions.items():
            for sid in sids:
                basket_courses[self.sessions[sid]["course_id"]].add(b_slot)

        for cid, b_slots in basket_courses.items():
            for d in self.days:
                active_vars = [basket_time_vars[(b, d, p)] for b in b_slots for p in self.periods]
                if len(active_vars) > 1:
                    b_dup = model.NewIntVar(0, len(active_vars), f"b_dup_{cid}_{d}")
                    model.Add(b_dup >= sum(active_vars) - 1)
                    obj_terms.append(3 * b_dup)

        # S3: Student group class hours > 6 in a day - 3 points per hour over 6
        group_day_hours = defaultdict(list)
        for sid, cands in session_candidates.items():
            s = self.sessions[sid]
            dur = s["duration"]
            if not s.get("basket_slot"):
                for g in s["groups"]:
                    for (d, p, rid) in cands:
                        group_day_hours[(g, d)].append(dur * X[(sid, d, p, rid)])

        for b_slot, sids in self.basket_sessions.items():
            first_s = self.sessions[sids[0]]
            dur = first_s["duration"]
            for g in first_s["groups"]:
                for d in self.days:
                    for p in self.periods:
                        group_day_hours[(g, d)].append(dur * basket_time_vars[(b_slot, d, p)])

        for (g, d), hr_vars in group_day_hours.items():
            over_6 = model.NewIntVar(0, 9, f"over6_{g}_{d}")
            model.Add(over_6 >= sum(hr_vars) - 6)
            obj_terms.append(3 * over_6)

        # S2: Gaps between classes on the same day for a student group (1 pt per gap period)
        for g in self.groups:
            for d in self.days:
                # Active periods for (g, d)
                day_t_vars = []
                for t in self.periods:
                    act_vars = group_period_activity.get((g, d, t), [])
                    if act_vars:
                        # act_vars sum <= 1 due to H3
                        t_is_active = model.NewBoolVar(f"grp_act_{g}_{d}_{t}")
                        model.Add(sum(act_vars) == t_is_active)
                        day_t_vars.append((t, t_is_active))

                if day_t_vars:
                    first_p = model.NewIntVar(1, 9, f"first_p_{g}_{d}")
                    last_p = model.NewIntVar(1, 9, f"last_p_{g}_{d}")
                    day_has_class = model.NewBoolVar(f"has_class_{g}_{d}")

                    # If has_class is 0, sum of t_is_active is 0
                    model.Add(sum(var for _, var in day_t_vars) >= 1).OnlyEnforceIf(day_has_class)
                    model.Add(sum(var for _, var in day_t_vars) == 0).OnlyEnforceIf(day_has_class.Not())

                    for t, t_var in day_t_vars:
                        model.Add(first_p <= t).OnlyEnforceIf(t_var)
                        model.Add(last_p >= t).OnlyEnforceIf(t_var)

                    span = model.NewIntVar(0, 9, f"span_{g}_{d}")
                    model.Add(span >= last_p - first_p + 1).OnlyEnforceIf(day_has_class)
                    model.Add(span == 0).OnlyEnforceIf(day_has_class.Not())

                    gap = model.NewIntVar(0, 9, f"gap_{g}_{d}")
                    model.Add(gap >= span - sum(var for _, var in day_t_vars))
                    obj_terms.append(1 * gap)

        # Stability Objective (if baseline provided for disruption/rescheduling)
        if baseline:
            for sid, (b_day, b_start, b_room) in baseline.items():
                if sid in session_candidates:
                    for (d, p, rid) in session_candidates[sid]:
                        var = X[(sid, d, p, rid)]
                        time_changed = (d != b_day or p != b_start)
                        room_changed = (rid != b_room)
                        if time_changed:
                            obj_terms.append(stability_weight_time * var)
                        elif room_changed:
                            obj_terms.append(stability_weight_room * var)

        # Minimize total objective
        model.Minimize(sum(obj_terms))

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.time_limit_seconds
        solver.parameters.num_workers = self.num_workers
        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {
                "solvable": False,
                "status": f"INFEASIBLE ({solver.StatusName(status)})",
                "conflicts": [
                    {
                        "session_id": "System Wide",
                        "detail": "Resource bottleneck detected: The combined combination of faculty leaves, room closures, and max daily teaching hours creates an unavoidable schedule conflict."
                    }
                ],
                "assignment": None,
                "objective": None
            }

        # Extract Assignment
        assignment = {}
        for sid, cands in session_candidates.items():
            for (d, p, rid) in cands:
                if solver.Value(X[(sid, d, p, rid)]) == 1:
                    assignment[sid] = {"day": d, "start_period": p, "room_id": rid}
                    break

        return {
            "solvable": True,
            "status": solver.StatusName(status),
            "conflicts": [],
            "assignment": assignment,
            "objective": solver.ObjectiveValue()
        }

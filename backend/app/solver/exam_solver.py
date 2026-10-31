"""
Exam Solver using Google OR-Tools CP-SAT.
Schedules midsem exams over Mon-Sat AM/PM slots respecting:
- Halved room capacity (floor(capacity / 2))
- Multi-room assignment per exam
- No group double-booking per slot
- No room double-booking per slot
- Minimizes student groups having multiple exams on the same day.
"""
from collections import defaultdict
from ortools.sat.python import cp_model


class ExamSolver:
    def __init__(self, data, time_limit_seconds=20.0, num_workers=8):
        self.data = data
        self.time_limit_seconds = time_limit_seconds
        self.num_workers = num_workers

        self.exams = {e["id"]: e for e in data.get("exams", [])}
        self.cal = data["calendar"]["exam_week"]
        self.days = self.cal["days"]  # MON..SAT
        self.sessions = [s["id"] for s in self.cal["sessions"]]  # AM, PM
        self.slots = [(d, s) for d in self.days for s in self.sessions]  # 12 slots

        # Rooms allowed for exam
        self.exam_rooms = {
            r["id"]: r for r in data["rooms"] if "exam" in r.get("allowed_uses", [])
        }

    def solve(self):
        if not self.exams:
            return []

        model = cp_model.CpModel()

        # Decision Variables:
        # Z[e, t] = 1 if exam e is in slot t=(day, sess)
        Z = {}
        for eid in self.exams:
            for t in self.slots:
                Z[(eid, t)] = model.NewBoolVar(f"Z_{eid}_{t[0]}_{t[1]}")

        # R[e, r, t] = 1 if exam e uses room r in slot t
        R = {}
        for eid in self.exams:
            for rid in self.exam_rooms:
                for t in self.slots:
                    R[(eid, rid, t)] = model.NewBoolVar(f"R_{eid}_{rid}_{t[0]}_{t[1]}")

        # E1: Every exam scheduled exactly once in a slot
        for eid in self.exams:
            model.AddExactlyOne(Z[(eid, t)] for t in self.slots)

        # Capacity Check (H5) & room usage linkage
        for eid, ex in self.exams.items():
            req_size = ex["size"]
            for t in self.slots:
                z_var = Z[(eid, t)]
                # Link R to Z: room can only be used if exam is in slot t
                for rid in self.exam_rooms:
                    model.Add(R[(eid, rid, t)] <= z_var)

                # Total seats in slot t must be at least req_size if z_var == 1
                total_seats = sum(
                    (self.exam_rooms[rid]["capacity"] // 2) * R[(eid, rid, t)]
                    for rid in self.exam_rooms
                )
                model.Add(total_seats >= req_size * z_var)

        # Room no double booking (H4)
        for rid in self.exam_rooms:
            for t in self.slots:
                model.Add(sum(R[(eid, rid, t)] for eid in self.exams) <= 1)

        # Group no double booking (H3)
        group_exams = defaultdict(list)
        for eid, ex in self.exams.items():
            for g in ex["groups"]:
                group_exams[g].append(eid)

        for g, eids in group_exams.items():
            for t in self.slots:
                model.Add(sum(Z[(eid, t)] for eid in eids) <= 1)

        # Soft objective: minimize groups having 2 exams on the same day (5 pts per extra)
        # Also slight penalty for using more rooms (to prefer clean, minimal room assignments)
        obj_terms = []
        for g, eids in group_exams.items():
            for d in self.days:
                # count exams on day d
                day_exam_vars = [Z[(eid, (d, s))] for eid in eids for s in self.sessions]
                if len(day_exam_vars) > 1:
                    excess = model.NewIntVar(0, len(day_exam_vars), f"ex_excess_{g}_{d}")
                    model.Add(excess >= sum(day_exam_vars) - 1)
                    obj_terms.append(50 * excess)  # weight 50 for same day exam penalty

        # Minimal room usage weight (weight 1 per extra room)
        for (eid, rid, t), var in R.items():
            obj_terms.append(1 * var)

        model.Minimize(sum(obj_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.time_limit_seconds
        solver.parameters.num_workers = self.num_workers
        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise RuntimeError(f"Exam solver failed! Status: {solver.StatusName(status)}")

        # Build output schedule for exams
        out_exams = []
        for eid in self.exams:
            for t in self.slots:
                if solver.Value(Z[(eid, t)]) == 1:
                    used_rooms = [
                        rid for rid in self.exam_rooms if solver.Value(R[(eid, rid, t)]) == 1
                    ]
                    out_exams.append({
                        "exam_id": eid,
                        "day": t[0],
                        "session": t[1],
                        "rooms": used_rooms
                    })
                    break

        return out_exams


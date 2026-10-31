"""
Full Schedule Generation Pipeline.
Runs TimetableSolver, ExamSolver, BookingSolver, and Rescheduler
to generate exports/schedule.json and exports/schedule_after.json.
"""
import copy
import json
import os
import sys

# Ensure root directory and starter pack are accessible
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("CrunchWeek_StarterPack"))
import validator

from backend.app.solver.timetable_solver import TimetableSolver
from backend.app.solver.exam_solver import ExamSolver
from backend.app.solver.booking_solver import BookingSolver


def generate_baseline_schedule(data_path="CrunchWeek_StarterPack/data/cit_public.json", team_name="Zephyr"):
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("Step 1: Solving Master Timetable...")
    t_solver = TimetableSolver(data, time_limit_seconds=25.0)
    t_res = t_solver.solve()
    if not t_res["solvable"]:
        raise RuntimeError(f"Master timetable is unsolvable! Conflicts: {t_res['conflicts']}")
    assign = t_res["assignment"]

    print("Step 2: Scheduling Midsem Exams...")
    e_solver = ExamSolver(data, time_limit_seconds=15.0)
    exams = e_solver.solve()

    print("Step 3: Allocating Spectra Fest Week Bookings...")
    b_solver = BookingSolver(data, assign)
    fest_week = b_solver.solve()

    schedule = {
        "team": team_name,
        "dataset_id": data["dataset_id"],
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

    os.makedirs("exports", exist_ok=True)
    out_path = "exports/schedule.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(schedule, f, indent=2)

    print(f"Generated {out_path} successfully!")

    # Validate
    rep = validator.run(data, schedule)
    print("\n" + "="*50)
    print("VALIDATOR RESULTS FOR schedule.json:")
    print(f"Hard Violations: {rep['hard_violation_count']} {rep.get('hard_by_rule', {})}")
    for h in rep.get("hard_violations", []):
        print(f"  [{h['rule']}] {h['detail']}")
    print(f"Soft Penalty Total: {rep['soft_total']} {rep.get('soft_penalties', {})}")
    if "bookings" in rep:
        b = rep["bookings"]
        print(f"Bookings Score: {b['booking_score']}/{b['booking_score_max_if_all_approved']} "
              f"(Approved: {b['approved']}, Alternatives: {b['alternatives']}, Rejected: {b['rejected']}, "
              f"Inversions: {len(b['priority_inversions'])})")
    if "exam_soft_penalty" in rep:
        print(f"Exam Soft Penalty: {rep['exam_soft_penalty']}")
    print("="*50 + "\n")

    return data, schedule, assign


def generate_disruption_schedule(data, baseline_schedule, baseline_assign,
                                 disruption_path="CrunchWeek_StarterPack/examples/sample_disruption.json",
                                 team_name="Zephyr"):
    with open(disruption_path, "r", encoding="utf-8") as f:
        disruption = json.load(f)

    print("Step 4: Applying Disruption to Dataset...")
    dis_data = validator.apply_disruption(data, disruption)

    print("Step 5: Re-solving Timetable with Minimal Perturbation...")
    # Baseline assignment format for solver: {sid: (day, start, room)}
    baseline_tuples = {
        sid: (info["day"], info["start_period"], info["room_id"])
        for sid, info in baseline_assign.items()
    }

    t_solver = TimetableSolver(dis_data, time_limit_seconds=25.0)
    re_res = t_solver.solve(baseline=baseline_tuples, stability_weight_time=1000, stability_weight_room=100)
    if not re_res["solvable"]:
        print(f"WARNING: Disruption could not be resolved! Conflicts: {re_res['conflicts']}")
        return None
    re_assign = re_res["assignment"]

    # Re-solve bookings against the repaired timetable
    b_solver = BookingSolver(dis_data, re_assign)
    fest_week = b_solver.solve()

    schedule_after = {
        "team": team_name,
        "dataset_id": dis_data["dataset_id"],
        "sessions": [
            {
                "session_id": sid,
                "day": val["day"],
                "start_period": val["start_period"],
                "room_id": val["room_id"]
            }
            for sid, val in re_assign.items()
        ],
        "fest_week": fest_week,
        "exams": baseline_schedule.get("exams", [])
    }

    out_path = "exports/schedule_after.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(schedule_after, f, indent=2)

    print(f"Generated {out_path} successfully!")

    # Validate against baseline
    rep = validator.run(dis_data, schedule_after, baseline=baseline_schedule)
    print("\n" + "="*50)
    print("VALIDATOR RESULTS FOR schedule_after.json (AFTER DISRUPTION):")
    print(f"Hard Violations: {rep['hard_violation_count']} {rep.get('hard_by_rule', {})}")
    for h in rep.get("hard_violations", []):
        print(f"  [{h['rule']}] {h['detail']}")
    print(f"Soft Penalty Total: {rep['soft_total']} {rep.get('soft_penalties', {})}")
    if "stability" in rep:
        s = rep["stability"]
        print(f"Stability: {s['sessions_moved']} moved ({s['time_changed']} time changed, {s['room_only_changed']} room only)")
        print(f"Moved Session IDs: {s['moved_ids']}")
    if "bookings" in rep:
        b = rep["bookings"]
        print(f"Bookings Score: {b['booking_score']}/{b['booking_score_max_if_all_approved']}")
    print("="*50 + "\n")

    return schedule_after


if __name__ == "__main__":
    data, sched, assign = generate_baseline_schedule()
    generate_disruption_schedule(data, sched, assign)

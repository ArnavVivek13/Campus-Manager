import json
import logging
from sqlalchemy.orm import Session
from backend.app.db.models import (
    Room, Faculty, StudentGroup, Course, SessionModel, ExamModel, BookingModel, DatasetState, ScheduleVersion
)

logger = logging.getLogger(__name__)

def sync_dataset_to_db(db: Session, dataset: dict, set_as_active: bool = True) -> DatasetState:
    """
    Atomically upserts all rooms, faculty, student groups, courses, sessions,
    and exams from a CrunchWeek dataset dictionary into SQL tables.
    """
    dataset_id = dataset.get("dataset_id", "default")
    institute = dataset.get("institute", "CIT")
    calendar = dataset.get("calendar", {})

    # 1. Dataset State
    ds_state = db.query(DatasetState).filter(DatasetState.dataset_id == dataset_id).first()
    if not ds_state:
        ds_state = DatasetState(
            dataset_id=dataset_id,
            institute_name=institute,
            calendar_json=json.dumps(calendar),
            raw_dataset_json=json.dumps(dataset),
            is_active=set_as_active
        )
        db.add(ds_state)
    else:
        ds_state.institute_name = institute
        ds_state.calendar_json = json.dumps(calendar)
        ds_state.raw_dataset_json = json.dumps(dataset)
        if set_as_active:
            db.query(DatasetState).update({DatasetState.is_active: False})
            ds_state.is_active = True

    # 2. Rooms
    for r in dataset.get("rooms", []):
        room_obj = db.query(Room).filter(Room.id == r["id"]).first()
        if not room_obj:
            room_obj = Room(id=r["id"])
            db.add(room_obj)
        room_obj.name = r.get("name", r["id"])
        room_obj.building = r.get("building", "")
        room_obj.room_type = r.get("type", "classroom")
        room_obj.capacity = r.get("capacity", 50)
        room_obj.features_json = json.dumps(r.get("features", []))
        room_obj.equipment = ", ".join(r.get("features", []))
        room_obj.accessible = r.get("accessible", True)
        room_obj.allowed_uses_json = json.dumps(r.get("allowed_uses", []))

    # 3. Faculty
    for f in dataset.get("faculty", []):
        fac_obj = db.query(Faculty).filter(Faculty.id == f["id"]).first()
        if not fac_obj:
            fac_obj = Faculty(id=f["id"])
            db.add(fac_obj)
        fac_obj.name = f.get("name", f["id"])
        fac_obj.department = f.get("department", "General")
        fac_obj.max_daily_hours = f.get("max_hours_per_day", 4)
        fac_obj.needs_accessible = f.get("needs_accessible", False)
        fac_obj.unavailable_json = json.dumps(f.get("unavailable", []))

    # 4. Student Groups
    for g in dataset.get("student_groups", []):
        grp_obj = db.query(StudentGroup).filter(StudentGroup.id == g["id"]).first()
        if not grp_obj:
            grp_obj = StudentGroup(id=g["id"])
            db.add(grp_obj)
        grp_obj.name = g.get("name", g["id"])
        grp_obj.strength = g.get("size", 50)
        grp_obj.department = g.get("department", "General")
        grp_obj.year = g.get("year", 1)
        grp_obj.needs_accessible = g.get("needs_accessible", False)

    # 5. Courses
    for c in dataset.get("courses", []):
        course_obj = db.query(Course).filter(Course.id == c["id"]).first()
        if not course_obj:
            course_obj = Course(id=c["id"])
            db.add(course_obj)
        course_obj.title = c.get("title", c["id"])
        course_obj.department = c.get("department", "General")
        course_obj.year = c.get("year", 1)
        course_obj.lecture_hours = c.get("lecture_hours", 3)
        course_obj.tutorial_hours = c.get("tutorial_hours", 0)
        course_obj.lab_blocks = c.get("lab_blocks", 0)

    # 6. Sessions (Academic catalog)
    course_map = {c["id"]: c.get("title", c["id"]) for c in dataset.get("courses", [])}
    for s in dataset.get("sessions", []):
        sid = s["id"]
        cid = s.get("course_id", "")
        cname = course_map.get(cid, cid)
        sess_obj = db.query(SessionModel).filter(SessionModel.id == sid).first()
        if not sess_obj:
            sess_obj = SessionModel(id=sid)
            db.add(sess_obj)
        sess_obj.course_id = cid
        sess_obj.course_code = cid
        sess_obj.course_name = cname
        sess_obj.kind = s.get("kind", "lecture")
        sess_obj.groups_json = json.dumps(s.get("groups", []))
        sess_obj.faculty_id = s.get("faculty_id", "")
        sess_obj.size = s.get("size", 0)
        sess_obj.duration = s.get("duration", 1)
        sess_obj.basket_slot = s.get("basket_slot")
        sess_obj.fixed_slot_json = json.dumps(s.get("fixed_slot")) if s.get("fixed_slot") else None

    # 7. Booking Requests
    for br in dataset.get("booking_requests", []):
        brid = br["id"]
        b_obj = db.query(BookingModel).filter(BookingModel.id == brid).first()
        if not b_obj:
            b_obj = BookingModel(id=brid)
            db.add(b_obj)
        b_obj.event_name = br.get("title", brid)
        b_obj.requester = br.get("requester", "")
        b_obj.club_name = br.get("department") or br.get("requester", "")
        b_obj.role = br.get("role", "club")
        b_obj.requested_category = br.get("requested_category", "club_event")
        b_obj.attendance = br.get("attendance", 50)
        b_obj.duration_periods = br.get("duration_periods", 1)
        b_obj.requested_slot = br.get("raw_text") or str(br.get("windows", []))
        b_obj.needs_json = json.dumps(br.get("needs", []))
        b_obj.windows_json = json.dumps(br.get("windows", []))

    db.commit()
    return ds_state


def sync_schedule_to_db(db: Session, schedule_dict: dict, version_tag: str = "baseline", set_as_active: bool = True) -> ScheduleVersion:
    """
    Atomically updates session placements, exam schedules, and booking decisions in SQL tables,
    and commits a ScheduleVersion record.
    """
    dataset_id = schedule_dict.get("dataset_id", "default")

    # 1. Update Session Placements
    for s_entry in schedule_dict.get("sessions", []):
        sid = s_entry.get("session_id")
        sess_obj = db.query(SessionModel).filter(SessionModel.id == sid).first()
        if sess_obj:
            sess_obj.day = s_entry.get("day")
            sess_obj.start_period = s_entry.get("start_period")
            sess_obj.room_id = s_entry.get("room_id")
            sess_obj.status = "Confirmed"

    # 2. Update Exams
    for ex in schedule_dict.get("exams", []):
        eid = ex.get("exam_id")
        exam_obj = db.query(ExamModel).filter(ExamModel.id == eid).first()
        if not exam_obj:
            exam_obj = ExamModel(id=eid)
            db.add(exam_obj)
        exam_obj.day = ex.get("day", "MON")
        exam_obj.slot = ex.get("session", "AM")
        exam_obj.rooms_json = json.dumps(ex.get("rooms", []))
        exam_obj.course_ids_json = json.dumps(ex.get("course_ids", []))
        exam_obj.course_name = ", ".join(ex.get("course_ids", []))
        exam_obj.groups_json = json.dumps(ex.get("groups", []))
        exam_obj.size = ex.get("size", 0)

    # 3. Update Bookings
    fest_week = schedule_dict.get("fest_week", {})
    for b_dec in fest_week.get("bookings", []):
        brid = b_dec.get("request_id")
        b_obj = db.query(BookingModel).filter(BookingModel.id == brid).first()
        if b_obj:
            b_obj.status = b_dec.get("status", "pending")
            b_obj.assigned_day = b_dec.get("day")
            b_obj.assigned_start_period = b_dec.get("start_period")
            b_obj.assigned_end_period = b_dec.get("end_period")
            b_obj.assigned_venue = b_dec.get("room_id") or "—"
            b_obj.reason = b_dec.get("reason", "")

    # 4. Schedule Version record
    if set_as_active:
        db.query(ScheduleVersion).filter(ScheduleVersion.dataset_id == dataset_id).update({ScheduleVersion.is_active: False})

    sched_ver = db.query(ScheduleVersion).filter(
        ScheduleVersion.dataset_id == dataset_id,
        ScheduleVersion.version_tag == version_tag
    ).first()

    if not sched_ver:
        sched_ver = ScheduleVersion(
            dataset_id=dataset_id,
            version_tag=version_tag,
            schedule_json=json.dumps(schedule_dict),
            is_active=set_as_active
        )
        db.add(sched_ver)
    else:
        sched_ver.schedule_json = json.dumps(schedule_dict)
        sched_ver.is_active = set_as_active

    db.commit()
    return sched_ver


def load_schedule_from_db(db: Session, version_tag: str = "baseline") -> dict:
    """
    Reconstructs the full schedule dictionary (sessions, exams, fest_week)
    strictly from the SQL DBMS for the given version.
    """
    sched_ver = db.query(ScheduleVersion).filter(
        ScheduleVersion.version_tag == version_tag,
        ScheduleVersion.is_active == True
    ).first()

    if not sched_ver:
        sched_ver = db.query(ScheduleVersion).filter(ScheduleVersion.version_tag == version_tag).first()

    if sched_ver and sched_ver.schedule_json:
        try:
            return json.loads(sched_ver.schedule_json)
        except Exception:
            pass

    # Reconstruct from tables
    dataset_state = db.query(DatasetState).filter(DatasetState.is_active == True).first()
    dataset_id = dataset_state.dataset_id if dataset_state else "empty"

    sessions = []
    for s in db.query(SessionModel).filter(SessionModel.room_id.isnot(None)).all():
        sessions.append({
            "session_id": s.id,
            "day": s.day,
            "start_period": s.start_period,
            "room_id": s.room_id
        })

    exams = []
    for e in db.query(ExamModel).all():
        exams.append({
            "exam_id": e.id,
            "day": e.day,
            "session": e.slot,
            "rooms": json.loads(e.rooms_json) if e.rooms_json else [],
            "course_ids": json.loads(e.course_ids_json) if e.course_ids_json else [],
            "groups": json.loads(e.groups_json) if e.groups_json else [],
            "size": e.size
        })

    bookings = []
    for b in db.query(BookingModel).all():
        bookings.append({
            "request_id": b.id,
            "status": b.status,
            "day": b.assigned_day,
            "start_period": b.assigned_start_period,
            "end_period": b.assigned_end_period,
            "room_id": b.assigned_venue if b.assigned_venue != "—" else None,
            "reason": b.reason
        })

    return {
        "team": "Zephyr",
        "dataset_id": dataset_id,
        "sessions": sessions,
        "fest_week": {
            "bookings": bookings,
            "session_overrides": []
        },
        "exams": exams
    }


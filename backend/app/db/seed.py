from sqlalchemy.orm import Session
from backend.app.db.session import engine, SessionLocal, Base
from backend.app.db.models import User, RoleEnum, Room, Faculty, StudentGroup, SessionModel, ExamModel, BookingModel, DisruptionLog
from backend.app.auth.security import hash_password

def init_db():
    """
    Initializes tables.
    Keeps schedule and operational data empty by default.
    Only seeds the default administrator account if no users exist.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default Admin account if fresh
        if db.query(User).count() == 0:
            admin_user = User(
                email="admin@cit.edu",
                hashed_password=hash_password("Admin@123"),
                full_name="CIT Academic Operations / Dean",
                role=RoleEnum.ADMIN,
                department="Academic Affairs",
                is_active=True,
                oauth_provider="local"
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()


def seed_baseline_records(db: Session):
    """
    Populates baseline rooms, faculty, groups, sessions, exams, and bookings
    when requested by an Administrator via 'Restore Baseline'.
    """
    # 1. Rooms
    if db.query(Room).count() == 0:
        rooms_data = [
            Room(id="LH-1", name="Lecture Hall 1", capacity=120, room_type="Lecture Hall", equipment="Projector, PA System"),
            Room(id="LH-2", name="Lecture Hall 2", capacity=90, room_type="Lecture Hall", equipment="Projector, PA System"),
            Room(id="LH-3", name="Lecture Hall 3", capacity=90, room_type="Lecture Hall", equipment="Projector, Audio"),
            Room(id="LAB-1", name="Computing Systems Lab", capacity=60, room_type="Lab", equipment="Workstations, Linux GPU"),
            Room(id="LAB-2", name="Software Engineering Lab", capacity=60, room_type="Lab", equipment="Workstations"),
            Room(id="LAB-3", name="Hardware & IoT Lab", capacity=50, room_type="Lab", equipment="FPGA Kits, Oscilloscopes"),
            Room(id="AUD", name="Pushpagiri Main Auditorium", capacity=420, room_type="Auditorium", equipment="Stage, High-Lumen Projector, Line-Array Sound"),
            Room(id="AMPH", name="Campus Open Amphitheatre", capacity=500, room_type="Amphitheatre", equipment="Open-Air Acoustics"),
            Room(id="SEM-HALL", name="Central Seminar Hall", capacity=120, room_type="Seminar Hall", equipment="Dual Screen, Conference Mic"),
        ]
        db.add_all(rooms_data)

    # 2. Faculty
    if db.query(Faculty).count() == 0:
        faculty_data = [
            Faculty(id="F01", name="Dr. Arvind Rao", department="CSE", max_daily_hours=4),
            Faculty(id="F02", name="Dr. Sunita Sen", department="CSE", max_daily_hours=4),
            Faculty(id="F03", name="Prof. Rajesh K.", department="CSE", max_daily_hours=4),
            Faculty(id="F07", name="Dr. Meera Patel", department="Mathematics", max_daily_hours=4),
            Faculty(id="F08", name="Prof. David Nair", department="Humanities", max_daily_hours=4),
        ]
        db.add_all(faculty_data)

    # 3. Student Groups
    if db.query(StudentGroup).count() == 0:
        groups_data = [
            StudentGroup(id="CSE-2", name="B.Tech Computer Science Year 2", strength=60, department="CSE", year=2),
            StudentGroup(id="CSE-3", name="B.Tech Computer Science Year 3", strength=55, department="CSE", year=3),
            StudentGroup(id="ECE-2", name="B.Tech Electronics Year 2", strength=58, department="ECE", year=2),
        ]
        db.add_all(groups_data)

    # 4. Sessions
    if db.query(SessionModel).count() == 0:
        sessions_data = [
            SessionModel(id="SES-01", course_code="CS201", course_name="Data Structures", group_id="CSE-2", faculty_id="F01", room_id="LH-1", day=0, start_hour=9.0, end_hour=10.5, category="Core", status="Confirmed"),
            SessionModel(id="SES-02", course_code="MA201", course_name="Discrete Mathematics", group_id="CSE-2", faculty_id="F07", room_id="LH-1", day=0, start_hour=11.0, end_hour=12.5, category="Math", status="Confirmed"),
            SessionModel(id="SES-03", course_code="HS201", course_name="Technical Writing", group_id="CSE-2", faculty_id="F08", room_id="LH-2", day=0, start_hour=14.0, end_hour=15.5, category="Humanities", status="Confirmed"),
            SessionModel(id="SES-04", course_code="CS204", course_name="Data Structures Lab", group_id="CSE-2", faculty_id="F02", room_id="LAB-1", day=0, start_hour=12.0, end_hour=15.0, category="Lab", status="Confirmed"),
            SessionModel(id="SES-05", course_code="CS207", course_name="AI Fundamentals", group_id="CSE-2", faculty_id="F03", room_id="LH-1", day=1, start_hour=9.0, end_hour=10.5, category="Core", status="Confirmed"),
            SessionModel(id="SES-06", course_code="ME201", course_name="Manufacturing Lab", group_id="CSE-2", faculty_id="F03", room_id="LAB-1", day=1, start_hour=9.0, end_hour=12.0, category="Lab", status="Confirmed"),
            SessionModel(id="SES-07", course_code="CS205", course_name="Operating Systems", group_id="CSE-2", faculty_id="F02", room_id="LH-1", day=2, start_hour=9.0, end_hour=10.5, category="Core", status="Confirmed"),
            SessionModel(id="SES-08", course_code="CS208", course_name="OS Systems Lab", group_id="CSE-2", faculty_id="F02", room_id="LAB-2", day=2, start_hour=14.0, end_hour=17.0, category="Lab", status="Confirmed"),
            SessionModel(id="SES-09", course_code="CS203", course_name="Computer Networks", group_id="CSE-2", faculty_id="F01", room_id="LH-1", day=3, start_hour=9.0, end_hour=10.5, category="Core", status="Confirmed"),
            SessionModel(id="SES-10", course_code="PE101", course_name="Professional Ethics", group_id="CSE-2", faculty_id="F08", room_id="LH-2", day=4, start_hour=16.0, end_hour=17.0, category="Humanities", status="Confirmed"),
        ]
        db.add_all(sessions_data)

    # 5. Exams
    if db.query(ExamModel).count() == 0:
        exams_data = [
            ExamModel(course_code="CS201", course_name="Data Structures", day="MON", slot="AM", groups="CSE-2, CSE-3", rooms="LH-1 · LH-2", status="Confirmed"),
            ExamModel(course_code="MA202", course_name="Discrete Mathematics", day="MON", slot="PM", groups="CSE-2, ECE-2", rooms="LH-1 · LH-2", status="Confirmed"),
            ExamModel(course_code="CS203", course_name="Computer Networks", day="TUE", slot="AM", groups="CSE-2", rooms="LH-1", status="Confirmed"),
            ExamModel(course_code="CS205", course_name="Operating Systems", day="WED", slot="PM", groups="CSE-2, CSE-3", rooms="LH-1 · LH-2", status="Confirmed"),
            ExamModel(course_code="HS201", course_name="Technical Writing", day="THU", slot="AM", groups="All Year 2", rooms="LH-1 · LH-2 · LH-3", status="Confirmed"),
            ExamModel(course_code="CS204", course_name="Data Structures Lab", day="SAT", slot="PM", groups="CSE-2", rooms="LAB-1 · LAB-2", status="Confirmed"),
        ]
        db.add_all(exams_data)

    # 6. Bookings
    if db.query(BookingModel).count() == 0:
        bookings_data = [
            BookingModel(id="SP-027", event_name="Design Conclave", club_name="Design & Arts Guild", requested_slot="Wed, 16:00–20:00", assigned_venue="AUD · Wed, 16:00–20:00", status="Approved", score=4.5, priority=1),
            BookingModel(id="SP-031", event_name="Battle of Bands", club_name="CIT Music Society", requested_slot="Fri, 17:00–21:00", assigned_venue="AMPH · Fri, 18:00–22:00", status="Alternative Offered", score=3.8, priority=2),
            BookingModel(id="SP-034", event_name="Founder Fireside", club_name="E-Cell", requested_slot="Thu, 15:00–17:00", assigned_venue="LH-1 · Thu, 15:00–17:00", status="Approved", score=4.2, priority=1),
            BookingModel(id="SP-041", event_name="Robotics Showcase", club_name="Mech & Robotics Club", requested_slot="Sat, 09:00–14:00", assigned_venue="—", status="Rejected", score=1.5, priority=3),
        ]
        db.add_all(bookings_data)

    db.commit()


def clear_db_data(db: Session):
    """Clears all operational schedule, booking, disruption, and room/group data from DBMS."""
    try:
        db.query(BookingModel).delete()
        db.query(DisruptionLog).delete()
        db.query(SessionModel).delete()
        db.query(ExamModel).delete()
        db.query(Room).delete()
        db.query(Faculty).delete()
        db.query(StudentGroup).delete()
        db.commit()
    except Exception:
        db.rollback()
        raise

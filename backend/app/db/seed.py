import json
import os
from sqlalchemy.orm import Session
from backend.app.db.session import engine, SessionLocal, Base
from backend.app.db.models import (
    User, RoleEnum, Room, Faculty, StudentGroup, Course, SessionModel, ExamModel, BookingModel, DisruptionLog, DatasetState, ScheduleVersion
)
from backend.app.auth.security import hash_password
from backend.app.db.persistence import sync_dataset_to_db, sync_schedule_to_db

DATA_PATH = os.path.join("CrunchWeek_StarterPack", "data", "cit_public.json")
BASELINE_SCHEDULE_PATH = os.path.join("exports", "schedule.baseline.json")

def init_db():
    """
    Initializes tables and provisions necessary administrative and core roles.
    Keeps schedule operational data clean.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default administrative and demonstration roles if users table is empty
        if db.query(User).count() == 0:
            users_to_seed = [
                User(
                    email="admin@cit.edu",
                    hashed_password=hash_password("Admin@123"),
                    full_name="CIT Academic Operations / Dean",
                    role=RoleEnum.ADMIN,
                    department="Academic Affairs",
                    is_active=True,
                    oauth_provider="local"
                ),
                User(
                    email="coordinator@cit.edu",
                    hashed_password=hash_password("Coord@123"),
                    full_name="Department Academic Coordinator",
                    role=RoleEnum.DEPARTMENT_COORDINATOR,
                    department="CSE",
                    is_active=True,
                    oauth_provider="local"
                ),
                User(
                    email="faculty@cit.edu",
                    hashed_password=hash_password("Faculty@123"),
                    full_name="Dr. Ananya Mishra",
                    role=RoleEnum.FACULTY,
                    department="CSE",
                    is_active=True,
                    oauth_provider="local"
                ),
                User(
                    email="club@cit.edu",
                    hashed_password=hash_password("Club@123"),
                    full_name="Spectra Core Festival Lead",
                    role=RoleEnum.CLUB_LEAD,
                    department="Student Council",
                    is_active=True,
                    oauth_provider="local"
                ),
                User(
                    email="student@cit.edu",
                    hashed_password=hash_password("Student@123"),
                    full_name="B.Tech Student Cohort Rep",
                    role=RoleEnum.STUDENT,
                    department="CSE",
                    is_active=True,
                    oauth_provider="local"
                ),
            ]
            db.add_all(users_to_seed)
            db.commit()
    finally:
        db.close()


def seed_baseline_records(db: Session):
    """
    Populates full starter pack dataset (27 rooms, 40 faculty, 14 student groups, 62 courses,
    189 sessions, 41 exams, 25 fest bookings) directly into SQL DBMS.
    """
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            dataset = json.load(f)
        sync_dataset_to_db(db, dataset, set_as_active=True)

    if os.path.exists(BASELINE_SCHEDULE_PATH):
        with open(BASELINE_SCHEDULE_PATH, "r", encoding="utf-8") as f:
            baseline_sched = json.load(f)
        sync_schedule_to_db(db, baseline_sched, version_tag="baseline", set_as_active=True)


def clear_db_data(db: Session):
    """Clears all operational schedule, booking, disruption, and room/group data from DBMS."""
    try:
        db.query(BookingModel).delete()
        db.query(DisruptionLog).delete()
        db.query(ScheduleVersion).delete()
        db.query(DatasetState).delete()
        db.query(SessionModel).delete()
        db.query(ExamModel).delete()
        db.query(Course).delete()
        db.query(Room).delete()
        db.query(Faculty).delete()
        db.query(StudentGroup).delete()
        db.commit()
    except Exception:
        db.rollback()
        raise

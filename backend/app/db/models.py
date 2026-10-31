import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    DEPARTMENT_COORDINATOR = "DEPARTMENT_COORDINATOR"
    CLUB_LEAD = "CLUB_LEAD"
    STUDENT = "STUDENT"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True) # nullable for pure OAuth users
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.STUDENT, nullable=False)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    oauth_provider = Column(String(50), default="local", nullable=False)
    oauth_sub = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    bookings = relationship("BookingModel", back_populates="requested_by_user")

class DatasetState(Base):
    """
    Stores active and baseline dataset metadata, calendar, and full raw dataset JSON.
    Guarantees that on restart or across server instances, the active dataset is restored from SQL.
    """
    __tablename__ = "dataset_states"

    dataset_id = Column(String(100), primary_key=True) # e.g. cit_public_v1
    institute_name = Column(String(150), nullable=True)
    calendar_json = Column(Text, nullable=False) # JSON encoded days, periods
    raw_dataset_json = Column(Text, nullable=False) # Full JSON payload
    is_active = Column(Boolean, default=True, nullable=False)
    loaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class ScheduleVersion(Base):
    """
    Stores full solved schedule versions (e.g. baseline, after_disruption).
    Ensures schedules are durable in SQL rather than volatile in memory.
    """
    __tablename__ = "schedule_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(100), ForeignKey("dataset_states.dataset_id"), nullable=False)
    version_tag = Column(String(50), nullable=False) # "baseline", "after_disruption", "custom"
    is_active = Column(Boolean, default=False, nullable=False)
    schedule_json = Column(Text, nullable=False) # Full schedule JSON (sessions, exams, fest_week)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(50), primary_key=True) # e.g. LH-1, LAB-2, AUD
    name = Column(String(100), nullable=False)
    building = Column(String(100), nullable=True)
    room_type = Column(String(50), nullable=False) # lecture_hall, lab_cs, auditorium, etc.
    capacity = Column(Integer, nullable=False)
    equipment = Column(String(255), default="")
    features_json = Column(Text, default="[]") # JSON list of features
    accessible = Column(Boolean, default=True)
    allowed_uses_json = Column(Text, default="[]") # JSON list of allowed uses

class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(String(50), primary_key=True) # e.g. F01
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    max_daily_hours = Column(Integer, default=4)
    needs_accessible = Column(Boolean, default=False)
    unavailable_json = Column(Text, default="[]") # JSON list of unavailable slots

class StudentGroup(Base):
    __tablename__ = "student_groups"

    id = Column(String(50), primary_key=True) # e.g. Y1-A, CSE-2
    name = Column(String(100), nullable=False)
    strength = Column(Integer, nullable=False)
    department = Column(String(100), nullable=False)
    year = Column(Integer, default=1)
    needs_accessible = Column(Boolean, default=False)

class Course(Base):
    __tablename__ = "courses"

    id = Column(String(50), primary_key=True) # e.g. MA101, CS201
    title = Column(String(150), nullable=False)
    department = Column(String(100), nullable=False)
    year = Column(Integer, default=1)
    lecture_hours = Column(Integer, default=3)
    tutorial_hours = Column(Integer, default=0)
    lab_blocks = Column(Integer, default=0)

class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String(50), primary_key=True) # e.g. MA101-AB-L1
    course_id = Column(String(50), ForeignKey("courses.id"), nullable=False)
    course_code = Column(String(50), nullable=False)
    course_name = Column(String(150), nullable=False)
    kind = Column(String(50), default="lecture") # lecture, lab, tutorial
    groups_json = Column(Text, nullable=False) # JSON list e.g. ["Y1-A", "Y1-B"]
    faculty_id = Column(String(50), ForeignKey("faculty.id"), nullable=False)
    room_id = Column(String(50), ForeignKey("rooms.id"), nullable=True) # nullable before assignment
    day = Column(String(10), nullable=True) # MON, TUE, WED, THU, FRI
    start_period = Column(Integer, nullable=True) # 1 to 9
    duration = Column(Integer, default=1) # number of periods
    size = Column(Integer, default=0)
    category = Column(String(50), default="Core")
    status = Column(String(50), default="Confirmed")
    basket_slot = Column(String(50), nullable=True)
    fixed_slot_json = Column(Text, nullable=True)

class ExamModel(Base):
    __tablename__ = "exams"

    id = Column(String(50), primary_key=True) # e.g. EX-MA101
    course_ids_json = Column(Text, nullable=False) # JSON list of course codes
    course_name = Column(String(150), nullable=False)
    day = Column(String(10), nullable=False) # MON, TUE, WED, THU, FRI, SAT
    slot = Column(String(10), nullable=False) # AM, PM
    groups_json = Column(Text, nullable=False) # JSON list
    rooms_json = Column(Text, nullable=False) # JSON list
    size = Column(Integer, default=0)
    duration_hours = Column(Integer, default=2)
    status = Column(String(50), default="Confirmed")

class BookingModel(Base):
    __tablename__ = "fest_bookings"

    id = Column(String(50), primary_key=True) # e.g. BR-01, SP-027
    event_name = Column(String(150), nullable=False)
    requester = Column(String(100), nullable=False)
    club_name = Column(String(100), nullable=False)
    role = Column(String(50), default="club")
    requested_category = Column(String(50), default="club_event") # institute_event, guest_lecture, etc.
    attendance = Column(Integer, default=50)
    duration_periods = Column(Integer, default=1)
    requested_slot = Column(String(100), nullable=False) # readable string or JSON
    assigned_venue = Column(String(100), default="—")
    assigned_day = Column(String(10), nullable=True)
    assigned_start_period = Column(Integer, nullable=True)
    assigned_end_period = Column(Integer, nullable=True)
    status = Column(String(50), default="pending") # approved, rejected, cancelled, pending
    reason = Column(String(255), nullable=True)
    score = Column(Float, default=0.0)
    priority = Column(Integer, default=1)
    needs_json = Column(Text, default="[]")
    windows_json = Column(Text, default="[]")
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    requested_by_user = relationship("User", back_populates="bookings")

class DisruptionLog(Base):
    __tablename__ = "disruption_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    disruption_type = Column(String(50), nullable=False) # ROOM_CLOSURE, FACULTY_UNAVAILABILITY, etc.
    affected_entity = Column(String(100), nullable=False)
    action = Column(String(50), default="COMMIT") # COMMIT, ROLLBACK, REVERT
    summary = Column(String(255), nullable=True)
    moves_json = Column(Text, nullable=False)
    schedule_snapshot_json = Column(Text, nullable=True)
    committed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

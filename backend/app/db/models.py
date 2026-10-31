import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
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

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(50), primary_key=True) # e.g. LH-1, LAB-2
    name = Column(String(100), nullable=False)
    capacity = Column(Integer, nullable=False)
    room_type = Column(String(50), nullable=False) # Lecture Hall, Lab, Auditorium
    equipment = Column(String(255), default="") # e.g. "Projector, AC, PA"

class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(String(50), primary_key=True) # e.g. F01
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    max_daily_hours = Column(Integer, default=4)

class StudentGroup(Base):
    __tablename__ = "student_groups"

    id = Column(String(50), primary_key=True) # e.g. CSE-2
    name = Column(String(100), nullable=False)
    strength = Column(Integer, nullable=False)
    department = Column(String(100), nullable=False)
    year = Column(Integer, default=2)

class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String(50), primary_key=True) # e.g. SES-01
    course_code = Column(String(50), nullable=False)
    course_name = Column(String(150), nullable=False)
    group_id = Column(String(50), ForeignKey("student_groups.id"), nullable=False)
    faculty_id = Column(String(50), ForeignKey("faculty.id"), nullable=False)
    room_id = Column(String(50), ForeignKey("rooms.id"), nullable=False)
    day = Column(Integer, nullable=False) # 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
    start_hour = Column(Float, nullable=False) # e.g. 9.0
    end_hour = Column(Float, nullable=False) # e.g. 10.0
    category = Column(String(50), default="Core")
    status = Column(String(50), default="Confirmed")

class ExamModel(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_code = Column(String(50), nullable=False)
    course_name = Column(String(150), nullable=False)
    day = Column(String(10), nullable=False) # MON, TUE, WED, THU, FRI, SAT
    slot = Column(String(10), nullable=False) # AM, PM
    groups = Column(String(150), nullable=False)
    rooms = Column(String(150), nullable=False)
    status = Column(String(50), default="Confirmed")

class BookingModel(Base):
    __tablename__ = "fest_bookings"

    id = Column(String(50), primary_key=True) # e.g. SP-027
    event_name = Column(String(150), nullable=False)
    club_name = Column(String(100), nullable=False)
    requested_slot = Column(String(100), nullable=False)
    assigned_venue = Column(String(100), default="—")
    status = Column(String(50), default="Approved")
    score = Column(Float, default=0.0)
    priority = Column(Integer, default=1)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    requested_by_user = relationship("User", back_populates="bookings")

class DisruptionLog(Base):
    __tablename__ = "disruption_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    disruption_type = Column(String(50), nullable=False) # e.g. ROOM_CLOSURE, ROLLBACK
    affected_entity = Column(String(100), nullable=False) # e.g. LAB-1
    action = Column(String(50), default="COMMIT") # COMMIT, ROLLBACK
    summary = Column(String(255), nullable=True)
    moves_json = Column(Text, nullable=False)
    schedule_snapshot_json = Column(Text, nullable=True)
    committed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


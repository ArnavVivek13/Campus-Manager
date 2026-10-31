import os
import pytest
from fastapi.testclient import TestClient

# Set clean test environment
os.environ["DATABASE_URL"] = "sqlite:///./test_campus.db"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-32-chars-long-abcde"

from backend.app.main import app
from backend.app.db.session import engine, Base
from backend.app.db.seed import init_db

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()
    yield
    # Cleanup test db
    if os.path.exists("test_campus.db"):
        try:
            os.remove("test_campus.db")
        except Exception:
            pass


def get_admin_token():
    res = client.post("/api/auth/login", json={"email": "admin@cit.edu", "password": "Admin@123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_root_and_metadata():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"

    meta_res = client.get("/api/meta")
    assert meta_res.status_code == 200
    assert "days" in meta_res.json()


def test_self_registration_and_admin_approval():
    """Verify user can request account with chosen role, remaining pending until admin approves."""
    import uuid
    reg_email = f"student.{uuid.uuid4().hex[:6]}@cit.edu"
    reg_res = client.post("/api/auth/register", json={
        "email": reg_email,
        "password": "Password@123",
        "full_name": "Test Student",
        "role": "STUDENT",
        "department": "CSE"
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["status"] == "pending_approval"
    user_id = reg_res.json()["user_id"]

    # Attempt login before approval -> Expect 403 Forbidden
    login_res = client.post("/api/auth/login", json={"email": reg_email, "password": "Password@123"})
    assert login_res.status_code == 403
    assert "awaiting Administrator approval" in login_res.json()["detail"]

    # Admin approves user
    admin_token = get_admin_token()
    appr_res = client.post(f"/api/admin/users/{user_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})
    assert appr_res.status_code == 200

    # User can now log in
    login_ok = client.post("/api/auth/login", json={"email": reg_email, "password": "Password@123"})
    assert login_ok.status_code == 200
    assert login_ok.json()["user"]["role"] == "STUDENT"


def test_prevent_unprovisioned_login():
    """Verify that uninvited/unprovisioned users cannot sign in."""
    res = client.post("/api/auth/login", json={
        "email": "nobody@cit.edu",
        "password": "AnyPassword"
    })
    assert res.status_code == 401


def test_admin_login():
    token = get_admin_token()
    assert token is not None

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "ADMIN"


def test_admin_user_management():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    import uuid
    uid = uuid.uuid4().hex[:6]

    # 1. List users
    list_res = client.get("/api/admin/users", headers=headers)
    assert list_res.status_code == 200
    initial_count = len(list_res.json())

    # 2. Add single user
    test_email = f"prof.{uid}@cit.edu"
    new_user_payload = {
        "email": test_email,
        "full_name": "Prof. Sharma",
        "role": "FACULTY",
        "department": "CSE",
        "password": "Faculty@123"
    }
    create_res = client.post("/api/admin/users", json=new_user_payload, headers=headers)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # 3. Batch add users
    batch_dance_email = f"club.dance.{uid}@cit.edu"
    batch_student_email = f"student.y2.{uid}@cit.edu"
    batch_payload = {
        "raw_text": f"""
# Campus Test Users
{batch_dance_email}, Dance Society Lead, CLUB_LEAD, Club@123, Student Council
{batch_student_email}, Rahul Verma, STUDENT, Student@123, CSE
"""
    }
    batch_res = client.post("/api/admin/users/batch", json=batch_payload, headers=headers)
    assert batch_res.status_code == 200
    assert batch_res.json()["created_count"] == 2

    # 4. Verify new users can now log in
    dance_res = client.post("/api/auth/login", json={"email": batch_dance_email, "password": "Club@123"})
    assert dance_res.status_code == 200
    assert dance_res.json()["user"]["role"] == "CLUB_LEAD"

    # 5. Non-admin forbidden from user management
    student_token = dance_res.json()["access_token"]
    forbidden_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {student_token}"})
    assert forbidden_res.status_code == 403

    # 6. Delete user
    del_res = client.delete(f"/api/admin/users/{created_id}", headers=headers)
    assert del_res.status_code == 200


def test_restore_and_clear_data():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Restore baseline
    res = client.post("/api/admin/restore-baseline", headers=headers)
    assert res.status_code == 200

    # Schedule should have sessions
    sched_res = client.get("/api/schedule")
    assert sched_res.status_code == 200
    assert sched_res.json()["count"] > 0

    # Export schedule
    export_res = client.get("/api/export/schedule")
    assert export_res.status_code == 200
    assert "attachment; filename=\"schedule.json\"" in export_res.headers.get("content-disposition", "")
    assert "sessions" in export_res.json()

    # Clear data
    clear_res = client.post("/api/admin/clear-data", headers=headers)
    assert clear_res.status_code == 200

    # Schedule should now be empty
    empty_sched_res = client.get("/api/schedule")
    assert empty_sched_res.status_code == 200
    assert empty_sched_res.json()["count"] == 0


def test_booking_duplicate_prevention_and_approval():
    admin_token = get_admin_token()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Ensure baseline is restored so rooms exist
    client.post("/api/admin/restore-baseline", headers=admin_headers)

    payload = {
        "requester": "Robotics Club",
        "role": "club",
        "requested_category": "club_event",
        "title": "Autonomous Drone Workshop",
        "attendance": 80,
        "duration_periods": 2,
        "windows": [{"day": "TUE", "from_period": 10, "to_period": 11, "start_time": "18:00"}],
        "room_types": ["seminar_hall", "auditorium"],
        "needs": ["projector"],
        "requested_room": "SH-1"
    }

    # 1. Create first booking
    res1 = client.post("/api/db/bookings", json=payload, headers=admin_headers)
    assert res1.status_code == 200, res1.text
    b1_id = res1.json()["booking_id"]
    assert b1_id.startswith("BK-")

    # 2. Attempt duplicate booking with identical event title
    dup_res = client.post("/api/db/bookings", json=payload, headers=admin_headers)
    assert dup_res.status_code == 409
    assert "Duplicate booking" in dup_res.json()["detail"]

    # 3. Attempt booking with different title but colliding venue & slot
    colliding_payload = dict(payload)
    colliding_payload["title"] = "AI Ethics Seminar"
    slot_res = client.post("/api/db/bookings", json=colliding_payload, headers=admin_headers)
    assert slot_res.status_code == 409
    assert "Slot collision" in slot_res.json()["detail"]

    # 4. Admin offers alternative with a specific room
    alt_res = client.post(
        f"/api/db/bookings/{b1_id}/action",
        json={"action": "alternative", "assigned_room": "SH-2", "reason": "Shifted to SH-2 due to sound checks"},
        headers=admin_headers
    )
    assert alt_res.status_code == 200
    assert alt_res.json()["current_status"] == "alternative_offered"

    # 5. Admin approves booking
    action_res = client.post(f"/api/db/bookings/{b1_id}/action", json={"action": "approve"}, headers=admin_headers)
    assert action_res.status_code == 200
    assert action_res.json()["current_status"] == "approved"

    # 6. Verify /api/fest/bookings authoritative sync
    fest_res = client.get("/api/fest/bookings")
    assert fest_res.status_code == 200
    fest_items = fest_res.json()["bookings"]
    matching = [x for x in fest_items if x["request"]["id"] == b1_id]
    assert len(matching) > 0
    assert matching[0]["status"] == "approved"

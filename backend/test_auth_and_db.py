"""
Verification test script for:
- Database initialization & models
- Authentication (Register & Login with bcrypt + JWT)
- OAuth (Google URL & Demo SSO)
- RBAC permissions & role checks
- DBMS query endpoints
"""
import sys
import os

# Set working directory to project root
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("CrunchWeek_StarterPack"))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.db.models import User, Room, SessionModel, ExamModel, BookingModel

client = TestClient(app)

def test_full_system():
    print("=" * 60)
    print("RUNNING AUTHENTICATION, RBAC & DBMS VERIFICATION SUITE")
    print("=" * 60)

    # 1. Verify DBMS Initial Seeding
    db = SessionLocal()
    user_count = db.query(User).count()
    room_count = db.query(Room).count()
    session_count = db.query(SessionModel).count()
    exam_count = db.query(ExamModel).count()
    booking_count = db.query(BookingModel).count()
    db.close()

    print(f"\n[1] DBMS Tables Seeded:")
    print(f"  * Users in DB:    {user_count}")
    print(f"  * Rooms in DB:    {room_count}")
    print(f"  * Sessions in DB: {session_count}")
    print(f"  * Exams in DB:    {exam_count}")
    print(f"  * Bookings in DB: {booking_count}")
    assert user_count >= 4, "Users should be seeded"
    assert room_count >= 5, "Rooms should be seeded"

    # 2. Test User Registration
    print("\n[2] Testing Registration (/api/auth/register)...")
    reg_payload = {
        "email": "new.faculty@cit.edu",
        "password": "SecurePassword@123",
        "full_name": "Prof. Ananya Sen",
        "role": "FACULTY",
        "department": "Electrical Sciences"
    }
    r = client.post("/api/auth/register", json=reg_payload)
    print("  Status code:", r.status_code)
    assert r.status_code == 201, f"Expected 201 Created, got {r.status_code}: {r.text}"
    reg_data = r.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    assert reg_data["user"]["email"] == "new.faculty@cit.edu"
    assert reg_data["user"]["role"] == "FACULTY"
    print("  [OK] User registered successfully with JWT access token!")

    # 3. Test Standard Login
    print("\n[3] Testing Standard Login (/api/auth/login)...")
    login_payload = {
        "email": "new.faculty@cit.edu",
        "password": "SecurePassword@123"
    }
    r = client.post("/api/auth/login", json=login_payload)
    assert r.status_code == 200, f"Login failed: {r.text}"
    login_data = r.json()
    faculty_token = login_data["access_token"]
    print("  [OK] Login succeeded with password verification!")
    print(f"  [OK] Granted permissions: {login_data['user']['permissions']}")

    # 4. Test Profile Endpoint (/api/auth/me)
    print("\n[4] Testing Profile Extraction (/api/auth/me)...")
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r.status_code == 200, f"/api/auth/me failed: {r.text}"
    me = r.json()
    assert me["email"] == "new.faculty@cit.edu"
    assert me["full_name"] == "Prof. Ananya Sen"
    print(f"  [OK] Profile retrieved for: {me['full_name']} ({me['role']})")

    # 5. Test Demo SSO Login for all roles
    print("\n[5] Testing Demo OAuth / SSO (/api/auth/oauth/demo-login)...")
    tokens = {}
    for role in ["ADMIN", "FACULTY", "CLUB_LEAD", "STUDENT"]:
        r = client.post("/api/auth/oauth/demo-login", json={"role": role})
        assert r.status_code == 200, f"Demo login failed for {role}"
        tokens[role] = r.json()["access_token"]
        print(f"  [OK] Demo OAuth token generated for {role}")

    # 6. Test RBAC Enforcement
    print("\n[6] Testing RBAC Permissions on Secure Endpoint (/api/secure/disruption/approve)...")
    # A. STUDENT should get 403 Forbidden
    r_student = client.post(
        "/api/secure/disruption/approve",
        headers={"Authorization": f"Bearer {tokens['STUDENT']}"}
    )
    print(f"  * Student attempt HTTP status: {r_student.status_code}")
    assert r_student.status_code == 403, f"Student should be forbidden, got: {r_student.status_code}"
    print("  [OK] Student correctly denied access (403 Forbidden)")

    # B. ADMIN should get 200 OK
    r_admin = client.post(
        "/api/secure/disruption/approve",
        headers={"Authorization": f"Bearer {tokens['ADMIN']}"}
    )
    print(f"  * Admin attempt HTTP status: {r_admin.status_code}")
    assert r_admin.status_code == 200, f"Admin should be authorized, got: {r_admin.status_code}"
    print("  [OK] Admin authorized to commit disruptions!")

    # 7. Test DBMS Query Endpoints
    print("\n[7] Testing DBMS Query Endpoints...")
    r_rooms = client.get("/api/db/rooms")
    assert r_rooms.status_code == 200
    print(f"  * /api/db/rooms returned {len(r_rooms.json())} rooms")

    r_sessions = client.get("/api/db/sessions")
    assert r_sessions.status_code == 200
    print(f"  * /api/db/sessions returned {len(r_sessions.json())} sessions")

    r_exams = client.get("/api/db/exams")
    assert r_exams.status_code == 200
    print(f"  * /api/db/exams returned {len(r_exams.json())} exams")

    r_bookings = client.get("/api/db/bookings")
    assert r_bookings.status_code == 200
    print(f"  * /api/db/bookings returned {len(r_bookings.json())} bookings")

    print("\n" + "=" * 60)
    print("ALL AUTHENTICATION, OAUTH, RBAC & DBMS TESTS PASSED! (100%)")
    print("=" * 60)

if __name__ == "__main__":
    test_full_system()


import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store
from app.models.domain import UserRole, MembershipStatus

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_data():
    """Setup clean test environment for M10 University Owner Portal tests."""
    db_store.users.clear()
    db_store.universities.clear()
    db_store.memberships.clear()
    db_store.issues.clear()
    db_store.reports.clear()
    db_store.ai_analysis.clear()
    db_store.admin_actions.clear()
    db_store.status_history.clear()
    db_store.notifications.clear()
    db_store.departments.clear()
    db_store.gamification_configs.clear()
    db_store.contribution_events.clear()
    db_store.student_profiles.clear()

    # Re-seed Super Admin
    db_store._seed_super_admin()

    # Seed University A
    univ_a = db_store.create_university("University A", "https://univa.edu", "univa.edu", "USA")

    # Seed University B
    univ_b = db_store.create_university("University B", "https://univb.edu", "univb.edu", "USA")

    # Seed Owner User A (University A)
    owner_a = db_store.create_user("ownera@univa.edu", "password123", "Owner A")
    db_store.create_membership(owner_a["id"], univ_a.id, role=UserRole.UNIVERSITY_OWNER)

    # Seed Owner User B (University B)
    owner_b = db_store.create_user("ownerb@univb.edu", "password123", "Owner B")
    db_store.create_membership(owner_b["id"], univ_b.id, role=UserRole.UNIVERSITY_OWNER)

    # Seed Student A (University A)
    student_a = db_store.create_user("studenta@univa.edu", "password123", "Student A")
    db_store.create_membership(student_a["id"], univ_a.id, role=UserRole.STUDENT, student_id="STU-1001")

    # Seed Student B (University B)
    student_b = db_store.create_user("studentb@univb.edu", "password123", "Student B")
    db_store.create_membership(student_b["id"], univ_b.id, role=UserRole.STUDENT, student_id="STU-2002")

    # Seed Admin A (University A)
    admin_a = db_store.create_user("admina@univa.edu", "password123", "Admin A")
    db_store.create_membership(admin_a["id"], univ_a.id, role=UserRole.ADMIN, department="Facilities")

    # Award historical points to Student A
    db_store.award_contribution_points(
        idempotency_key="HISTORICAL_EVENT_1",
        university_id=univ_a.id,
        user_id=student_a["id"],
        event_type="VERIFIED_REPORT",
        points_awarded=50
    )

    return {
        "univ_a_id": univ_a.id,
        "univ_b_id": univ_b.id,
        "owner_a": owner_a,
        "owner_b": owner_b,
        "student_a": student_a,
        "student_b": student_b,
        "admin_a": admin_a
    }

def get_headers(user_id: str, univ_id: str, role: str = "UNIVERSITY_OWNER") -> dict:
    from app.core.security import create_access_token
    token = create_access_token({"sub": user_id, "university_id": univ_id, "role": role})
    return {"Authorization": f"Bearer {token}", "X-University-ID": univ_id}

# --- 1. Owner Dashboard Stats ---

def test_owner_dashboard_stats(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])

    res = client.get("/api/v1/owner/dashboard-stats", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total_students"] == 1
    assert body["active_admins"] == 1
    assert body["total_points_awarded"] == 50

# --- 2. University Profile Update & Audit ---

def test_university_profile_update_and_audit(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])

    res = client.put(
        "/api/v1/owner/university-profile",
        json={"name": "State Tech University A", "official_website": "https://statetecha.edu"},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["name"] == "State Tech University A"

    # Audit log check
    audit_logs = [a for a in db_store.admin_actions if a.get("action_type") == "UPDATE_UNIVERSITY_PROFILE"]
    assert len(audit_logs) == 1
    assert audit_logs[0]["admin_user_id"] == data["owner_a"]["id"]

# --- 3. Department CRUD ---

def test_department_crud(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])

    res = client.post(
        "/api/v1/owner/departments",
        json={"name": "Plumbing Operations", "code": "PLUMBING", "description": "Water leaks"},
        headers=headers
    )
    assert res.status_code == 201
    assert res.json()["code"] == "PLUMBING"

    list_res = client.get("/api/v1/owner/departments", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

# --- 4. Admin Invitation & Status Governance ---

def test_admin_invitation_and_suspension(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])

    # Invite Admin
    invite_res = client.post(
        "/api/v1/owner/invite-admin",
        json={"official_email": "newadmin@univa.edu", "full_name": "New Officer", "department": "Electrical"},
        headers=headers
    )
    assert invite_res.status_code == 201
    assert "invite_token" in invite_res.json()

    # Suspend Admin A
    suspend_res = client.post(
        f"/api/v1/owner/admins/{data['admin_a']['id']}/status",
        json={"status": "SUSPENDED"},
        headers=headers
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["status"] == "SUSPENDED"

# --- 5. Student Suspension & Immediate Protected API Access Block ---

def test_student_suspension_immediate_access_block(setup_test_data):
    data = setup_test_data
    owner_headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])
    student_headers = get_headers(data["student_a"]["id"], data["univ_a_id"], role="STUDENT")

    # 1. Verify student CAN access protected API before suspension
    before_res = client.get("/api/v1/student/profile", headers=student_headers)
    assert before_res.status_code == 200

    # 2. Owner suspends student
    suspend_res = client.post(
        f"/api/v1/owner/students/{data['student_a']['id']}/status",
        json={"status": "SUSPENDED"},
        headers=owner_headers
    )
    assert suspend_res.status_code == 200

    # 3. Verify student with SAME existing JWT is IMMEDIATELY DENIED access to protected API
    after_res = client.get("/api/v1/student/profile", headers=student_headers)
    assert after_res.status_code == 403
    assert "suspended" in after_res.json()["detail"].lower()

# --- 6. Cross-University Student Suspension Rejection ---

def test_cross_university_student_suspension_rejection(setup_test_data):
    data = setup_test_data
    # Owner A attempts to suspend Student B (University B)
    owner_a_headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])

    res = client.post(
        f"/api/v1/owner/students/{data['student_b']['id']}/status",
        json={"status": "SUSPENDED"},
        headers=owner_a_headers
    )
    assert res.status_code == 403
    assert "tenant" in res.json()["detail"].lower()

# --- 7. Gamification Configuration Bounds & Historical Integrity ---

def test_gamification_config_bounds_and_historical_integrity(setup_test_data):
    data = setup_test_data
    owner_headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])

    # 1. Out-of-bounds validation rejection (Negative or abusive values)
    invalid_res = client.put(
        "/api/v1/owner/gamification-config",
        json={"report_points": 5000, "confirmation_points": 10, "resolution_points": 100},
        headers=owner_headers
    )
    assert invalid_res.status_code == 422  # Pydantic validation error or HTTP 400

    # 2. Valid gamification config update
    valid_res = client.put(
        "/api/v1/owner/gamification-config",
        json={"report_points": 75, "confirmation_points": 15, "resolution_points": 150},
        headers=owner_headers
    )
    assert valid_res.status_code == 200
    assert valid_res.json()["report_points"] == 75

    # 3. Verify historical student points remain COMPLETELY UNCHANGED (50 pts)
    student_prof = db_store.student_profiles.get(data["student_a"]["id"])
    assert student_prof["points"] == 50

    # 4. Verify audit log contains old and new configuration values
    audit_logs = [a for a in db_store.admin_actions if a.get("action_type") == "UPDATE_GAMIFICATION_CONFIG"]
    assert len(audit_logs) == 1
    assert "old=" in audit_logs[0]["payload"]
    assert "new=" in audit_logs[0]["payload"]

# --- 8. Broadcast Notification ---

def test_broadcast_notification(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])

    res = client.post(
        "/api/v1/owner/broadcast-notification",
        json={"title": "Campus Sustainability Summit", "message": "Join us on Friday at Main Auditorium."},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["recipients_notified"] >= 1

# --- 9. Super Admin Elevation Rejection ---

def test_super_admin_elevation_rejection(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["owner_a"]["id"], data["univ_a_id"])

    # Owner attempts to access Super Admin endpoint -> 403 FORBIDDEN
    res = client.get("/api/v1/platform/requests", headers=headers)
    assert res.status_code == 403

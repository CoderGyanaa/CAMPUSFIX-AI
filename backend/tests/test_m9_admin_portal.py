import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store
from app.models.domain import UserRole, MembershipStatus

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_data():
    """Setup clean test environment for M9 Admin Operations Portal tests."""
    db_store.users.clear()
    db_store.universities.clear()
    db_store.memberships.clear()
    db_store.issues.clear()
    db_store.reports.clear()
    db_store.ai_analysis.clear()
    db_store.admin_actions.clear()
    db_store.status_history.clear()
    db_store.notifications.clear()

    # Re-seed Super Admin
    db_store._seed_super_admin()
    super_admin = db_store.users.get("super-admin-1")

    # Seed University A
    univ_a = db_store.create_university(
        name="University A",
        website="https://univa.edu",
        email_domain="univa.edu",
        country="USA"
    )

    # Seed University B
    univ_b = db_store.create_university(
        name="University B",
        website="https://univb.edu",
        email_domain="univb.edu",
        country="USA"
    )

    # Seed Admin User A (University A)
    admin_a = db_store.create_user("admina@univa.edu", "password123", "Admin A")
    db_store.create_membership(admin_a["id"], univ_a.id, role=UserRole.ADMIN)

    # Seed Owner User A (University A)
    owner_a = db_store.create_user("ownera@univa.edu", "password123", "Owner A")
    db_store.create_membership(owner_a["id"], univ_a.id, role=UserRole.UNIVERSITY_OWNER)

    # Seed Admin User B (University B)
    admin_b = db_store.create_user("adminb@univb.edu", "password123", "Admin B")
    db_store.create_membership(admin_b["id"], univ_b.id, role=UserRole.ADMIN)

    # Seed Student User A (University A)
    student_a = db_store.create_user("studenta@univa.edu", "password123", "Student A")
    db_store.create_membership(student_a["id"], univ_a.id, role=UserRole.STUDENT)

    # Seed Suspended Admin User A (University A)
    suspended_admin = db_store.create_user("suspended@univa.edu", "password123", "Suspended Admin")
    db_store.create_membership(suspended_admin["id"], univ_a.id, role=UserRole.ADMIN, status=MembershipStatus.SUSPENDED)

    # Seed Issue A (belongs to Univ A)
    issue_a = {
        "id": "issue-a-101",
        "master_issue_number": 101,
        "university_id": univ_a.id,
        "title": "Broken HVAC in Science Hall",
        "description": "Heating is broken causing freezing temperatures.",
        "category": "ENERGY",
        "status": "SUBMITTED",
        "student_priority": "HIGH",
        "ai_priority": "HIGH",
        "final_admin_priority": None,
        "reporter_id": student_a["id"],
        "created_at": "2026-09-11T10:00:00Z"
    }
    db_store.issues[issue_a["id"]] = issue_a

    # Seed Issue B (belongs to Univ B)
    issue_b = {
        "id": "issue-b-202",
        "master_issue_number": 202,
        "university_id": univ_b.id,
        "title": "Water Pipe Burst in Gym",
        "description": "Water leaking on basketball court.",
        "category": "WATER",
        "status": "SUBMITTED",
        "student_priority": "CRITICAL",
        "ai_priority": "CRITICAL",
        "final_admin_priority": None,
        "reporter_id": "other-student",
        "created_at": "2026-09-11T11:00:00Z"
    }
    db_store.issues[issue_b["id"]] = issue_b

    return {
        "univ_a_id": univ_a.id,
        "univ_b_id": univ_b.id,
        "admin_a": admin_a,
        "owner_a": owner_a,
        "admin_b": admin_b,
        "student_a": student_a,
        "suspended_admin": suspended_admin,
        "super_admin": super_admin,
        "issue_a_id": issue_a["id"],
        "issue_b_id": issue_b["id"]
    }

def get_headers(user_id: str, univ_id: str, role: str = "ADMIN") -> dict:
    from app.core.security import create_access_token
    token = create_access_token({"sub": user_id, "university_id": univ_id, "role": role})
    return {"Authorization": f"Bearer {token}", "X-University-ID": univ_id}

# --- 1. ADMIN Same-University Access Allowed ---

def test_admin_same_university_access(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["admin_a"]["id"], data["univ_a_id"], role="ADMIN")

    res = client.get("/api/v1/admin/dashboard-stats", headers=headers)
    assert res.status_code == 200
    assert res.json()["total_submitted"] == 1

# --- 2. ADMIN Cross-University Access Denied ---

def test_admin_cross_university_denied(setup_test_data):
    data = setup_test_data
    # Admin A tries to access University B context
    headers = get_headers(data["admin_a"]["id"], data["univ_b_id"], role="ADMIN")

    res = client.get("/api/v1/admin/dashboard-stats", headers=headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

# --- 3. UNIVERSITY_OWNER Same-University Access Allowed ---

def test_owner_same_university_access(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["owner_a"]["id"], data["univ_a_id"], role="UNIVERSITY_OWNER")

    res = client.get("/api/v1/admin/issues", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

# --- 4. SUPER_ADMIN Platform-Level Operations with Audit ---

def test_super_admin_platform_operations_audited(setup_test_data):
    data = setup_test_data
    from app.core.security import create_access_token
    token = create_access_token({"sub": data["super_admin"]["id"], "is_super_admin": True})
    headers = {"Authorization": f"Bearer {token}", "X-University-ID": data["univ_a_id"]}

    res = client.get("/api/v1/admin/dashboard-stats", headers=headers)
    assert res.status_code == 200

    # Verify audit log recorded for super admin platform action
    audit_logs = [a for a in db_store.admin_actions if a.get("action_type") == "SUPER_ADMIN_PLATFORM_ACCESS"]
    assert len(audit_logs) >= 1
    assert audit_logs[0]["admin_user_id"] == data["super_admin"]["id"]

# --- 5. STUDENT Operational Access Denied ---

def test_student_admin_access_denied(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["student_a"]["id"], data["univ_a_id"], role="STUDENT")

    res = client.get("/api/v1/admin/dashboard-stats", headers=headers)
    assert res.status_code == 403

# --- 6. Suspended Admin Access Denied ---

def test_suspended_admin_access_denied(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["suspended_admin"]["id"], data["univ_a_id"], role="ADMIN")

    res = client.get("/api/v1/admin/dashboard-stats", headers=headers)
    assert res.status_code == 403
    assert "suspended" in res.json()["detail"].lower()

# --- 7. Unauthorized Status Change Denied ---

def test_unauthorized_status_change_denied(setup_test_data):
    data = setup_test_data
    # Admin A attempts to change status of Issue B (University B)
    headers = get_headers(data["admin_a"]["id"], data["univ_a_id"], role="ADMIN")

    res = client.post(
        f"/api/v1/admin/issues/{data['issue_b_id']}/status",
        json={"status": "VERIFIED", "reason": "Unauthorized attempt"},
        headers=headers
    )
    assert res.status_code in [403, 404]

# --- 8. Unauthorized Assignment Denied ---

def test_unauthorized_assignment_denied(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["admin_a"]["id"], data["univ_a_id"], role="ADMIN")

    res = client.post(
        f"/api/v1/admin/issues/{data['issue_b_id']}/assign",
        json={"department_id": "Electrical"},
        headers=headers
    )
    assert res.status_code in [403, 404]

# --- 9. Valid Operational Status Change & Audit Integrity ---

def test_valid_status_change_and_audit_log_integrity(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["admin_a"]["id"], data["univ_a_id"], role="ADMIN")

    res = client.post(
        f"/api/v1/admin/issues/{data['issue_a_id']}/status",
        json={"status": "VERIFIED", "reason": "Inspected on-site"},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "VERIFIED"

    # Verify status_history transition recorded
    assert len(db_store.status_history) == 1
    assert db_store.status_history[0]["new_status"] == "VERIFIED"

    # Verify admin_actions audit record logged
    assert len(db_store.admin_actions) == 1
    audit = db_store.admin_actions[0]
    assert audit["action_type"] == "UPDATE_ISSUE_STATUS"
    assert audit["target_id"] == data["issue_a_id"]

    # Verify student notification created
    assert len(db_store.notifications) == 1
    notif = db_store.notifications[0]
    assert notif["user_id"] == data["student_a"]["id"]
    assert "VERIFIED" in notif["message"]

# --- 10. Valid Assignment ---

def test_valid_issue_assignment(setup_test_data):
    data = setup_test_data
    headers = get_headers(data["admin_a"]["id"], data["univ_a_id"], role="ADMIN")

    res = client.post(
        f"/api/v1/admin/issues/{data['issue_a_id']}/assign",
        json={"department_id": "HVAC Operations", "notes": "Dispatched technician"},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ASSIGNED"
    assert res.json()["department_id"] == "HVAC Operations"
    assert len(db_store.assignments) == 1

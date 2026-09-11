import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store
from app.models.domain import UserRole, MembershipStatus

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_data():
    """Setup clean test environment for M11 Super Admin Platform Portal tests."""
    db_store.users.clear()
    db_store.universities.clear()
    db_store.memberships.clear()
    db_store.issues.clear()
    db_store.reports.clear()
    db_store.ai_analysis.clear()
    db_store.admin_actions.clear()
    db_store.security_events.clear()
    db_store.requests.clear()
    db_store.owner_tokens.clear()
    db_store.contribution_events.clear()
    db_store.student_profiles.clear()

    # Re-seed Super Admin
    db_store._seed_super_admin()

    # Seed University A
    univ_a = db_store.create_university("University A", "https://univa.edu", "univa.edu", "USA")

    # Seed University B
    univ_b = db_store.create_university("University B", "https://univb.edu", "univb.edu", "USA")

    # Seed Owner A (University A)
    owner_a = db_store.create_user("ownera@univa.edu", "password123", "Owner A")
    db_store.create_membership(owner_a["id"], univ_a.id, role=UserRole.UNIVERSITY_OWNER)

    # Seed Admin A (University A)
    admin_a = db_store.create_user("admina@univa.edu", "password123", "Admin A")
    db_store.create_membership(admin_a["id"], univ_a.id, role=UserRole.ADMIN, department="Facilities")

    # Seed Student A (University A)
    student_a = db_store.create_user("studenta@univa.edu", "password123", "Student A")
    db_store.create_membership(student_a["id"], univ_a.id, role=UserRole.STUDENT, student_id="STU-1001")

def get_token(email: str = "superadmin@campusfix.ai", password: str = "SuperAdmin123!"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

# --- 1. Dashboard Stats ---
def test_get_platform_dashboard_stats():
    sa_token = get_token()
    res = client.get(
        "/api/v1/platform/dashboard-stats",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "total_universities" in data
    assert data["total_universities"] >= 2
    assert "active_universities" in data
    assert "pending_requests" in data

# --- 2. Registration Request Flow & Audit Logging ---
def test_university_registration_request_approve_and_audit():
    sa_token = get_token()

    # Public user submits registration request
    req_payload = {
        "university_name": "Stanford Tech",
        "official_website": "https://stanfordtech.edu",
        "institution_type": "UNIVERSITY",
        "country": "USA",
        "state": "CA",
        "city": "Stanford",
        "applicant_name": "Dean Smith",
        "applicant_designation": "Vice Chancellor",
        "official_email": "dean@stanfordtech.edu",
        "phone": "+16505550199"
    }
    submit_res = client.post("/api/v1/universities/register", json=req_payload)
    assert submit_res.status_code == 201
    req_id = submit_res.json()["request_id"]

    # Super Admin lists pending requests
    list_res = client.get(
        "/api/v1/platform/requests",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert list_res.status_code == 200
    requests = list_res.json()
    assert any(r["id"] == req_id for r in requests)

    # Super Admin approves request
    approve_res = client.post(
        f"/api/v1/platform/requests/{req_id}/approve",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert approve_res.status_code == 200
    token_val = approve_res.json()["owner_activation_token"]
    assert token_val is not None

    # Check audit log entry exists for approval
    audit_res = client.get(
        "/api/v1/platform/audit-logs",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert any(l["action_type"] == "SUPER_ADMIN_APPROVE_UNIVERSITY_REQUEST" for l in logs)

# --- 3. University Tenant Suspension & Immediate Access Block ---
def test_university_tenant_suspension_immediately_blocks_sessions():
    sa_token = get_token()

    # Login Student A, Admin A, and Owner A to get active tokens
    student_token = get_token("studenta@univa.edu", "password123")
    admin_token = get_token("admina@univa.edu", "password123")
    owner_token = get_token("ownera@univa.edu", "password123")

    # Get University A ID
    dir_res = client.get("/api/v1/platform/universities", headers={"Authorization": f"Bearer {sa_token}"})
    assert dir_res.status_code == 200
    univ_a = next(u for u in dir_res.json() if u["name"] == "University A")
    univ_a_id = univ_a["id"]

    # Verify protected API access works while university is active
    stu_res_before = client.get("/api/v1/student/dashboard-summary", headers={
        "Authorization": f"Bearer {student_token}",
        "X-University-ID": univ_a_id
    })
    assert stu_res_before.status_code == 200

    admin_res_before = client.get("/api/v1/admin/dashboard-stats", headers={
        "Authorization": f"Bearer {admin_token}",
        "X-University-ID": univ_a_id
    })
    assert admin_res_before.status_code == 200

    owner_res_before = client.get("/api/v1/owner/dashboard-stats", headers={
        "Authorization": f"Bearer {owner_token}",
        "X-University-ID": univ_a_id
    })
    assert owner_res_before.status_code == 200

    # Super Admin suspends University A
    suspend_res = client.put(
        f"/api/v1/platform/universities/{univ_a_id}/status",
        headers={"Authorization": f"Bearer {sa_token}"},
        json={"is_active": False}
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["is_active"] is False

    # IMMEDIATELY TEST EXISTING SESSIONS AFTER SUSPENSION
    # All protected API calls must be blocked with HTTP 403 Forbidden
    stu_res_after = client.get("/api/v1/student/dashboard-summary", headers={
        "Authorization": f"Bearer {student_token}",
        "X-University-ID": univ_a_id
    })
    assert stu_res_after.status_code == 403
    assert "suspended by platform administration" in stu_res_after.json()["detail"].lower()

    admin_res_after = client.get("/api/v1/admin/dashboard-stats", headers={
        "Authorization": f"Bearer {admin_token}",
        "X-University-ID": univ_a_id
    })
    assert admin_res_after.status_code == 403
    assert "suspended by platform administration" in admin_res_after.json()["detail"].lower()

    owner_res_after = client.get("/api/v1/owner/dashboard-stats", headers={
        "Authorization": f"Bearer {owner_token}",
        "X-University-ID": univ_a_id
    })
    assert owner_res_after.status_code == 403
    assert "suspended by platform administration" in owner_res_after.json()["detail"].lower()

    # Reactivate university and verify access restored
    reactivate_res = client.put(
        f"/api/v1/platform/universities/{univ_a_id}/status",
        headers={"Authorization": f"Bearer {sa_token}"},
        json={"is_active": True}
    )
    assert reactivate_res.status_code == 200

    stu_res_restored = client.get("/api/v1/student/dashboard-summary", headers={
        "Authorization": f"Bearer {student_token}",
        "X-University-ID": univ_a_id
    })
    assert stu_res_restored.status_code == 200

# --- 4. Reissue Owner Token & Audit Log ---
def test_reissue_owner_token_and_audit():
    sa_token = get_token()
    dir_res = client.get("/api/v1/platform/universities", headers={"Authorization": f"Bearer {sa_token}"})
    univ_a_id = dir_res.json()[0]["id"]

    reissue_res = client.post(
        f"/api/v1/platform/universities/{univ_a_id}/reissue-owner-token",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert reissue_res.status_code == 200
    assert "owner_activation_token" in reissue_res.json()

# --- 5. Aggregated Non-PII Analytics ---
def test_platform_aggregated_analytics_no_pii_leakage():
    sa_token = get_token()

    res = client.get(
        "/api/v1/platform/analytics",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "total_reports_platform_wide" in data
    assert "total_resolved_platform_wide" in data
    assert "global_resolution_rate_pct" in data
    assert "total_sustainability_points" in data
    assert "category_distribution" in data
    assert "priority_distribution" in data

    # Verify STRICTLY zero PII leakage in analytics JSON text
    raw_text = res.text
    assert "studenta@univa.edu" not in raw_text
    assert "Student A" not in raw_text
    assert "STU-1001" not in raw_text
    assert "latitude" not in raw_text
    assert "longitude font" not in raw_text

# --- 6. Security Events Monitoring Feed ---
def test_platform_security_events_feed():
    sa_token = get_token()

    # Record a security event in store
    db_store.record_security_event("TEST_UNAUTHORIZED_CROSS_TENANT_ATTEMPT", user_id="user_123", payload="Attempted cross-tenant merge")

    res = client.get(
        "/api/v1/platform/security-events",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert res.status_code == 200
    events = res.json()
    assert any(e["event_type"] == "TEST_UNAUTHORIZED_CROSS_TENANT_ATTEMPT" for e in events)

# --- 7. Role RBAC Denial for Non-Super Admin Roles ---
def test_non_super_admin_roles_denied_platform_endpoints():
    owner_token = get_token("ownera@univa.edu", "password123")
    admin_token = get_token("admina@univa.edu", "password123")
    student_token = get_token("studenta@univa.edu", "password123")

    endpoints = [
        "/api/v1/platform/dashboard-stats",
        "/api/v1/platform/requests",
        "/api/v1/platform/universities",
        "/api/v1/platform/analytics",
        "/api/v1/platform/audit-logs",
        "/api/v1/platform/security-events"
    ]

    for ep in endpoints:
        # Owner denial
        res_o = client.get(ep, headers={"Authorization": f"Bearer {owner_token}"})
        assert res_o.status_code == 403

        # Admin denial
        res_a = client.get(ep, headers={"Authorization": f"Bearer {admin_token}"})
        assert res_a.status_code == 403

        # Student denial
        res_s = client.get(ep, headers={"Authorization": f"Bearer {student_token}"})
        assert res_s.status_code == 403

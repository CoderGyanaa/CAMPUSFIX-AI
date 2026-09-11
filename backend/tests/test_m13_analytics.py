import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store
from app.models.domain import UserRole, MembershipStatus
from app.core.analytics import analytics_cache
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_data():
    """Setup clean test environment for M13 Analytics & Impact tests."""
    db_store.users.clear()
    db_store.universities.clear()
    db_store.memberships.clear()
    db_store.issues.clear()
    db_store.reports.clear()
    db_store.confirmations.clear()
    db_store.contribution_events.clear()
    db_store.admin_actions.clear()
    db_store.security_events.clear()
    analytics_cache.clear()

    # Seed Super Admin
    db_store._seed_super_admin()

    # Seed University A & B
    univ_a = db_store.create_university("University A", "https://univa.edu", "univa.edu", "USA")
    univ_b = db_store.create_university("University B", "https://univb.edu", "univb.edu", "USA")

    # Seed Student A (University A)
    student_a = db_store.create_user("studenta@univa.edu", "password123", "Student A")
    db_store.create_membership(student_a["id"], univ_a.id, role=UserRole.STUDENT, student_id="STU-1001")

    # Seed Student B (University B)
    student_b = db_store.create_user("studentb@univb.edu", "password123", "Student B")
    db_store.create_membership(student_b["id"], univ_b.id, role=UserRole.STUDENT, student_id="STU-2002")

    # Seed Admin A (University A)
    admin_a = db_store.create_user("admina@univa.edu", "password123", "Admin A")
    db_store.create_membership(admin_a["id"], univ_a.id, role=UserRole.ADMIN, department="Facilities")

    # Seed Admin B (University B)
    admin_b = db_store.create_user("adminb@univb.edu", "password123", "Admin B")
    db_store.create_membership(admin_b["id"], univ_b.id, role=UserRole.ADMIN, department="Electrical")

    # Seed Owner A (University A)
    owner_a = db_store.create_user("ownera@univa.edu", "password123", "Owner A")
    db_store.create_membership(owner_a["id"], univ_a.id, role=UserRole.UNIVERSITY_OWNER)

def get_headers(user_id: str, univ_id: str, role: str) -> dict:
    token = create_access_token({"sub": user_id, "university_id": univ_id, "role": role})
    return {"Authorization": f"Bearer {token}", "X-University-ID": univ_id}

# --- 1. Student Impact Analytics & Isolation ---
def test_student_impact_analytics_and_isolation():
    univ_a = next(u for u in db_store.universities.values() if u.name == "University A")
    student_a = db_store.get_user_by_email("studenta@univa.edu")
    headers = get_headers(student_a["id"], univ_a.id, role="STUDENT")

    # Seed an issue & report for Student A
    issue_id = "issue-m13-1"
    db_store.issues[issue_id] = {
        "id": issue_id,
        "master_issue_number": 1,
        "university_id": univ_a.id,
        "title": "Water Leak in Lab 3",
        "description": "Pipe leaking water profusely",
        "category": "WATER_LEAK",
        "status": "SUBMITTED",
        "student_priority": "HIGH",
        "reporter_id": student_a["id"],
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.reports["report-1"] = {
        "id": "report-1",
        "issue_id": issue_id,
        "university_id": univ_a.id,
        "student_id": student_a["id"],
        "category": "WATER_LEAK",
        "status": "SUBMITTED",
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.contribution_events["evt-1"] = {
        "id": "evt-1",
        "user_id": student_a["id"],
        "university_id": univ_a.id,
        "points_awarded": 50,
        "event_type": "OBSERVATION_SUBMITTED",
        "entity_id": issue_id,
        "created_at": datetime.utcnow().isoformat()
    }

    # Fetch student impact analytics
    res = client.get("/api/v1/analytics/student-impact", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == student_a["id"]
    assert data["university_id"] == univ_a.id
    assert data["verified_reports_count"] >= 1
    assert data["points_earned"] == 50
    assert "SDG 6: Clean Water & Sanitation" in data["sdg_contributions"]

# --- 2. University Analytics & Multi-Filter Controls ---
def test_university_analytics_multi_filters_and_export():
    univ_a = next(u for u in db_store.universities.values() if u.name == "University A")
    admin_a = db_store.get_user_by_email("admina@univa.edu")
    student_a = db_store.get_user_by_email("studenta@univa.edu")
    headers = get_headers(admin_a["id"], univ_a.id, role="ADMIN")

    # Create issues with varying categories, priorities, and statuses
    db_store.issues["issue-201"] = {
        "id": "issue-201",
        "master_issue_number": 201,
        "university_id": univ_a.id,
        "title": "Light out in Hallway",
        "description": "Bulb dead",
        "category": "ENERGY",
        "status": "RESOLVED",
        "student_priority": "MEDIUM",
        "reporter_id": student_a["id"],
        "created_at": datetime.utcnow().isoformat(),
        "resolved_at": datetime.utcnow().isoformat()
    }
    db_store.issues["issue-202"] = {
        "id": "issue-202",
        "master_issue_number": 202,
        "university_id": univ_a.id,
        "title": "Trash overflow",
        "description": "Bins full",
        "category": "WASTE_MANAGEMENT",
        "status": "SUBMITTED",
        "student_priority": "LOW",
        "reporter_id": student_a["id"],
        "created_at": datetime.utcnow().isoformat()
    }

    # Unfiltered analytics
    res = client.get("/api/v1/analytics/university", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["university_id"] == univ_a.id
    assert data["total_reports"] >= 2
    assert data["resolved_issues"] >= 1
    assert data["resolution_rate_pct"] > 0
    assert "sla_performance" in data

    # Filtered by category=ENERGY
    res_filtered = client.get("/api/v1/analytics/university?category=ENERGY", headers=headers)
    assert res_filtered.status_code == 200
    fdata = res_filtered.json()
    assert fdata["total_reports"] == 1
    assert "ENERGY" in fdata["category_distribution"]

    # CSV Export
    res_csv = client.get("/api/v1/analytics/university/export", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "University Name, University A" in res_csv.text
    assert "WASTE_MANAGEMENT" in res_csv.text

# --- 3. Tenant Isolation & Cross-University Denial ---
def test_cross_university_analytics_isolation():
    univ_b = next(u for u in db_store.universities.values() if u.name == "University B")
    admin_a = db_store.get_user_by_email("admina@univa.edu")

    # Admin A attempts to request analytics for University B by passing University B's header
    headers = get_headers(admin_a["id"], univ_b.id, role="ADMIN")
    res = client.get("/api/v1/analytics/university", headers=headers)
    # Authorization dependency rejects unauthorized membership for Univ B
    assert res.status_code == 403

# --- 4. Cache Security Isolation ---
def test_analytics_cache_tenant_and_filter_key_isolation():
    univ_a = next(u for u in db_store.universities.values() if u.name == "University A")
    univ_b = next(u for u in db_store.universities.values() if u.name == "University B")
    admin_a = db_store.get_user_by_email("admina@univa.edu")
    admin_b = db_store.get_user_by_email("adminb@univb.edu")
    student_a = db_store.get_user_by_email("studenta@univa.edu")

    headers_a = get_headers(admin_a["id"], univ_a.id, role="ADMIN")
    headers_b = get_headers(admin_b["id"], univ_b.id, role="ADMIN")

    # Seed 1 issue in Univ A
    db_store.issues["issue-301"] = {
        "id": "issue-301",
        "master_issue_number": 301,
        "university_id": univ_a.id,
        "title": "Univ A Issue",
        "description": "Desc",
        "category": "OTHER",
        "status": "SUBMITTED",
        "reporter_id": student_a["id"],
        "created_at": datetime.utcnow().isoformat()
    }

    # First request by Admin A -> caches Univ A data
    res_a = client.get("/api/v1/analytics/university", headers=headers_a)
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["university_id"] == univ_a.id

    # Request by Admin B for Univ B -> must return Univ B data, NOT cached Univ A data
    res_b = client.get("/api/v1/analytics/university", headers=headers_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["university_id"] == univ_b.id
    assert data_b["total_reports"] == 0  # Univ B has 0 issues, proving cache isolation

# --- 5. Privacy Safeguards & No Fabricated Numbers ---
def test_analytics_privacy_and_no_fabricated_numbers():
    univ_a = next(u for u in db_store.universities.values() if u.name == "University A")
    admin_a = db_store.get_user_by_email("admina@univa.edu")
    headers = get_headers(admin_a["id"], univ_a.id, role="ADMIN")

    res = client.get("/api/v1/analytics/university", headers=headers)
    assert res.status_code == 200
    raw_text = res.text

    # Verify no student PII fields exist in response
    assert "studenta@univa.edu" not in raw_text
    assert "Student A" not in raw_text
    assert "STU-1001" not in raw_text

    # Verify zero fabricated environmental claims
    assert "co2_saved_kg" not in raw_text
    assert "liters_water_saved" not in raw_text
    assert "trees_planted" not in raw_text

# --- 6. Inactive / Suspended User Access Denial ---
def test_suspended_user_analytics_denial():
    univ_a = next(u for u in db_store.universities.values() if u.name == "University A")
    admin_a = db_store.get_user_by_email("admina@univa.edu")
    headers = get_headers(admin_a["id"], univ_a.id, role="ADMIN")

    # Suspend Admin A membership
    for m in db_store.memberships.values():
        if m.user_id == admin_a["id"] and m.university_id == univ_a.id:
            m.status = MembershipStatus.SUSPENDED

    # Attempt to access analytics API after suspension
    res = client.get("/api/v1/analytics/university", headers=headers)
    assert res.status_code == 403

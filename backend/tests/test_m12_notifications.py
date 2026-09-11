import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store
from app.models.domain import UserRole, MembershipStatus
from app.core.notifications import email_provider

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_data():
    """Setup clean test environment for M12 Notification & Communication tests."""
    db_store.users.clear()
    db_store.universities.clear()
    db_store.memberships.clear()
    db_store.issues.clear()
    db_store.reports.clear()
    db_store.notifications.clear()
    db_store.notification_preferences.clear()
    db_store.admin_actions.clear()
    db_store.security_events.clear()
    email_provider.sent_emails.clear()

    # Seed Super Admin
    db_store._seed_super_admin()

    # Seed University A
    univ_a = db_store.create_university("University A", "https://univa.edu", "univa.edu", "USA")

    # Seed University B
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

    # Seed Owner A (University A)
    owner_a = db_store.create_user("ownera@univa.edu", "password123", "Owner A")
    db_store.create_membership(owner_a["id"], univ_a.id, role=UserRole.UNIVERSITY_OWNER)

def get_token(email: str, password: str = "password123"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

# --- 1. Notification Listing, Unread Count & Filtering ---
def test_get_user_notifications_and_filtering():
    stu_token = get_token("studenta@univa.edu")
    dir_res = client.get("/api/v1/platform/universities", headers={"Authorization": f"Bearer {get_token('superadmin@campusfix.ai', 'SuperAdmin123!')}"})
    univ_a_id = next(u["id"] for u in dir_res.json() if u["name"] == "University A")
    student_a_id = db_store.get_user_by_email("studenta@univa.edu")["id"]

    # Create notifications
    db_store.create_notification(
        university_id=univ_a_id,
        user_id=student_a_id,
        notif_type="REPORT_STATUS_CHANGE",
        title="Status Updated",
        message="Your report status changed to IN_PROGRESS",
        category="SYSTEM"
    )
    db_store.create_notification(
        university_id=univ_a_id,
        user_id=student_a_id,
        notif_type="BADGE_EARNED",
        title="Badge Unlocked!",
        message="You unlocked Eco Warrior badge",
        category="REWARD"
    )

    # Fetch notifications via API
    res = client.get("/api/v1/notifications", headers={
        "Authorization": f"Bearer {stu_token}",
        "X-University-ID": univ_a_id
    })
    assert res.status_code == 200
    data = res.json()
    assert data["unread_count"] == 2
    assert len(data["notifications"]) == 2

    # Filter by Category
    res_reward = client.get("/api/v1/notifications?category=REWARD", headers={
        "Authorization": f"Bearer {stu_token}",
        "X-University-ID": univ_a_id
    })
    assert res_reward.status_code == 200
    assert len(res_reward.json()["notifications"]) == 1
    assert res_reward.json()["notifications"][0]["category"] == "REWARD"

# --- 2. Mark Read & Mark All Read ---
def test_mark_notification_read_and_read_all():
    stu_token = get_token("studenta@univa.edu")
    dir_res = client.get("/api/v1/platform/universities", headers={"Authorization": f"Bearer {get_token('superadmin@campusfix.ai', 'SuperAdmin123!')}"})
    univ_a_id = next(u["id"] for u in dir_res.json() if u["name"] == "University A")
    student_a_id = db_store.get_user_by_email("studenta@univa.edu")["id"]

    n1 = db_store.create_notification(univ_a_id, student_a_id, "SYSTEM", "N1", "Message 1")
    n2 = db_store.create_notification(univ_a_id, student_a_id, "SYSTEM", "N2", "Message 2")

    # Mark single read
    res1 = client.put(f"/api/v1/notifications/{n1['id']}/read", headers={
        "Authorization": f"Bearer {stu_token}",
        "X-University-ID": univ_a_id
    })
    assert res1.status_code == 200
    assert res1.json()["is_read"] is True

    # Mark all read
    res_all = client.put("/api/v1/notifications/read-all", headers={
        "Authorization": f"Bearer {stu_token}",
        "X-University-ID": univ_a_id
    })
    assert res_all.status_code == 200
    assert res_all.json()["updated_count"] >= 1

# --- 3. Notification Preferences & Email Suppression ---
def test_notification_preferences_and_email_suppression():
    stu_token = get_token("studenta@univa.edu")
    student_a_id = db_store.get_user_by_email("studenta@univa.edu")["id"]
    dir_res = client.get("/api/v1/platform/universities", headers={"Authorization": f"Bearer {get_token('superadmin@campusfix.ai', 'SuperAdmin123!')}"})
    univ_a_id = next(u["id"] for u in dir_res.json() if u["name"] == "University A")

    # Get preferences
    get_res = client.get("/api/v1/notifications/preferences", headers={
        "Authorization": f"Bearer {stu_token}",
        "X-University-ID": univ_a_id
    })
    assert get_res.status_code == 200
    assert get_res.json()["email_reports"] is True

    # Disable email_reports
    update_res = client.put("/api/v1/notifications/preferences", json={"email_reports": False}, headers={
        "Authorization": f"Bearer {stu_token}",
        "X-University-ID": univ_a_id
    })
    assert update_res.status_code == 200
    assert update_res.json()["email_reports"] is False

    # Create notification of type SYSTEM
    email_provider.sent_emails.clear()
    n = db_store.create_notification(univ_a_id, student_a_id, "REPORT_STATUS_CHANGE", "Title", "Message", category="SYSTEM")
    assert n["email_sent"] is False
    assert len(email_provider.sent_emails) == 0

# --- 4. Idempotency & Retry Safety ---
def test_notification_idempotency_prevents_duplicates():
    student_a_id = db_store.get_user_by_email("studenta@univa.edu")["id"]
    dir_res = client.get("/api/v1/platform/universities", headers={"Authorization": f"Bearer {get_token('superadmin@campusfix.ai', 'SuperAdmin123!')}"})
    univ_a_id = next(u["id"] for u in dir_res.json() if u["name"] == "University A")

    idem_key = "UNIQUE_STATUS_CHANGE_ISSUE_999"

    # First dispatch
    n1 = db_store.create_notification(univ_a_id, student_a_id, "REPORT_STATUS_CHANGE", "Title", "Message", idempotency_key=idem_key)
    count_after_first = len(db_store.notifications)

    # Second repeated dispatch (retry)
    n2 = db_store.create_notification(univ_a_id, student_a_id, "REPORT_STATUS_CHANGE", "Title", "Message", idempotency_key=idem_key)
    count_after_second = len(db_store.notifications)

    assert n1["id"] == n2["id"]
    assert count_after_first == count_after_second

# --- 5. Super Admin Platform Announcements ---
def test_super_admin_platform_announcements_and_audit():
    sa_token = get_token("superadmin@campusfix.ai", "SuperAdmin123!")

    broadcast_payload = {
        "title": "Scheduled Maintenance Notice",
        "message": "CampusFix platform will undergo scheduled maintenance tonight at midnight."
    }

    res = client.post("/api/v1/platform/announcements", json=broadcast_payload, headers={
        "Authorization": f"Bearer {sa_token}"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["universities_targeted"] >= 2
    assert data["recipients_notified"] >= 2

    # Check audit log in admin_actions
    audit_res = client.get("/api/v1/platform/audit-logs", headers={"Authorization": f"Bearer {sa_token}"})
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert any(l["action_type"] == "SUPER_ADMIN_PLATFORM_ANNOUNCEMENT" for l in logs)

# --- 6. Strict RLS, User Isolation & Cross-University Denial ---
def test_cross_user_and_cross_university_notification_isolation():
    stu_a_token = get_token("studenta@univa.edu")
    stu_b_token = get_token("studentb@univb.edu")
    student_a_id = db_store.get_user_by_email("studenta@univa.edu")["id"]

    dir_res = client.get("/api/v1/platform/universities", headers={"Authorization": f"Bearer {get_token('superadmin@campusfix.ai', 'SuperAdmin123!')}"})
    univ_a_id = next(u["id"] for u in dir_res.json() if u["name"] == "University A")

    # Seed another student in University A (Student A2)
    student_a2 = db_store.create_user("studenta2@univa.edu", "password123", "Student A2")
    db_store.create_membership(student_a2["id"], univ_a_id, role=UserRole.STUDENT, student_id="STU-1002")
    stu_a2_token = get_token("studenta2@univa.edu")

    n_a = db_store.create_notification(univ_a_id, student_a_id, "SYSTEM", "Title A", "Message A")

    # 1. Student B (from Univ B) attempts access to Univ A notification -> HTTP 403 Forbidden
    res_b_hack = client.put(f"/api/v1/notifications/{n_a['id']}/read", headers={
        "Authorization": f"Bearer {stu_b_token}",
        "X-University-ID": univ_a_id
    })
    assert res_b_hack.status_code == 403
    assert "access denied" in res_b_hack.json()["detail"].lower()

    # 2. Student A2 (same Univ A) attempts to mark Student A's notification as read -> HTTP 403 Forbidden
    res_a2_hack = client.put(f"/api/v1/notifications/{n_a['id']}/read", headers={
        "Authorization": f"Bearer {stu_a2_token}",
        "X-University-ID": univ_a_id
    })
    assert res_a2_hack.status_code == 403
    assert "cross-user notification access denied" in res_a2_hack.json()["detail"].lower()

# --- 7. Inactive / Suspended User Notification Block ---
def test_suspended_user_cannot_receive_protected_notifications():
    student_a_id = db_store.get_user_by_email("studenta@univa.edu")["id"]
    dir_res = client.get("/api/v1/platform/universities", headers={"Authorization": f"Bearer {get_token('superadmin@campusfix.ai', 'SuperAdmin123!')}"})
    univ_a_id = next(u["id"] for u in dir_res.json() if u["name"] == "University A")

    # Suspend Student A's membership
    mem = db_store.get_user_tenant_membership(student_a_id, univ_a_id)
    mem.status = MembershipStatus.SUSPENDED

    # Attempt to dispatch notification
    notif = db_store.create_notification(univ_a_id, student_a_id, "SYSTEM", "Blocked Title", "Blocked Message")
    assert notif is None

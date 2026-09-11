import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store

client = TestClient(app)

def test_full_m2_security_lifecycle():
    # --- Step 1: University Registration Request ---
    reg_payload = {
        "university_name": "Greenfield University",
        "official_website": "https://greenfield.edu",
        "institution_type": "Public University",
        "country": "USA",
        "state": "California",
        "city": "Greenfield",
        "applicant_name": "Dr. Sarah Jenkins",
        "applicant_designation": "Dean of Sustainability",
        "official_email": "s.jenkins@greenfield.edu",
        "phone": "+1-555-0199"
    }
    resp = client.post("/api/v1/universities/register", json=reg_payload)
    assert resp.status_code == 201
    request_id_1 = resp.json()["request_id"]

    # --- Step 2: Super Admin Login & Pending Requests List ---
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "superadmin@campusfix.ai",
        "password": "SuperAdmin123!"
    })
    assert login_resp.status_code == 200
    super_admin_token = login_resp.json()["access_token"]
    headers_super = {"Authorization": f"Bearer {super_admin_token}"}

    reqs_resp = client.get("/api/v1/platform/requests", headers=headers_super)
    assert reqs_resp.status_code == 200
    assert len(reqs_resp.json()) >= 1

    # --- Step 3: Super Admin Approves University ---
    approve_resp = client.post(f"/api/v1/platform/requests/{request_id_1}/approve", headers=headers_super)
    assert approve_resp.status_code == 200
    approval_data = approve_resp.json()
    univ_id_1 = approval_data["university"]["id"]
    activation_token = approval_data["owner_activation_token"]

    # --- Step 4: University Owner Activates Account ---
    activate_resp = client.post("/api/v1/owner/activate", json={
        "token": activation_token,
        "password": "OwnerSecurePass123!",
        "full_name": "Dr. Sarah Jenkins"
    })
    assert activate_resp.status_code == 200

    # Owner Login
    owner_login = client.post("/api/v1/auth/login", json={
        "email": "s.jenkins@greenfield.edu",
        "password": "OwnerSecurePass123!"
    })
    assert owner_login.status_code == 200
    owner_token = owner_login.json()["access_token"]
    headers_owner_1 = {
        "Authorization": f"Bearer {owner_token}",
        "X-University-ID": univ_id_1
    }

    # --- Step 5: Secure Admin Invitation Flow ---
    invite_resp = client.post("/api/v1/admin/invite", json={
        "official_email": "admin.mark@greenfield.edu",
        "full_name": "Mark Davis",
        "designation": "Facilities Admin",
        "department": "Facilities"
    }, headers=headers_owner_1)
    assert invite_resp.status_code == 200
    admin_invite_token = invite_resp.json()["invite_token"]

    # Admin Accepts Invite & Creates Own Password
    accept_resp = client.post("/api/v1/admin/accept-invite", json={
        "token": admin_invite_token,
        "password": "AdminMarkPass123!",
        "full_name": "Mark Davis"
    })
    assert accept_resp.status_code == 200

    # Admin Login
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin.mark@greenfield.edu",
        "password": "AdminMarkPass123!"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_membership_id = admin_login.json()["memberships"][0]["id"]
    headers_admin_1 = {
        "Authorization": f"Bearer {admin_token}",
        "X-University-ID": univ_id_1
    }

    # --- Step 6: Student Signup (University 1) ---
    student_signup = client.post("/api/v1/auth/student/signup", json={
        "email": "alex.student@greenfield.edu",
        "password": "StudentPass123!",
        "full_name": "Alex Smith",
        "university_id": univ_id_1,
        "student_id": "ST-9901",
        "department": "Computer Science",
        "year": "3rd Year"
    })
    assert student_signup.status_code == 201

    student_login = client.post("/api/v1/auth/login", json={
        "email": "alex.student@greenfield.edu",
        "password": "StudentPass123!"
    })
    assert student_login.status_code == 200
    student_token_1 = student_login.json()["access_token"]
    headers_student_1 = {
        "Authorization": f"Bearer {student_token_1}",
        "X-University-ID": univ_id_1
    }

    # Student 1 creates issue in University 1
    create_issue_resp = client.post("/api/v1/tenant/issues?title=Hostel%20A%20Pipe%20Leak", headers=headers_student_1)
    assert create_issue_resp.status_code == 200

    # --- Step 7: Create Second University & Student (University 2) ---
    reg_2 = client.post("/api/v1/universities/register", json={
        "university_name": "BlueRidge Institute",
        "official_website": "https://blueridge.edu",
        "institution_type": "Private Institute",
        "country": "USA",
        "state": "Oregon",
        "city": "BlueRidge",
        "applicant_name": "Dean Miller",
        "applicant_designation": "Director",
        "official_email": "d.miller@blueridge.edu",
        "phone": "+1-555-0888"
    })
    request_id_2 = reg_2.json()["request_id"]
    app_2 = client.post(f"/api/v1/platform/requests/{request_id_2}/approve", headers=headers_super)
    univ_id_2 = app_2.json()["university"]["id"]

    # Student 2 signs up for University 2
    client.post("/api/v1/auth/student/signup", json={
        "email": "clara.student@blueridge.edu",
        "password": "ClaraStudent123!",
        "full_name": "Clara Oswald",
        "university_id": univ_id_2,
        "student_id": "BR-501",
        "department": "Environmental Engineering",
        "year": "2nd Year"
    })
    s2_login = client.post("/api/v1/auth/login", json={
        "email": "clara.student@blueridge.edu",
        "password": "ClaraStudent123!"
    })
    student_token_2 = s2_login.json()["access_token"]

    # --- Step 8: CROSS-TENANT SECURITY TEST ---
    # Student 1 (University 1) attempts to query University 2 resources -> Expect 403 Forbidden!
    cross_tenant_headers = {
        "Authorization": f"Bearer {student_token_1}",
        "X-University-ID": univ_id_2
    }
    cross_resp = client.get("/api/v1/tenant/issues", headers=cross_tenant_headers)
    assert cross_resp.status_code == 403
    assert "Access denied" in cross_resp.json()["detail"]

    # --- Step 9: ADMIN SUSPENSION TEST ---
    # University Owner 1 suspends Admin Mark
    deact_resp = client.post(f"/api/v1/admin/memberships/{admin_membership_id}/deactivate", headers=headers_owner_1)
    assert deact_resp.status_code == 200
    assert deact_resp.json()["status"] == "SUSPENDED"

    # Suspended Admin Mark attempts to access API with his existing valid JWT token -> Expect 403 Forbidden!
    suspended_resp = client.get("/api/v1/tenant/issues", headers=headers_admin_1)
    assert suspended_resp.status_code == 403
    assert "suspended" in suspended_resp.json()["detail"]

    # --- Step 10: FORGOT PASSWORD TEST ---
    forgot_resp = client.post("/api/v1/auth/forgot-password", json={"email": "alex.student@greenfield.edu"})
    assert forgot_resp.status_code == 200
    reset_token = forgot_resp.json()["reset_token"]

    reset_resp = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "NewStudentPass456!"
    })
    assert reset_resp.status_code == 200

    # Verify login with new password
    new_login = client.post("/api/v1/auth/login", json={
        "email": "alex.student@greenfield.edu",
        "password": "NewStudentPass456!"
    })
    assert new_login.status_code == 200

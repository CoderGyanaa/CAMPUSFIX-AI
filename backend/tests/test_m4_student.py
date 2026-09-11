import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store

client = TestClient(app)

def test_m4_student_authorization_and_security():
    # --- Step 1: Create Active University Tenant ---
    univ_1 = db_store.create_university("State University", "https://state.edu", "state.edu", "USA")

    # --- Step 2: Student 1 Signup (Profile Creation) ---
    s1_resp = client.post("/api/v1/auth/student/signup", json={
        "email": "student1@state.edu",
        "password": "Student1Pass123!",
        "full_name": "Student One",
        "university_id": univ_1.id,
        "student_id": "ST-1001",
        "department": "Computer Science",
        "year": "2nd Year"
    })
    assert s1_resp.status_code == 201
    s1_token = s1_resp.json()["access_token"]
    headers_s1 = {
        "Authorization": f"Bearer {s1_token}",
        "X-University-ID": univ_1.id
    }

    # --- Step 3: Own Profile Read ---
    prof_resp = client.get("/api/v1/student/profile", headers=headers_s1)
    assert prof_resp.status_code == 200
    prof_data = prof_resp.json()
    assert prof_data["full_name"] == "Student One"
    assert prof_data["student_id"] == "ST-1001"  # Present in private profile

    # --- Step 4: Own Profile Update ---
    update_resp = client.put("/api/v1/student/profile", json={
        "department": "Software Engineering",
        "year": "3rd Year",
        "bio": "Passionate about campus sustainability"
    }, headers=headers_s1)
    assert update_resp.status_code == 200
    assert update_resp.json()["profile"]["department"] == "Software Engineering"

    # --- Step 5: Attempt to Change user_id or university_id Denied ---
    user_id_tamper = client.put("/api/v1/student/profile", json={
        "attempt_user_id": "malicious-user-id-99"
    }, headers=headers_s1)
    assert user_id_tamper.status_code == 400
    assert "Cannot modify user_id" in user_id_tamper.json()["detail"]

    univ_id_tamper = client.put("/api/v1/student/profile", json={
        "attempt_university_id": "malicious-univ-id-99"
    }, headers=headers_s1)
    assert univ_id_tamper.status_code == 400
    assert "Cannot modify university_id" in univ_id_tamper.json()["detail"]

    # --- Step 6: Create Student 2 ---
    s2_resp = client.post("/api/v1/auth/student/signup", json={
        "email": "student2@state.edu",
        "password": "Student2Pass123!",
        "full_name": "Student Two",
        "university_id": univ_1.id,
        "student_id": "ST-1002",
        "department": "Mechanical Engineering",
        "year": "1st Year"
    })
    s2_token = s2_resp.json()["access_token"]
    headers_s2 = {
        "Authorization": f"Bearer {s2_token}",
        "X-University-ID": univ_1.id
    }

    # --- Step 7: Leaderboard Privacy Check (Student ID NOT exposed) ---
    leader_resp = client.get("/api/v1/student/leaderboard", headers=headers_s1)
    assert leader_resp.status_code == 200
    board = leader_resp.json()["leaderboard"]
    for entry in board:
        assert "student_id" not in entry, "CRITICAL: Student ID must NEVER be exposed in public leaderboard data!"

    # --- Step 8: Suspended / Inactive Student Access Denied ---
    user1_dict = db_store.get_user_by_email("student1@state.edu")
    s1_membership = db_store.get_user_tenant_membership(user1_dict["id"], univ_1.id)
    s1_membership.status = "SUSPENDED"

    suspended_profile_req = client.get("/api/v1/student/profile", headers=headers_s1)
    assert suspended_profile_req.status_code == 403
    assert "suspended" in suspended_profile_req.json()["detail"]

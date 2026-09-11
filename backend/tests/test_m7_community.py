import os
import uuid
import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from app.main import app
from app.db.store import db_store

client = TestClient(app)

def setup_m7_data():
    # Login Super Admin
    login_super = client.post("/api/v1/auth/login", json={"email": "superadmin@campusfix.ai", "password": "SuperAdmin123!"})
    token_super = login_super.json()["access_token"]
    headers_super = {"Authorization": f"Bearer {token_super}"}

    # Register & Approve University 1
    req_1 = client.post("/api/v1/universities/register", json={
        "university_name": "M7 Uni A",
        "official_website": "https://m7a.edu",
        "institution_type": "Public",
        "country": "USA",
        "state": "CA",
        "city": "LA",
        "applicant_name": "Dean A",
        "applicant_designation": "Dean",
        "official_email": "dean@m7a.edu",
        "phone": "+1-555-0011"
    })
    req_id_1 = req_1.json()["request_id"]
    app_1 = client.post(f"/api/v1/platform/requests/{req_id_1}/approve", headers=headers_super)
    univ_id_1 = app_1.json()["university"]["id"]
    token_owner_act = app_1.json()["owner_activation_token"]
    
    # Activate Owner 1
    client.post("/api/v1/owner/activate", json={"token": token_owner_act, "password": "OwnerPass123!", "full_name": "Dean A"})
    login_owner = client.post("/api/v1/auth/login", json={"email": "dean@m7a.edu", "password": "OwnerPass123!"})
    token_owner_1 = login_owner.json()["access_token"]

    # Register & Approve University 2
    req_2 = client.post("/api/v1/universities/register", json={
        "university_name": "M7 Uni B",
        "official_website": "https://m7b.edu",
        "institution_type": "Public",
        "country": "USA",
        "state": "CA",
        "city": "SF",
        "applicant_name": "Dean B",
        "applicant_designation": "Dean",
        "official_email": "dean@m7b.edu",
        "phone": "+1-555-0022"
    })
    req_id_2 = req_2.json()["request_id"]
    app_2 = client.post(f"/api/v1/platform/requests/{req_id_2}/approve", headers=headers_super)
    univ_id_2 = app_2.json()["university"]["id"]

    # Student 1 (University 1)
    s1 = client.post("/api/v1/auth/student/signup", json={
        "email": "student1@m7a.edu", "password": "Pass123!Student", "full_name": "Student 1",
        "university_id": univ_id_1, "student_id": "ST-1", "department": "CS", "year": "1st"
    })
    token_s1 = s1.json()["access_token"]

    # Student 2 (University 1)
    s2 = client.post("/api/v1/auth/student/signup", json={
        "email": "student2@m7a.edu", "password": "Pass123!Student", "full_name": "Student 2",
        "university_id": univ_id_1, "student_id": "ST-2", "department": "EE", "year": "2nd"
    })
    token_s2 = s2.json()["access_token"]

    return univ_id_1, univ_id_2, token_owner_1, token_s1, token_s2

def test_m7_community_signals_and_transactional_merge_full_suite():
    univ_id_1, univ_id_2, token_owner_1, token_s1, token_s2 = setup_m7_data()
    headers_s1 = {"Authorization": f"Bearer {token_s1}", "X-University-ID": univ_id_1}
    headers_s2 = {"Authorization": f"Bearer {token_s2}", "X-University-ID": univ_id_1}
    headers_owner_1 = {"Authorization": f"Bearer {token_owner_1}", "X-University-ID": univ_id_1}

    # 1. Migration DDL File Exists
    migration_path = os.path.join(os.path.dirname(__file__), "..", "app", "db", "migrations", "004_m7_idempotency_and_merge.sql")
    assert os.path.exists(migration_path)
    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()
    assert "idempotency_key" in sql
    assert "merged_into_issue_id" in sql

    # Create Master Issue 1 (Water) & Linked Report 1
    issue_1 = {
        "id": "master-issue-101",
        "master_issue_number": 101,
        "university_id": univ_id_1,
        "title": "Water Leak Hostel A",
        "description": "Pipe leaking in laundry room",
        "category": "WATER",
        "status": "SUBMITTED",
        "student_priority": "HIGH",
        "reporter_id": db_store.get_user_by_email("student1@m7a.edu")["id"],
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.issues[issue_1["id"]] = issue_1
    db_store.reports["rep-1"] = {
        "id": "rep-1",
        "university_id": univ_id_1,
        "issue_id": issue_1["id"],
        "student_id": issue_1["reporter_id"],
        "photo_storage_path": "path/1.jpg",
        "description": issue_1["description"],
        "category": "WATER",
        "created_at": datetime.utcnow().isoformat()
    }

    # 2. Multiple Reports linked to One Master Issue
    rep_2 = {
        "id": "rep-2",
        "university_id": univ_id_1,
        "issue_id": issue_1["id"],
        "student_id": db_store.get_user_by_email("student2@m7a.edu")["id"],
        "photo_storage_path": "path/2.jpg",
        "description": "Another observation of Hostel A pipe leak",
        "category": "WATER",
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.reports["rep-2"] = rep_2

    detail_1 = client.get(f"/api/v1/issues/{issue_1['id']}", headers=headers_s1)
    assert detail_1.status_code == 200
    assert detail_1.json()["linked_reports_count"] == 2

    # 3. One Confirmation per Student & Repeated Confirmation Anti-Farming Test
    conf_resp_1 = client.post(f"/api/v1/issues/{issue_1['id']}/confirm", headers=headers_s1)
    assert conf_resp_1.status_code == 200
    assert conf_resp_1.json()["points_awarded"] == 10

    # Retried confirmation by same student -> Expect HTTP 400 Bad Request
    conf_retry = client.post(f"/api/v1/issues/{issue_1['id']}/confirm", headers=headers_s1)
    assert conf_retry.status_code == 400
    assert "already confirmed" in conf_retry.json()["detail"]

    # 4. Idempotent Verification & Retries Test
    prof_before = client.get("/api/v1/student/profile", headers=headers_s1).json()["points"]
    
    # First Admin Verification call
    verify_1 = client.post(f"/api/v1/admin/issues/{issue_1['id']}/verify", json={"final_admin_priority": "CRITICAL"}, headers=headers_owner_1)
    assert verify_1.status_code == 200
    assert verify_1.json()["is_first_verification_award"] is True
    assert verify_1.json()["reporter_points_awarded"] == 50

    prof_after_1 = client.get("/api/v1/student/profile", headers=headers_s1).json()["points"]
    assert prof_after_1 == prof_before + 50

    # RETRIED Admin Verification call (Idempotency Key Check)
    verify_2 = client.post(f"/api/v1/admin/issues/{issue_1['id']}/verify", json={"final_admin_priority": "CRITICAL"}, headers=headers_owner_1)
    assert verify_2.status_code == 200
    assert verify_2.json()["is_first_verification_award"] is False

    prof_after_2 = client.get("/api/v1/student/profile", headers=headers_s1).json()["points"]
    assert prof_after_2 == prof_after_1, "CRITICAL: Idempotent verification MUST NOT award points twice on retries!"

    # 5. Status History Immutability Test
    detail_audit = client.get(f"/api/v1/issues/{issue_1['id']}", headers=headers_s1)
    history = detail_audit.json()["status_history"]
    assert len(history) >= 1
    assert history[0]["new_status"] == "VERIFIED"

    # Create Master Issue 2 (Water - compatible category for merge test)
    issue_2 = {
        "id": "master-issue-102",
        "master_issue_number": 102,
        "university_id": univ_id_1,
        "title": "Water Overflow Hostel A Yard",
        "description": "Flooding outside Hostel A",
        "category": "WATER",
        "status": "SUBMITTED",
        "student_priority": "MEDIUM",
        "reporter_id": db_store.get_user_by_email("student2@m7a.edu")["id"],
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.issues[issue_2["id"]] = issue_2

    # Create Master Issue 3 (ENERGY - incompatible category for merge test)
    issue_3 = {
        "id": "master-issue-103",
        "master_issue_number": 103,
        "university_id": univ_id_1,
        "title": "Broken Corridor Light",
        "description": "Lighting damaged in hallway",
        "category": "ENERGY",
        "status": "SUBMITTED",
        "student_priority": "LOW",
        "reporter_id": db_store.get_user_by_email("student2@m7a.edu")["id"],
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.issues[issue_3["id"]] = issue_3

    # 6. Unrelated Merge Rejection Test (WATER into ENERGY -> Expect 400)
    unrelated_merge = client.post("/api/v1/admin/issues/merge", json={
        "source_issue_id": issue_3["id"],
        "target_issue_id": issue_1["id"]
    }, headers=headers_owner_1)
    assert unrelated_merge.status_code == 400
    assert "Cannot merge unrelated issues" in unrelated_merge.json()["detail"]

    # 7. Valid Atomic Merge Test (Merge Issue 2 into Issue 1)
    valid_merge = client.post("/api/v1/admin/issues/merge", json={
        "source_issue_id": issue_2["id"],
        "target_issue_id": issue_1["id"]
    }, headers=headers_owner_1)
    assert valid_merge.status_code == 200
    assert valid_merge.json()["source_status"] == "CLOSED"
    assert valid_merge.json()["merged_into_issue_id"] == issue_1["id"]

    # Verify source issue history, timestamps, and pointer are preserved!
    source_detail = client.get(f"/api/v1/issues/{issue_2['id']}", headers=headers_s1)
    assert source_detail.status_code == 200
    assert source_detail.json()["is_merged"] is True
    assert source_detail.json()["merged_into_issue_id"] == issue_1["id"]
    assert source_detail.json()["issue"]["status"] == "CLOSED"

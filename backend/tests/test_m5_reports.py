import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store
from app.core.config import settings

client = TestClient(app)

# Genuine Magic Bytes
JPEG_BYTES = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00'
PNG_BYTES = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
FAKE_BYTES = b'MZExecutableMaliciousFileHeaderBytes'

def setup_m5_test_data():
    univ_1 = db_store.create_university("Stanford Tech", "https://stanfordtech.edu", "stanfordtech.edu", "USA")
    univ_2 = db_store.create_university("MIT Tech", "https://mittech.edu", "mittech.edu", "USA")

    # Student 1 (University 1)
    s1_resp = client.post("/api/v1/auth/student/signup", json={
        "email": "student1@stanfordtech.edu",
        "password": "Pass123!Student",
        "full_name": "Student One",
        "university_id": univ_1.id,
        "student_id": "ST-1",
        "department": "CS",
        "year": "2nd"
    })
    token_1 = s1_resp.json()["access_token"]

    # Student 2 (University 2)
    s2_resp = client.post("/api/v1/auth/student/signup", json={
        "email": "student2@mittech.edu",
        "password": "Pass123!Student",
        "full_name": "Student Two",
        "university_id": univ_2.id,
        "student_id": "MIT-2",
        "department": "EE",
        "year": "3rd"
    })
    token_2 = s2_resp.json()["access_token"]

    return univ_1, univ_2, token_1, token_2

def test_m5_full_reporting_and_security_suite():
    univ_1, univ_2, token_1, token_2 = setup_m5_test_data()
    headers_1 = {"Authorization": f"Bearer {token_1}", "X-University-ID": univ_1.id}
    headers_2 = {"Authorization": f"Bearer {token_2}", "X-University-ID": univ_2.id}

    # 1. Valid Upload Test
    valid_file = ("test_photo.jpg", io.BytesIO(JPEG_BYTES), "image/jpeg")
    resp_valid = client.post("/api/v1/reports/submit", data={
        "category": "WATER",
        "description": "Hostel B 2nd floor pipe leaking heavily",
        "student_priority": "HIGH",
        "latitude": 37.4275,
        "longitude": -122.1697,
        "building_name": "Hostel B",
        "location_mode": "GPS"
    }, files={"file": valid_file}, headers=headers_1)

    assert resp_valid.status_code == 201
    report_data = resp_valid.json()
    report_id_1 = report_data["report_id"]
    issue_id_1 = report_data["master_issue_id"]
    assert "private-issue-reports/" in report_data["private_storage_path"]

    # 2. Invalid MIME Type Test
    invalid_mime = ("doc.pdf", io.BytesIO(b"%PDF-1.4 Fake PDF"), "application/pdf")
    resp_mime = client.post("/api/v1/reports/submit", data={
        "category": "WATER",
        "description": "PDF attachment test",
        "student_priority": "LOW",
        "latitude": 37.4275,
        "longitude": -122.1697
    }, files={"file": invalid_mime}, headers=headers_1)
    assert resp_mime.status_code == 400
    assert "Unsupported file MIME type" in resp_mime.json()["detail"]

    # 3. Invalid File Signature / Content Test (Fake MIME header vs Malicious Bytes)
    fake_sig = ("fake.jpg", io.BytesIO(FAKE_BYTES), "image/jpeg")
    resp_sig = client.post("/api/v1/reports/submit", data={
        "category": "WATER",
        "description": "Spoofed header test",
        "student_priority": "LOW",
        "latitude": 37.4275,
        "longitude": -122.1697
    }, files={"file": fake_sig}, headers=headers_1)
    assert resp_sig.status_code == 400
    assert "Invalid file signature" in resp_sig.json()["detail"]

    # 4. Oversized File Rejection Test (>5MB)
    huge_bytes = JPEG_BYTES + b'0' * (5 * 1024 * 1024 + 100)
    huge_file = ("huge.jpg", io.BytesIO(huge_bytes), "image/jpeg")
    resp_huge = client.post("/api/v1/reports/submit", data={
        "category": "WATER",
        "description": "Oversized file test",
        "student_priority": "LOW",
        "latitude": 37.4275,
        "longitude": -122.1697
    }, files={"file": huge_file}, headers=headers_1)
    assert resp_huge.status_code == 400
    assert "exceeds maximum allowed limit of 5MB" in resp_huge.json()["detail"]

    # 5. Private Photo Access Test & 6. Cross-Tenant File Access Test
    access_1 = client.get(f"/api/v1/reports/{report_id_1}/photo-access", headers=headers_1)
    assert access_1.status_code == 200
    assert "authorized_access_token" in access_1.json()

    cross_access = client.get(f"/api/v1/reports/{report_id_1}/photo-access", headers=headers_2)
    assert cross_access.status_code == 403
    assert "Access denied" in cross_access.json()["detail"]

    # 7. Duplicate Candidate Detection Test & 8. Same Location / Different Category Test
    # Test A: Same Location + SAME Category ("WATER") + Similar Description -> Expect Candidate Match!
    cand_resp_match = client.post("/api/v1/reports/check-candidates", json={
        "category": "WATER",
        "latitude": 37.4276,  # ~10 meters away
        "longitude": -122.1698,
        "description": "Hostel B pipe leaking water"
    }, headers=headers_1)
    assert cand_resp_match.status_code == 200
    assert cand_resp_match.json()["candidate_count"] >= 1

    # Test B: Same Location + DIFFERENT Category ("ENERGY") -> Location alone MUST NEVER mark duplicate!
    cand_resp_diff = client.post("/api/v1/reports/check-candidates", json={
        "category": "ENERGY",
        "latitude": 37.4276,  # Same location!
        "longitude": -122.1698,
        "description": "Corridor light switch damaged"
    }, headers=headers_1)
    assert cand_resp_diff.status_code == 200
    assert cand_resp_diff.json()["candidate_count"] == 0, "CRITICAL: Location proximity alone MUST NEVER mark a duplicate!"

    # 9. Confirmation Farming Prevention Test
    conf_1 = client.post(f"/api/v1/reports/{issue_id_1}/confirm", headers=headers_1)
    # First confirmation or duplicate check
    conf_2 = client.post(f"/api/v1/reports/{issue_id_1}/confirm", headers=headers_1)
    assert conf_2.status_code == 400
    assert "UNIQUE constraint violation" in conf_2.json()["detail"]

    # 10. Manual Location Submission Test (GPS Denied)
    manual_file = ("manual.jpg", io.BytesIO(PNG_BYTES), "image/png")
    resp_manual = client.post("/api/v1/reports/submit", data={
        "category": "CLEANLINESS",
        "description": "Trash container overflowing outside Library",
        "student_priority": "MEDIUM",
        "latitude": 37.4300,
        "longitude": -122.1700,
        "building_name": "Main Library",
        "location_mode": "MANUAL"
    }, files={"file": manual_file}, headers=headers_1)
    assert resp_manual.status_code == 201

    # 11. Rate Limiting Test (5 reports per 10 mins)
    for i in range(3):
        f = (f"file_{i}.jpg", io.BytesIO(JPEG_BYTES), "image/jpeg")
        client.post("/api/v1/reports/submit", data={
            "category": "OTHER",
            "description": f"Rate limit test report {i}",
            "student_priority": "LOW",
            "latitude": 37.4200,
            "longitude": -122.1600
        }, files={"file": f}, headers=headers_1)

    # 6th report within window -> Expect HTTP 429 Rate Limit Exceeded!
    limit_file = ("limit.jpg", io.BytesIO(JPEG_BYTES), "image/jpeg")
    resp_rate = client.post("/api/v1/reports/submit", data={
        "category": "OTHER",
        "description": "Exceeding rate limit report",
        "student_priority": "LOW",
        "latitude": 37.4200,
        "longitude": -122.1600
    }, files={"file": limit_file}, headers=headers_1)
    assert resp_rate.status_code == 429
    assert "Rate limit exceeded" in resp_rate.json()["detail"]

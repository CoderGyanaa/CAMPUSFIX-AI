import os
import uuid
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.main import app
from app.db.store import db_store
from app.services.spatial_service import postgis_haversine_distance_meters, spatial_service

client = TestClient(app)

def setup_m6_test_universities():
    univ_1 = db_store.create_university("Spatial Uni A", "https://spatiala.edu", "spatiala.edu", "USA")
    univ_2 = db_store.create_university("Spatial Uni B", "https://spatialb.edu", "spatialb.edu", "USA")

    s1_resp = client.post("/api/v1/auth/student/signup", json={
        "email": "student1@spatiala.edu",
        "password": "Pass123!Student",
        "full_name": "Student A",
        "university_id": univ_1.id,
        "student_id": "ST-A1",
        "department": "GIS",
        "year": "4th"
    })
    token_1 = s1_resp.json()["access_token"]

    s2_resp = client.post("/api/v1/auth/student/signup", json={
        "email": "student2@spatialb.edu",
        "password": "Pass123!Student",
        "full_name": "Student B",
        "university_id": univ_2.id,
        "student_id": "ST-B1",
        "department": "GIS",
        "year": "4th"
    })
    token_2 = s2_resp.json()["access_token"]

    return univ_1, univ_2, token_1, token_2

def test_m6_postgis_spatial_engine_full_suite():
    univ_1, univ_2, token_1, token_2 = setup_m6_test_universities()
    headers_1 = {"Authorization": f"Bearer {token_1}", "X-University-ID": univ_1.id}
    headers_2 = {"Authorization": f"Bearer {token_2}", "X-University-ID": univ_2.id}

    # 1. PostGIS Spatial Migration DDL File Exists & Valid
    migration_path = os.path.join(os.path.dirname(__file__), "..", "app", "db", "migrations", "003_m6_postgis_spatial.sql")
    assert os.path.exists(migration_path), "Migration file 003_m6_postgis_spatial.sql does not exist"
    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()
    assert "geography(Point, 4326)" in sql
    assert "USING GIST" in sql

    # 2. PostGIS Distance Accuracy Test
    # Distance between (37.4275, -122.1697) and (37.4279, -122.1697) is ~44.5 meters
    dist = postgis_haversine_distance_meters(37.4275, -122.1697, 37.4279, -122.1697)
    assert 40.0 <= dist <= 48.0

    # Create Baseline Location & Issue in University 1
    loc_id_1 = str(uuid.uuid4())
    db_store.locations[loc_id_1] = {
        "id": loc_id_1,
        "university_id": univ_1.id,
        "building_name": "Engineering Quad",
        "latitude": 37.4275,
        "longitude": -122.1697,
        "created_at": datetime.utcnow().isoformat()
    }
    issue_id_1 = str(uuid.uuid4())
    db_store.issues[issue_id_1] = {
        "id": issue_id_1,
        "master_issue_number": 101,
        "university_id": univ_1.id,
        "title": "Water Pipe Burst at Quad",
        "description": "Burst water pipe flooding the courtyard path",
        "category": "WATER",
        "status": "SUBMITTED",
        "student_priority": "HIGH",
        "location_id": loc_id_1,
        "reporter_id": "user-a",
        "created_at": datetime.utcnow().isoformat()
    }

    # 3. Same Category + Nearby + Similar Description -> Match Test
    res_match = client.post("/api/v1/spatial/nearby-candidates", json={
        "category": "WATER",
        "latitude": 37.4277,  # ~22m away
        "longitude": -122.1697,
        "description": "Burst water pipe flooding courtyard",
        "radius_meters": 50.0
    }, headers=headers_1)
    assert res_match.status_code == 200
    data_match = res_match.json()
    assert data_match["candidate_count"] >= 1
    assert data_match["duplicate_candidates"][0]["issue_id"] == issue_id_1

    # 4. Same Location + DIFFERENT Category -> Location alone NEVER marks duplicate!
    res_diff_cat = client.post("/api/v1/spatial/nearby-candidates", json={
        "category": "ENERGY",  # Different category!
        "latitude": 37.4275,   # Exact same location!
        "longitude": -122.1697,
        "description": "Broken light fixture outside Quad",
        "radius_meters": 50.0
    }, headers=headers_1)
    assert res_diff_cat.status_code == 200
    data_diff = res_diff_cat.json()
    assert data_diff["candidate_count"] == 0, "CRITICAL: Location proximity alone MUST NEVER mark an issue as a duplicate!"
    assert len(data_diff["colocated_active_issues"]) >= 1

    # 5. Different University Isolation Test
    res_cross = client.post("/api/v1/spatial/nearby-candidates", json={
        "category": "WATER",
        "latitude": 37.4275,
        "longitude": -122.1697,
        "description": "Burst water pipe flooding courtyard",
        "radius_meters": 50.0
    }, headers=headers_2)  # University 2 Header!
    assert res_cross.status_code == 200
    assert res_cross.json()["candidate_count"] == 0

    # 6. 50m vs 100m Search Radius Test & Boundary-Distance Case
    # Create Issue 2 at 75m distance
    loc_id_2 = str(uuid.uuid4())
    db_store.locations[loc_id_2] = {
        "id": loc_id_2,
        "university_id": univ_1.id,
        "building_name": "Far Building",
        "latitude": 37.42817,  # ~75m away from 37.4275
        "longitude": -122.1697,
        "created_at": datetime.utcnow().isoformat()
    }
    issue_id_2 = str(uuid.uuid4())
    db_store.issues[issue_id_2] = {
        "id": issue_id_2,
        "master_issue_number": 102,
        "university_id": univ_1.id,
        "title": "Water Leak Far Building",
        "description": "Burst water pipe flooding path",
        "category": "WATER",
        "status": "SUBMITTED",
        "student_priority": "MEDIUM",
        "location_id": loc_id_2,
        "reporter_id": "user-a",
        "created_at": datetime.utcnow().isoformat()
    }

    # At 50m radius -> Issue 2 is OUTSIDE radius (boundary check)
    res_50m = client.post("/api/v1/spatial/nearby-candidates", json={
        "category": "WATER",
        "latitude": 37.4275,
        "longitude": -122.1697,
        "description": "Burst water pipe flooding path",
        "radius_meters": 50.0
    }, headers=headers_1)
    issue_ids_50m = [c["issue_id"] for c in res_50m.json()["duplicate_candidates"]]
    assert issue_id_2 not in issue_ids_50m

    # At 100m radius -> Issue 2 IS INCLUDED
    res_100m = client.post("/api/v1/spatial/nearby-candidates", json={
        "category": "WATER",
        "latitude": 37.4275,
        "longitude": -122.1697,
        "description": "Burst water pipe flooding path",
        "radius_meters": 100.0
    }, headers=headers_1)
    issue_ids_100m = [c["issue_id"] for c in res_100m.json()["duplicate_candidates"]]
    assert issue_id_2 in issue_ids_100m

    # 7. Invalid Coordinates Test (out of bounds lat/lon)
    res_bad_lat = client.post("/api/v1/spatial/nearby-candidates", json={
        "category": "WATER",
        "latitude": 195.0,  # Invalid! > 90
        "longitude": -122.1697,
        "description": "Invalid lat test"
    }, headers=headers_1)
    assert res_bad_lat.status_code == 422 or res_bad_lat.status_code == 400

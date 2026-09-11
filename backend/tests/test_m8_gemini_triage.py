import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.db.store import db_store
from app.services.gemini_service import (
    sanitize_triage_input,
    run_gemini_triage,
    GeminiTransientError,
    GeminiPermanentError,
    GeminiTriageResponse
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_data():
    """Setup clean test environment for M8 Gemini AI Triage tests."""
    db_store.users.clear()
    db_store.universities.clear()
    db_store.memberships.clear()
    db_store.issues.clear()
    db_store.reports.clear()
    db_store.ai_analysis.clear()
    db_store.admin_actions.clear()
    db_store.status_history.clear()

    # Seed University
    univ = db_store.create_university(
        name="State Tech University",
        website="https://statetech.edu",
        email_domain="statetech.edu",
        country="USA"
    )

    # Seed Student User
    student_user = db_store.create_user("student@statetech.edu", "password123", "Alex Student")
    db_store.create_membership(student_user["id"], univ.id, role="STUDENT")

    # Seed Admin User
    admin_user = db_store.create_user("admin@statetech.edu", "password123", "Officer Admin")
    db_store.create_membership(admin_user["id"], univ.id, role="ADMIN")

    # Seed Issue
    issue_id = "test-issue-m8"
    db_store.issues[issue_id] = {
        "id": issue_id,
        "master_issue_number": 101,
        "university_id": univ.id,
        "title": "Severe Water Leakage near Student Email john@statetech.edu ID STU-998877",
        "description": "Pipe burst in Library 2nd floor restroom causing severe flooding.",
        "category": "WATER",
        "status": "SUBMITTED",
        "student_priority": "HIGH",
        "ai_priority": None,
        "final_admin_priority": None,
        "reporter_id": student_user["id"],
        "created_at": "2026-09-11T12:00:00Z"
    }

    return {
        "univ_id": univ.id,
        "student_user": student_user,
        "admin_user": admin_user,
        "issue_id": issue_id
    }

def get_auth_headers(user_id: str, univ_id: str, role: str = "STUDENT") -> dict:
    """Helper to mock JWT auth header payload."""
    from app.core.security import create_access_token
    token = create_access_token({"sub": user_id, "university_id": univ_id, "role": role})
    return {"Authorization": f"Bearer {token}", "X-University-ID": univ_id}

# --- 1. PII Scrubbing Test ---

def test_pii_scrubbing():
    title = "Contact Alex at alex@univ.edu or 555-123-4567"
    desc = "My Student ID is STU123456 and pipe is leaking."
    clean_title, clean_desc, clean_loc = sanitize_triage_input(title, desc, "Hallway")

    assert "alex@univ.edu" not in clean_title
    assert "555-123-4567" not in clean_title
    assert "[REDACTED_EMAIL]" in clean_title
    assert "[REDACTED_PHONE]" in clean_title
    assert "STU123456" not in clean_desc
    assert "[REDACTED_ID]" in clean_desc

# --- 2. Primary Model Success Test ---

def test_primary_model_success():
    mock_res = GeminiTriageResponse(
        recommended_category="WATER",
        recommended_priority="HIGH",
        confidence_score=0.90,
        sdg_mapping="SDG 6: Clean Water and Sanitation",
        reasoning="Flooding threatens infrastructure and wastes water.",
        suggested_action="Shut off main valve immediately."
    )

    with patch("app.services.gemini_service._call_model", return_value=(mock_res, '{"raw": "json"}')):
        res = run_gemini_triage(
            title="Water Leak",
            description="Leaking pipe in basement",
            category="WATER",
            api_key="valid-key",
            primary_model="gemini-2.5-flash",
            fallback_model="gemini-2.5-flash-lite"
        )

        assert res["model_used"] == "gemini-2.5-flash"
        assert res["fallback_used"] is False
        assert res["retry_count"] == 0
        assert res["recommended_priority"] == "HIGH"
        assert res["confidence_score"] == 0.90

# --- 3. Primary Timeout -> Retry & Success ---

def test_primary_timeout_retry_success():
    mock_res = GeminiTriageResponse(
        recommended_category="WATER",
        recommended_priority="HIGH",
        confidence_score=0.88,
        sdg_mapping="SDG 6: Clean Water and Sanitation",
        reasoning="Resolved after transient timeout.",
        suggested_action="Fix pipe"
    )

    # First call raises transient timeout, second call succeeds
    call_count = 0
    def mock_call(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise GeminiTransientError("Request timed out")
        return mock_res, '{"raw": "json"}'

    with patch("app.services.gemini_service._call_model", side_effect=mock_call):
        res = run_gemini_triage(
            title="Water Leak",
            description="Pipe leak",
            category="WATER",
            api_key="valid-key",
            max_retries=2
        )

        assert res["model_used"] == "gemini-2.5-flash"
        assert res["fallback_used"] is False
        assert res["retry_count"] == 1
        assert res["recommended_priority"] == "HIGH"

# --- 4. Primary 429 & 503 Retry ---

def test_primary_rate_limit_and_service_unavailable_retry():
    mock_res = GeminiTriageResponse(
        recommended_category="ENERGY",
        recommended_priority="CRITICAL",
        confidence_score=0.95,
        sdg_mapping="SDG 7: Affordable and Clean Energy",
        reasoning="Exposed high voltage wire.",
        suggested_action="Evacuate area"
    )

    call_count = 0
    def mock_call(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise GeminiTransientError("429 RESOURCE_EXHAUSTED")
        if call_count == 2:
            raise GeminiTransientError("503 UNAVAILABLE")
        return mock_res, '{"raw": "json"}'

    with patch("app.services.gemini_service._call_model", side_effect=mock_call):
        res = run_gemini_triage(
            title="Sparking wire",
            description="Exposed wire",
            category="ENERGY",
            api_key="valid-key",
            max_retries=2
        )

        assert res["model_used"] == "gemini-2.5-flash"
        assert res["fallback_used"] is False
        assert res["retry_count"] == 2
        assert res["recommended_priority"] == "CRITICAL"

# --- 5. Primary Fails -> Fallback Model Succeeds ---

def test_primary_fails_fallback_model_succeeds():
    fallback_res = GeminiTriageResponse(
        recommended_category="WATER",
        recommended_priority="MEDIUM",
        confidence_score=0.82,
        sdg_mapping="SDG 6: Clean Water and Sanitation",
        reasoning="Analyzed by fallback model.",
        suggested_action="Repair pipe"
    )

    def mock_call(model_name, *args, **kwargs):
        if model_name == "gemini-2.5-flash":
            raise GeminiTransientError("503 Service Unavailable")
        elif model_name == "gemini-2.5-flash-lite":
            return fallback_res, '{"raw": "fallback_json"}'
        raise ValueError(f"Unexpected model: {model_name}")

    with patch("app.services.gemini_service._call_model", side_effect=mock_call):
        res = run_gemini_triage(
            title="Water leak",
            description="Leak in ceiling",
            category="WATER",
            api_key="valid-key",
            primary_model="gemini-2.5-flash",
            fallback_model="gemini-2.5-flash-lite",
            max_retries=1
        )

        assert res["model_used"] == "gemini-2.5-flash-lite"
        assert res["fallback_used"] is True
        assert res["is_fallback"] is False  # AI fallback succeeded
        assert res["recommended_priority"] == "MEDIUM"

# --- 6. Both AI Models Fail -> Rule-Based Fallback ---

def test_both_models_fail_rule_based_fallback():
    with patch("app.services.gemini_service._call_model", side_effect=GeminiTransientError("503 Service Unavailable")):
        res = run_gemini_triage(
            title="Trash accumulation",
            description="Bin overflowing in cafeteria",
            category="WASTE",
            student_priority="HIGH",
            api_key="valid-key",
            max_retries=1
        )

        assert res["model_used"] == "rule-based-fallback"
        assert res["is_fallback"] is True
        assert res["confidence_score"] == 0.50
        assert res["recommended_category"] == "WASTE"
        assert res["recommended_priority"] == "HIGH"
        assert "SDG 12" in res["sdg_mapping"]

# --- 7. Permanent Client Error (400 / 403) -> No Unnecessary Retry or Model Switch ---

def test_permanent_error_no_unnecessary_switch():
    call_count = 0
    def mock_call(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        raise GeminiPermanentError("400 Invalid Request")

    with patch("app.services.gemini_service._call_model", side_effect=mock_call):
        res = run_gemini_triage(
            title="Broken chair",
            description="Chair broken",
            category="INFRASTRUCTURE",
            api_key="invalid-key",
            max_retries=2
        )

        # Permanent error stops retries immediately (call_count == 1)
        assert call_count == 1
        assert res["model_used"] == "rule-based-fallback"
        assert res["is_fallback"] is True

# --- 8. API Endpoint Integration: Trigger Triage ---

def test_api_trigger_issue_triage(setup_test_data):
    data = setup_test_data
    headers = get_auth_headers(data["student_user"]["id"], data["univ_id"])

    mock_res = GeminiTriageResponse(
        recommended_category="WATER",
        recommended_priority="HIGH",
        confidence_score=0.91,
        sdg_mapping="SDG 6: Clean Water and Sanitation",
        reasoning="Flooding threat to building structural integrity.",
        suggested_action="Dispatch plumber immediately."
    )

    with patch("app.core.config.settings.GEMINI_API_KEY", "valid-test-key"):
        with patch("app.services.gemini_service._call_model", return_value=(mock_res, '{}')):
            response = client.post(
                f"/api/v1/issues/{data['issue_id']}/triage",
                headers=headers
            )

            assert response.status_code == 200
            body = response.json()
            assert body["issue_id"] == data["issue_id"]
            assert body["recommended_priority"] == "HIGH"
            assert body["confidence_score"] == 0.91

            # Verify DB store issue status was updated to AI_ANALYZED
            issue_in_db = db_store.issues[data["issue_id"]]
            assert issue_in_db["ai_priority"] == "HIGH"
            assert issue_in_db["status"] == "AI_ANALYZED"

# --- 9. API Endpoint: Get AI Analysis with Tenant Isolation ---

def test_api_get_ai_analysis_tenant_isolation(setup_test_data):
    data = setup_test_data
    student_headers = get_auth_headers(data["student_user"]["id"], data["univ_id"])

    # Create second university and second student
    univ2 = db_store.create_university("Other Univ", "https://other.edu", "other.edu", "USA")
    other_user = db_store.create_user("other@other.edu", "password123", "Other Student")
    db_store.create_membership(other_user["id"], univ2.id, role="STUDENT")

    # First save an AI analysis record for univ1
    db_store.save_ai_analysis(
        university_id=data["univ_id"],
        issue_id=data["issue_id"],
        analysis_data={
            "recommended_category": "WATER",
            "recommended_priority": "HIGH",
            "confidence_score": 0.89,
            "sdg_mapping": "SDG 6",
            "reasoning": "Pipe leak",
            "suggested_action": "Fix valve"
        }
    )

    # Fetch AI analysis (Same Tenant) -> 200 OK
    res = client.get(f"/api/v1/issues/{data['issue_id']}/ai-analysis", headers=student_headers)
    assert res.status_code == 200
    assert res.json()["confidence_score"] == 0.89

    # Cross-Tenant Access Request -> 404 Denied
    cross_headers = get_auth_headers(other_user["id"], univ2.id)
    cross_res = client.get(f"/api/v1/issues/{data['issue_id']}/ai-analysis", headers=cross_headers)
    assert cross_res.status_code == 404

# --- 10. API Endpoint: Admin Override Priority & Category ---

def test_admin_override_priority(setup_test_data):
    data = setup_test_data
    admin_headers = get_auth_headers(data["admin_user"]["id"], data["univ_id"], role="ADMIN")
    student_headers = get_auth_headers(data["student_user"]["id"], data["univ_id"], role="STUDENT")

    # Student attempts to override priority -> 403 FORBIDDEN
    student_res = client.post(
        f"/api/v1/admin/issues/{data['issue_id']}/override-triage",
        json={"final_admin_priority": "CRITICAL", "category": "WATER", "notes": "Unauthorized student attempt"},
        headers=student_headers
    )
    assert student_res.status_code == 403

    # Admin overrides priority -> 200 OK
    admin_res = client.post(
        f"/api/v1/admin/issues/{data['issue_id']}/override-triage",
        json={"final_admin_priority": "CRITICAL", "category": "WATER", "notes": "Confirmed severe flood risk on ground inspection"},
        headers=admin_headers
    )
    assert admin_res.status_code == 200
    updated_issue = admin_res.json()
    assert updated_issue["final_admin_priority"] == "CRITICAL"

    # Verify admin audit log created
    assert len(db_store.admin_actions) == 1
    audit_rec = db_store.admin_actions[0]
    assert audit_rec["action_type"] == "OVERRIDE_AI_TRIAGE"
    assert audit_rec["target_id"] == data["issue_id"]

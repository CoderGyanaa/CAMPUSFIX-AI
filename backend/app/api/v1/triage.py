from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_tenant_user, RequireRole
from app.db.store import db_store
from app.models.domain import UserRole, AdminOverrideTriagePayload
from app.services.gemini_service import run_gemini_triage

router = APIRouter(tags=["Gemini AI Triage Engine"])

@router.post("/issues/{issue_id}/triage", status_code=status.HTTP_200_OK)
def trigger_issue_ai_triage(
    issue_id: str,
    context: dict = Depends(get_current_tenant_user)
) -> Dict[str, Any]:
    """
    Triggers Gemini AI Triage analysis on an issue.
    Enforces tenant isolation, PII scrubbing, automatic model retry & fallback.
    """
    membership = context.get("membership")
    user = context["user"]

    if user.get("is_super_admin"):
        issue = db_store.issues.get(issue_id)
        univ_id = issue.get("university_id") if issue else None
    else:
        univ_id = membership.university_id if membership else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university context required"
        )

    issue = db_store.issues.get(issue_id)
    if not issue or issue.get("university_id") != univ_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found in current university tenant"
        )

    # Gather issue inputs
    title = issue.get("title", "")
    description = issue.get("description", "")
    category = issue.get("category", "OTHER")
    student_priority = issue.get("student_priority", "MEDIUM")
    
    location_name = None
    loc_id = issue.get("location_id")
    if loc_id and loc_id in db_store.locations:
        loc = db_store.locations[loc_id]
        location_name = f"{loc.get('building_name', '')} {loc.get('room_number', '')}".strip()

    # Execute resilient Gemini triage pipeline
    triage_result = run_gemini_triage(
        title=title,
        description=description,
        category=category,
        location_name=location_name,
        student_priority=student_priority
    )

    # Save telemetry & analysis record
    record = db_store.save_ai_analysis(
        university_id=univ_id,
        issue_id=issue_id,
        analysis_data=triage_result
    )

    return record

@router.get("/issues/{issue_id}/ai-analysis", status_code=status.HTTP_200_OK)
def get_issue_ai_analysis(
    issue_id: str,
    context: dict = Depends(get_current_tenant_user)
) -> Dict[str, Any]:
    """
    Retrieves stored AI analysis telemetry for a specific issue.
    Strictly enforced via active university tenant context.
    """
    membership = context.get("membership")
    user = context["user"]

    if user.get("is_super_admin"):
        issue = db_store.issues.get(issue_id)
        univ_id = issue.get("university_id") if issue else None
    else:
        univ_id = membership.university_id if membership else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university context required"
        )

    record = db_store.get_ai_analysis_by_issue_id(university_id=univ_id, issue_id=issue_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI analysis record found for this issue"
        )

    return record

@router.post("/admin/issues/{issue_id}/override-triage", status_code=status.HTTP_200_OK)
def admin_override_triage(
    issue_id: str,
    payload: AdminOverrideTriagePayload,
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER, UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """
    Allows Campus Admin to review and override AI triage priority & category.
    Sets final_admin_priority and creates audit trail in admin_actions.
    """
    membership = context.get("membership")
    user = context["user"]

    if user.get("is_super_admin"):
        issue = db_store.issues.get(issue_id)
        univ_id = issue.get("university_id") if issue else None
    else:
        univ_id = membership.university_id if membership else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university context required"
        )

    try:
        updated_issue = db_store.override_admin_priority(
            university_id=univ_id,
            issue_id=issue_id,
            admin_user_id=user.get("id"),
            final_priority=payload.final_admin_priority,
            category=payload.category,
            notes=payload.notes
        )
        return updated_issue
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-tenant access denied"
        )

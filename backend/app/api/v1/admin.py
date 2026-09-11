import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from datetime import datetime
from app.api.deps import RequireRole
from app.models.domain import UserRole
from app.db.store import db_store

router = APIRouter(tags=["Admin Operations Portal"])

class UpdateStatusPayload(BaseModel):
    status: str = Field(pattern="^(UNDER_REVIEW|VERIFIED|ASSIGNED|IN_PROGRESS|RESOLVED|REJECTED|CLOSED)$")
    reason: Optional[str] = None

class AssignIssuePayload(BaseModel):
    assigned_to_user_id: Optional[str] = None
    department_id: Optional[str] = None
    notes: Optional[str] = None

@router.get("/admin/dashboard-stats", status_code=status.HTTP_200_OK)
def get_admin_dashboard_stats(
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER, UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """
    Returns operational summary metrics for active university tenant.
    """
    membership = context.get("membership")
    user = context["user"]
    
    univ_id = membership.university_id if membership else None
    if not univ_id and user.get("is_super_admin"):
        # Default to first university if present for super admin
        all_univs = list(db_store.universities.keys())
        univ_id = all_univs[0] if all_univs else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university tenant context required"
        )

    # Audit super admin platform-level access
    if user.get("is_super_admin") and not membership:
        db_store.admin_actions.append({
            "id": str(uuid.uuid4()),
            "university_id": univ_id,
            "admin_user_id": user["id"],
            "action_type": "SUPER_ADMIN_PLATFORM_ACCESS",
            "target_entity": "dashboard_stats",
            "target_id": univ_id,
            "payload": "Super Admin platform-level access",
            "created_at": datetime.utcnow().isoformat()
        })

    return db_store.get_admin_dashboard_stats(university_id=univ_id)

@router.get("/admin/issues", status_code=status.HTTP_200_OK)
def get_admin_issues(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER, UserRole.SUPER_ADMIN]))
) -> List[Dict[str, Any]]:
    """
    Returns queue of master issues with full admin filtering, search, and priority metrics.
    """
    membership = context.get("membership")
    user = context["user"]
    
    univ_id = membership.university_id if membership else None
    if not univ_id and user.get("is_super_admin"):
        all_univs = list(db_store.universities.keys())
        univ_id = all_univs[0] if all_univs else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university tenant context required"
        )

    issues = [i for i in db_store.issues.values() if i.get("university_id") == univ_id]

    if category:
        issues = [i for i in issues if i.get("category") == category]

    if priority:
        issues = [i for i in issues if (i.get("final_admin_priority") or i.get("ai_priority") or i.get("student_priority")) == priority]

    if status_filter:
        issues = [i for i in issues if i.get("status") == status_filter]

    if department:
        issues = [i for i in issues if i.get("department_id") == department]

    if search:
        q = search.lower().strip()
        issues = [
            i for i in issues
            if q in i.get("title", "").lower() or q in i.get("description", "").lower() or q in str(i.get("master_issue_number", ""))
        ]

    # Audit super admin platform access
    if user.get("is_super_admin") and not membership:
        db_store.admin_actions.append({
            "id": str(uuid.uuid4()),
            "university_id": univ_id,
            "admin_user_id": user["id"],
            "action_type": "SUPER_ADMIN_PLATFORM_ACCESS",
            "target_entity": "issues_queue",
            "target_id": univ_id,
            "payload": f"Super Admin operational issue queue query: search={search}",
            "created_at": datetime.utcnow().isoformat()
        })

    return issues

@router.post("/admin/issues/{issue_id}/status", status_code=status.HTTP_200_OK)
def update_admin_issue_status(
    issue_id: str,
    payload: UpdateStatusPayload,
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER, UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """
    Executes operational status transition (VERIFIED, IN_PROGRESS, RESOLVED, REJECTED).
    Records status history timeline, admin audit log, and student notification.
    """
    membership = context.get("membership")
    user = context["user"]
    
    univ_id = membership.university_id if membership else None
    if not univ_id and user.get("is_super_admin"):
        issue_obj = db_store.issues.get(issue_id)
        univ_id = issue_obj.get("university_id") if issue_obj else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university tenant context required"
        )

    try:
        updated = db_store.update_issue_status(
            university_id=univ_id,
            issue_id=issue_id,
            admin_user_id=user["id"],
            new_status=payload.status,
            reason=payload.reason
        )

        if user.get("is_super_admin") and not membership:
            db_store.admin_actions.append({
                "id": str(uuid.uuid4()),
                "university_id": univ_id,
                "admin_user_id": user["id"],
                "action_type": "SUPER_ADMIN_PLATFORM_ACTION",
                "target_entity": "issues",
                "target_id": issue_id,
                "payload": f"Super Admin updated status to {payload.status}",
                "created_at": datetime.utcnow().isoformat()
            })

        return updated
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access denied")

@router.post("/admin/issues/{issue_id}/assign", status_code=status.HTTP_200_OK)
def assign_admin_issue(
    issue_id: str,
    payload: AssignIssuePayload,
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER, UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """
    Assigns an issue to a department or staff member.
    """
    membership = context.get("membership")
    user = context["user"]
    
    univ_id = membership.university_id if membership else None
    if not univ_id and user.get("is_super_admin"):
        issue_obj = db_store.issues.get(issue_id)
        univ_id = issue_obj.get("university_id") if issue_obj else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university tenant context required"
        )

    try:
        updated = db_store.assign_issue(
            university_id=univ_id,
            issue_id=issue_id,
            admin_user_id=user["id"],
            assigned_to_user_id=payload.assigned_to_user_id,
            department_id=payload.department_id,
            notes=payload.notes
        )

        if user.get("is_super_admin") and not membership:
            db_store.admin_actions.append({
                "id": str(uuid.uuid4()),
                "university_id": univ_id,
                "admin_user_id": user["id"],
                "action_type": "SUPER_ADMIN_PLATFORM_ACTION",
                "target_entity": "issues",
                "target_id": issue_id,
                "payload": f"Super Admin assigned issue to dept {payload.department_id}",
                "created_at": datetime.utcnow().isoformat()
            })

        return updated
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access denied")

@router.get("/admin/audit-logs", status_code=status.HTTP_200_OK)
def get_admin_audit_logs(
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER, UserRole.SUPER_ADMIN]))
) -> List[Dict[str, Any]]:
    """
    Returns administrative audit logs for active university tenant.
    """
    membership = context.get("membership")
    user = context["user"]
    
    univ_id = membership.university_id if membership else None
    if not univ_id and user.get("is_super_admin"):
        all_univs = list(db_store.universities.keys())
        univ_id = all_univs[0] if all_univs else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university tenant context required"
        )

    return db_store.get_admin_audit_logs(university_id=univ_id)

@router.get("/admin/map-issues", status_code=status.HTTP_200_OK)
def get_admin_map_issues(
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER, UserRole.SUPER_ADMIN]))
) -> List[Dict[str, Any]]:
    """
    Returns geospatial map pins for active university tenant.
    """
    membership = context.get("membership")
    user = context["user"]
    
    univ_id = membership.university_id if membership else None
    if not univ_id and user.get("is_super_admin"):
        all_univs = list(db_store.universities.keys())
        univ_id = all_univs[0] if all_univs else None

    if not univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active university tenant context required"
        )

    return db_store.get_admin_map_issues(university_id=univ_id)

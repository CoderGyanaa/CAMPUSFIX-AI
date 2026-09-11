from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.api.deps import RequireRole
from app.models.domain import UserRole
from app.db.store import db_store

router = APIRouter(tags=["Super Admin Platform Administration"])

class UpdateTenantStatusPayload(BaseModel):
    is_active: bool

@router.get("/platform/dashboard-stats", status_code=status.HTTP_200_OK)
def get_platform_dashboard_stats(
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """Returns platform-wide executive KPI stats for Super Admin."""
    return db_store.get_platform_dashboard_stats()

@router.get("/platform/universities", status_code=status.HTTP_200_OK)
def list_platform_universities(
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
) -> List[Dict[str, Any]]:
    """Returns platform-wide directory of registered universities with metrics."""
    return db_store.list_platform_universities()

@router.put("/platform/universities/{university_id}/status", status_code=status.HTTP_200_OK)
def update_university_tenant_status(
    university_id: str,
    payload: UpdateTenantStatusPayload,
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """
    Suspends or reactivates an entire university tenant (`is_active`).
    Setting `is_active = False` immediately blocks protected API access for ALL users in that university.
    Audited in `admin_actions`.
    """
    user = context["user"]
    try:
        res = db_store.update_university_tenant_status(
            university_id=university_id,
            super_admin_id=user["id"],
            is_active=payload.is_active
        )
        return res
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")

@router.post("/platform/universities/{university_id}/reissue-owner-token", status_code=status.HTTP_200_OK)
def reissue_owner_token(
    university_id: str,
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """Reissues a single-use owner activation token for a university. Audited in `admin_actions`."""
    user = context["user"]
    try:
        return db_store.reissue_owner_token(university_id=university_id, super_admin_id=user["id"])
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")

@router.get("/platform/analytics", status_code=status.HTTP_200_OK)
def get_platform_analytics(
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """
    Returns aggregated non-PII platform metrics across all universities.
    Strictly zero student names, emails, student IDs, personal locations, or individual report text!
    """
    return db_store.get_platform_aggregated_analytics()

@router.get("/platform/audit-logs", status_code=status.HTTP_200_OK)
def get_platform_audit_logs(
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
) -> List[Dict[str, Any]]:
    """Returns read-only platform-wide audit log history."""
    return db_store.get_platform_audit_logs()

from app.models.domain import UserRole, SuperAdminAnnouncementPayload

@router.get("/platform/security-events", status_code=status.HTTP_200_OK)
def get_platform_security_events(
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
) -> List[Dict[str, Any]]:
    """Returns read-only security events monitoring feed."""
    return db_store.get_platform_security_events()

@router.post("/platform/announcements", status_code=status.HTTP_200_OK)
def dispatch_platform_announcement(
    payload: SuperAdminAnnouncementPayload,
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
) -> Dict[str, Any]:
    """
    Dispatches a platform-wide system announcement from Super Admin across universities.
    Audited in `admin_actions`.
    """
    user = context["user"]
    return db_store.dispatch_super_admin_announcement(
        super_admin_id=user["id"],
        title=payload.title,
        message=payload.message,
        target_university_ids=payload.target_university_ids
    )

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from app.api.deps import RequireRole, get_current_tenant_user
from app.models.domain import (
    UserRole, StudentImpactResponse, UniversityAnalyticsResponse
)
from app.db.store import db_store

router = APIRouter(prefix="/analytics", tags=["Analytics & Impact Engine"])

@router.get("/student-impact", response_model=StudentImpactResponse, status_code=status.HTTP_200_OK)
def get_student_impact_analytics(
    context: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    """
    Returns personal student sustainability impact metrics.
    Enforces student user isolation & RLS boundaries. Zero PII leakage. Zero fabricated environmental numbers.
    """
    user = context["user"]
    membership = context["membership"]
    return db_store.get_student_impact_analytics(user_id=user["id"], university_id=membership.university_id)

@router.get("/university", response_model=UniversityAnalyticsResponse, status_code=status.HTTP_200_OK)
def get_university_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    issue_status: Optional[str] = Query(None, alias="status"),
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER]))
):
    """
    Returns executive university operational analytics with multi-filter controls and SLA metrics.
    Enforces strict university_id tenant isolation. Uses 60s TTL scoped cache.
    """
    user = context["user"]
    membership = context["membership"]
    return db_store.get_university_analytics(
        university_id=membership.university_id,
        role=membership.role,
        user_id=user["id"],
        start_date=start_date,
        end_date=end_date,
        category=category,
        priority=priority,
        department_id=department_id,
        status=issue_status
    )

@router.get("/university/export", status_code=status.HTTP_200_OK)
def export_university_analytics_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    issue_status: Optional[str] = Query(None, alias="status"),
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER]))
):
    """Generates downloadable aggregate CSV report summary for active university."""
    user = context["user"]
    membership = context["membership"]
    csv_data = db_store.export_university_analytics_csv(
        university_id=membership.university_id,
        role=membership.role,
        user_id=user["id"],
        start_date=start_date,
        end_date=end_date,
        category=category,
        priority=priority,
        department_id=department_id,
        status=issue_status
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=campusfix_analytics_{membership.university_id[:8]}.csv"}
    )

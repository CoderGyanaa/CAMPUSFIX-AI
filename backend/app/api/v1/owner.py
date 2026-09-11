from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, EmailStr
from app.api.deps import RequireRole
from app.models.domain import UserRole
from app.db.store import db_store

router = APIRouter(tags=["University Owner Portal"])

class UpdateUniversityProfilePayload(BaseModel):
    name: Optional[str] = None
    official_website: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    contact_email: Optional[EmailStr] = None

class CreateDepartmentPayload(BaseModel):
    name: str = Field(min_length=2)
    code: str = Field(min_length=2)
    description: Optional[str] = None

class InviteAdminPayload(BaseModel):
    official_email: EmailStr
    full_name: str = Field(min_length=2)
    department: Optional[str] = None

class UpdateUserStatusPayload(BaseModel):
    status: str = Field(pattern="^(ACTIVE|SUSPENDED)$")

class UpdateGamificationConfigPayload(BaseModel):
    report_points: int = Field(ge=1, le=1000)
    confirmation_points: int = Field(ge=1, le=500)
    resolution_points: int = Field(ge=1, le=2000)

class BroadcastNotificationPayload(BaseModel):
    title: str = Field(min_length=2)
    message: str = Field(min_length=5)

@router.get("/owner/dashboard-stats", status_code=status.HTTP_200_OK)
def get_owner_dashboard_stats(
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """Returns high-level executive KPI metrics for active university owner."""
    membership = context["membership"]
    return db_store.get_owner_dashboard_stats(university_id=membership.university_id)

@router.get("/owner/university-profile", status_code=status.HTTP_200_OK)
def get_university_profile(
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """Returns university profile metadata."""
    membership = context["membership"]
    univ = db_store.get_university(membership.university_id)
    if not univ:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")
    return univ.model_dump()

@router.put("/owner/university-profile", status_code=status.HTTP_200_OK)
def update_university_profile(
    payload: UpdateUniversityProfilePayload,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """Updates university profile metadata and logs audit record."""
    membership = context["membership"]
    user = context["user"]
    try:
        return db_store.update_university_profile(
            university_id=membership.university_id,
            owner_user_id=user["id"],
            name=payload.name,
            official_website=payload.official_website,
            logo_url=payload.logo_url,
            primary_color=payload.primary_color,
            contact_email=payload.contact_email
        )
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")

@router.get("/owner/departments", status_code=status.HTTP_200_OK)
def list_departments(
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> List[Dict[str, Any]]:
    """Lists departments for active university."""
    membership = context["membership"]
    return db_store.list_departments(university_id=membership.university_id)

@router.post("/owner/departments", status_code=status.HTTP_201_CREATED)
def create_department(
    payload: CreateDepartmentPayload,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """Creates a department for active university."""
    membership = context["membership"]
    user = context["user"]
    return db_store.create_department(
        university_id=membership.university_id,
        owner_user_id=user["id"],
        name=payload.name,
        code=payload.code,
        description=payload.description
    )

@router.get("/owner/admins", status_code=status.HTTP_200_OK)
def list_university_admins(
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> List[Dict[str, Any]]:
    """Lists campus admin users for active university."""
    membership = context["membership"]
    return db_store.list_university_admins(university_id=membership.university_id)

@router.post("/owner/invite-admin", status_code=status.HTTP_201_CREATED)
def invite_admin(
    payload: InviteAdminPayload,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """Invites a campus admin to active university."""
    membership = context["membership"]
    user = context["user"]
    return db_store.invite_admin_by_owner(
        university_id=membership.university_id,
        owner_user_id=user["id"],
        official_email=payload.official_email,
        full_name=payload.full_name,
        department=payload.department
    )

@router.post("/owner/admins/{target_user_id}/status", status_code=status.HTTP_200_OK)
def update_admin_status(
    target_user_id: str,
    payload: UpdateUserStatusPayload,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """Suspends or activates an admin membership for active university."""
    membership = context["membership"]
    user = context["user"]
    try:
        return db_store.update_membership_status_by_owner(
            university_id=membership.university_id,
            target_user_id=target_user_id,
            owner_user_id=user["id"],
            new_status=payload.status
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/owner/students", status_code=status.HTTP_200_OK)
def list_university_students(
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> List[Dict[str, Any]]:
    """Lists students belonging to active university."""
    membership = context["membership"]
    return db_store.list_university_students(university_id=membership.university_id)

@router.post("/owner/students/{target_user_id}/status", status_code=status.HTTP_200_OK)
def update_student_status(
    target_user_id: str,
    payload: UpdateUserStatusPayload,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """
    Suspends or activates a student membership in owner's university.
    Cross-university suspension is rejected with HTTP 403.
    """
    membership = context["membership"]
    user = context["user"]
    try:
        return db_store.update_membership_status_by_owner(
            university_id=membership.university_id,
            target_user_id=target_user_id,
            owner_user_id=user["id"],
            new_status=payload.status
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/owner/gamification-config", status_code=status.HTTP_200_OK)
def get_gamification_config(
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """Returns gamification configuration for active university."""
    membership = context["membership"]
    return db_store.get_gamification_config(university_id=membership.university_id)

@router.put("/owner/gamification-config", status_code=status.HTTP_200_OK)
def update_gamification_config(
    payload: UpdateGamificationConfigPayload,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """
    Updates future gamification configuration rules.
    Enforces server-side bounds validation.
    NEVER recalculates or modifies historical contribution events!
    Audits old and new values in admin_actions.
    """
    membership = context["membership"]
    user = context["user"]
    try:
        return db_store.update_gamification_config(
            university_id=membership.university_id,
            owner_user_id=user["id"],
            report_points=payload.report_points,
            confirmation_points=payload.confirmation_points,
            resolution_points=payload.resolution_points
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/owner/broadcast-notification", status_code=status.HTTP_200_OK)
def broadcast_notification(
    payload: BroadcastNotificationPayload,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
) -> Dict[str, Any]:
    """Broadcasts a notification to all active students and staff in university."""
    membership = context["membership"]
    user = context["user"]
    return db_store.broadcast_university_notification(
        university_id=membership.university_id,
        owner_user_id=user["id"],
        title=payload.title,
        message=payload.message
    )

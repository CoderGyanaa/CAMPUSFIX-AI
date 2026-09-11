from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.api.deps import get_current_tenant_user
from app.models.domain import (
    NotificationPreferencePayload, NotificationPreferenceResponse,
    NotificationListResponse
)
from app.db.store import db_store

router = APIRouter(prefix="/notifications", tags=["Notifications & Communication"])

@router.get("", response_model=NotificationListResponse, status_code=status.HTTP_200_OK)
def list_notifications(
    unread_only: bool = Query(False),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    context: dict = Depends(get_current_tenant_user)
):
    """
    Returns authenticated user's notifications for the active university tenant.
    Enforces user isolation & RLS boundaries.
    """
    user = context["user"]
    membership = context["membership"]
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Active university membership required")

    res = db_store.get_user_notifications(
        user_id=user["id"],
        university_id=membership.university_id,
        unread_only=unread_only,
        category=category,
        limit=limit,
        offset=offset
    )
    return res

@router.put("/{notification_id}/read", status_code=status.HTTP_200_OK)
def mark_single_notification_read(
    notification_id: str,
    context: dict = Depends(get_current_tenant_user)
):
    """Marks a single notification as read. Enforces user ownership."""
    user = context["user"]
    try:
        res = db_store.mark_notification_read(notification_id=notification_id, user_id=user["id"])
        return res
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))

@router.put("/read-all", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    context: dict = Depends(get_current_tenant_user)
):
    """Marks all notifications for user in active university as read."""
    user = context["user"]
    membership = context["membership"]
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Active university membership required")

    return db_store.mark_all_notifications_read(user_id=user["id"], university_id=membership.university_id)

@router.get("/preferences", response_model=NotificationPreferenceResponse, status_code=status.HTTP_200_OK)
def get_notification_preferences(
    context: dict = Depends(get_current_tenant_user)
):
    """Retrieves current user's notification preferences."""
    user = context["user"]
    return db_store.get_user_notification_preferences(user_id=user["id"])

@router.put("/preferences", response_model=NotificationPreferenceResponse, status_code=status.HTTP_200_OK)
def update_notification_preferences(
    payload: NotificationPreferencePayload,
    context: dict = Depends(get_current_tenant_user)
):
    """Updates current user's notification preferences."""
    user = context["user"]
    return db_store.update_user_notification_preferences(
        user_id=user["id"],
        payload_dict=payload.model_dump(exclude_unset=True)
    )

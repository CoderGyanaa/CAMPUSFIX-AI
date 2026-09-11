from typing import List, Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_access_token
from app.db.store import db_store
from app.models.domain import UserRole, MembershipStatus, UniversityMembership

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload["sub"]
    user = db_store.users.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found"
        )
    return user

def get_current_tenant_user(
    x_university_id: Optional[str] = Header(None, alias="X-University-ID"),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Enforces active tenant membership (`university_id`).
    If the user's membership is SUSPENDED or non-existent for the target university,
    rejects with HTTP 403 Forbidden.
    Super Admins are granted platform access.
    """
    if current_user.get("is_super_admin"):
        return {"user": current_user, "membership": None}

    if not x_university_id:
        # Check if user has at least one active membership
        memberships = db_store.get_user_memberships(current_user["id"])
        active_memberships = [m for m in memberships if m.status == MembershipStatus.ACTIVE]
        if not active_memberships:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no active university memberships"
            )
        # Default to first active membership
        membership = active_memberships[0]
    else:
        membership = db_store.get_user_tenant_membership(current_user["id"], x_university_id)
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: No membership found for this university"
            )

    if membership.status == MembershipStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Your membership in this university has been suspended"
        )

    if membership.status != MembershipStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Membership is not active"
        )

    # Enforce University Tenant Active Status Check
    univ = db_store.get_university(membership.university_id)
    if univ and not univ.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: University tenant has been suspended by platform administration"
        )

    return {"user": current_user, "membership": membership}

class RequireRole:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, context: dict = Depends(get_current_tenant_user)) -> dict:
        user = context["user"]
        membership: Optional[UniversityMembership] = context["membership"]

        if user.get("is_super_admin") and UserRole.SUPER_ADMIN in self.allowed_roles:
            return context

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this operation"
            )

        if membership.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role in {self.allowed_roles}, got {membership.role}"
            )

        return context

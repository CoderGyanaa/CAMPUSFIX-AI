import uuid
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.store import db_store
from app.models.domain import (
    StudentSignupRequest, LoginRequest, LoginResponse, GoogleOAuthExchangePayload,
    ForgotPasswordPayload, ResetPasswordPayload, UserProfile, UserRole, MembershipStatus
)
from app.core.security import create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/student/signup", status_code=status.HTTP_201_CREATED)
def student_signup(payload: StudentSignupRequest):
    # 1. Verify university exists and is active
    univ = db_store.get_university(payload.university_id)
    if not univ or not univ.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or unapproved university selected"
        )

    # 2. Additional validation layer: domain check
    email_domain = payload.email.split("@")[-1].lower()
    if univ.email_domain and email_domain != univ.email_domain.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email domain '{email_domain}' does not match university official domain '@{univ.email_domain}'"
        )

    # 3. Check for existing user
    existing_user = db_store.get_user_by_email(payload.email)
    if existing_user:
        # Check if already a member of this university
        existing_mem = db_store.get_user_tenant_membership(existing_user["id"], univ.id)
        if existing_mem:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already registered with this university"
            )
        user = existing_user
    else:
        user = db_store.create_user(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name
        )

    # 4. Explicitly tie membership to the approved tenant
    membership = db_store.create_membership(
        user_id=user["id"],
        university_id=univ.id,
        role=UserRole.STUDENT,
        department=payload.department,
        student_id=payload.student_id,
        status=MembershipStatus.ACTIVE
    )

    token = create_access_token({"sub": user["id"]})
    return {
        "message": "Student registration successful",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["id"],
        "university_id": univ.id
    }

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    user = db_store.get_user_by_email(payload.email)
    if not user or not db_store.verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({"sub": user["id"]})
    memberships = db_store.get_user_memberships(user["id"])

    user_profile = UserProfile(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        is_super_admin=user.get("is_super_admin", False),
        is_verified=user.get("is_verified", True),
        created_at=user["created_at"]
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_profile,
        "memberships": memberships
    }

@router.post("/oauth/google", response_model=LoginResponse)
def google_oauth_exchange(payload: GoogleOAuthExchangePayload):
    user = db_store.get_user_by_email(payload.email)
    
    if not user:
        full_name = payload.full_name or payload.email.split("@")[0].capitalize()
        random_pwd = str(uuid.uuid4())
        user = db_store.create_user(
            email=payload.email,
            password=random_pwd,
            full_name=full_name
        )
        
        email_domain = payload.email.split("@")[-1].lower()
        matched_univ_id = "univ-1"
        for univ in db_store.universities.values():
            if univ.email_domain and univ.email_domain.lower() == email_domain and univ.is_active:
                matched_univ_id = univ.id
                break
        
        db_store.create_membership(
            user_id=user["id"],
            university_id=matched_univ_id,
            role=UserRole.STUDENT,
            department="Student Community",
            status=MembershipStatus.ACTIVE
        )

    token = create_access_token({"sub": user["id"]})
    memberships = db_store.get_user_memberships(user["id"])

    user_profile = UserProfile(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        is_super_admin=user.get("is_super_admin", False),
        is_verified=user.get("is_verified", True),
        created_at=user["created_at"]
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_profile,
        "memberships": memberships
    }

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordPayload):
    user = db_store.get_user_by_email(payload.email)
    if not user:
        # Avoid user enumeration in security best practices
        return {"message": "If an account exists with this email, a password reset link has been sent."}

    reset_token = str(uuid.uuid4())
    db_store.reset_tokens[reset_token] = user["email"]
    return {
        "message": "Password reset token generated",
        "reset_token": reset_token
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordPayload):
    email = db_store.reset_tokens.get(payload.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    user = db_store.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["hashed_password"] = db_store.hash_password(payload.new_password)
    del db_store.reset_tokens[payload.token]

    return {"message": "Password has been reset successfully"}

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    memberships = db_store.get_user_memberships(current_user["id"])
    return {
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "full_name": current_user["full_name"],
            "is_super_admin": current_user.get("is_super_admin", False)
        },
        "memberships": memberships
    }

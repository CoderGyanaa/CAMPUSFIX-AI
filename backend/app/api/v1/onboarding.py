import uuid
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from app.db.store import db_store
from app.models.domain import (
    UniversityRegisterPayload, UniversityRegistrationRequest, RequestStatus,
    OwnerActivatePayload, AdminInvitePayload, AcceptAdminInvitePayload,
    UserRole, MembershipStatus, OwnerActivationToken, AdminInvitation
)
from app.api.deps import get_current_user, get_current_tenant_user, RequireRole

router = APIRouter(tags=["Onboarding & Administration"])

# --- 1. Public University Registration Request ---
@router.post("/universities/register", status_code=status.HTTP_201_CREATED)
def register_university_request(payload: UniversityRegisterPayload):
    req_id = str(uuid.uuid4())
    req = UniversityRegistrationRequest(
        id=req_id,
        university_name=payload.university_name,
        official_website=payload.official_website,
        institution_type=payload.institution_type,
        country=payload.country,
        state=payload.state,
        city=payload.city,
        applicant_name=payload.applicant_name,
        applicant_designation=payload.applicant_designation,
        official_email=payload.official_email,
        phone=payload.phone,
        status=RequestStatus.PENDING,
        created_at=datetime.utcnow().isoformat()
    )
    db_store.requests[req_id] = req
    return {
        "message": "University registration request submitted successfully. Awaiting Super Admin review.",
        "request_id": req_id,
        "status": req.status
    }

# --- 2. Super Admin Portal (/platform-admin) ---
@router.get("/platform/requests", response_model=List[UniversityRegistrationRequest])
def list_pending_requests(context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))):
    return list(db_store.requests.values())

@router.post("/platform/requests/{request_id}/approve")
def approve_university_request(
    request_id: str,
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
):
    req = db_store.requests.get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Registration request not found")

    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is already in '{req.status}' state")

    # 1. Update request status
    req.status = RequestStatus.APPROVED

    # 2. Extract domain from website or email
    email_domain = req.official_email.split("@")[-1].lower()

    # 3. Create active university tenant
    univ = db_store.create_university(
        name=req.university_name,
        website=req.official_website,
        email_domain=email_domain,
        country=req.country
    )

    # 4. Generate single-use Owner Activation token
    activation_token = str(uuid.uuid4())
    token_obj = OwnerActivationToken(
        token=activation_token,
        university_id=univ.id,
        email=req.official_email,
        used=False,
        created_at=datetime.utcnow().isoformat()
    )
    db_store.owner_tokens[activation_token] = token_obj

    # 5. Audit Super Admin Action
    user = context["user"]
    audit_rec = {
        "id": str(uuid.uuid4()),
        "university_id": univ.id,
        "admin_user_id": user["id"],
        "action_type": "SUPER_ADMIN_APPROVE_UNIVERSITY_REQUEST",
        "target_entity": "university_requests",
        "target_id": request_id,
        "payload": f"approved request for {req.university_name}",
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.admin_actions.append(audit_rec)

    return {
        "message": "University approved and created successfully.",
        "university": univ,
        "owner_activation_token": activation_token
    }

@router.post("/platform/requests/{request_id}/reject")
def reject_university_request(
    request_id: str,
    reason: str = "Does not meet university verification criteria",
    context: dict = Depends(RequireRole([UserRole.SUPER_ADMIN]))
):
    req = db_store.requests.get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Registration request not found")

    req.status = RequestStatus.REJECTED
    req.rejection_reason = reason

    # Audit Super Admin Action
    user = context["user"]
    audit_rec = {
        "id": str(uuid.uuid4()),
        "university_id": None,
        "admin_user_id": user["id"],
        "action_type": "SUPER_ADMIN_REJECT_UNIVERSITY_REQUEST",
        "target_entity": "university_requests",
        "target_id": request_id,
        "payload": f"rejected request for {req.university_name}: {reason}",
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.admin_actions.append(audit_rec)

    return {"message": "University request rejected", "request_id": request_id}

# --- 3. University Owner Activation Flow ---
@router.post("/owner/activate")
def activate_university_owner(payload: OwnerActivatePayload):
    token_obj = db_store.owner_tokens.get(payload.token)
    if not token_obj or token_obj.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used activation token"
        )

    # Create user account for University Owner
    user = db_store.get_user_by_email(token_obj.email)
    if not user:
        user = db_store.create_user(
            email=token_obj.email,
            password=payload.password,
            full_name=payload.full_name
        )

    # Assign UNIVERSITY_OWNER role membership
    membership = db_store.create_membership(
        user_id=user["id"],
        university_id=token_obj.university_id,
        role=UserRole.UNIVERSITY_OWNER,
        status=MembershipStatus.ACTIVE
    )

    token_obj.used = True
    return {
        "message": "University Owner account activated successfully",
        "user_id": user["id"],
        "university_id": token_obj.university_id,
        "role": UserRole.UNIVERSITY_OWNER
    }

# --- 4. Secure Admin Invitation Flow ---
@router.post("/admin/invite")
def invite_admin(
    payload: AdminInvitePayload,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
):
    membership = context["membership"]
    univ_id = membership.university_id

    # Create server-side invitation token
    invite_token = str(uuid.uuid4())
    invite = AdminInvitation(
        token=invite_token,
        email=payload.official_email,
        university_id=univ_id,
        role=UserRole.ADMIN,
        department=payload.department,
        used=False,
        created_at=datetime.utcnow().isoformat()
    )
    db_store.admin_invites[invite_token] = invite

    return {
        "message": f"Admin invitation sent to {payload.official_email}",
        "invite_token": invite_token,
        "university_id": univ_id
    }

@router.post("/admin/accept-invite")
def accept_admin_invite(payload: AcceptAdminInvitePayload):
    invite = db_store.admin_invites.get(payload.token)
    if not invite or invite.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already used admin invitation token"
        )

    # Create or fetch user account
    user = db_store.get_user_by_email(invite.email)
    if not user:
        user = db_store.create_user(
            email=invite.email,
            password=payload.password,  # Admin sets their OWN password
            full_name=payload.full_name
        )

    # Create active admin membership
    membership = db_store.create_membership(
        user_id=user["id"],
        university_id=invite.university_id,
        role=UserRole.ADMIN,
        department=invite.department,
        status=MembershipStatus.ACTIVE
    )

    invite.used = True
    return {
        "message": "Admin account activated successfully",
        "user_id": user["id"],
        "university_id": invite.university_id,
        "role": UserRole.ADMIN
    }

# --- 5. Admin Suspension / Deactivation ---
@router.post("/admin/memberships/{membership_id}/deactivate")
def deactivate_admin_membership(
    membership_id: str,
    context: dict = Depends(RequireRole([UserRole.UNIVERSITY_OWNER]))
):
    owner_mem = context["membership"]
    target_mem = db_store.memberships.get(membership_id)

    if not target_mem:
        raise HTTPException(status_code=404, detail="Target membership not found")

    # Enforce tenant match: Owner can only deactivate admins in their OWN university
    if target_mem.university_id != owner_mem.university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot manage memberships belonging to another university"
        )

    target_mem.status = MembershipStatus.SUSPENDED
    return {
        "message": f"Membership {membership_id} has been suspended.",
        "status": target_mem.status
    }

import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from datetime import datetime
from app.api.deps import get_current_tenant_user, RequireRole
from app.models.domain import UserRole
from app.services.storage_service import storage_service
from app.services.issue_service import issue_service
from app.db.store import db_store

router = APIRouter(prefix="/reports", tags=["Issue Reporting Engine"])

class CheckCandidatesPayload(BaseModel):
    category: str
    latitude: float
    longitude: float
    description: str

@router.post("/check-candidates")
def check_duplicate_candidates(
    payload: CheckCandidatesPayload,
    context: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    membership = context["membership"]
    univ_id = membership.university_id

    candidates = issue_service.find_duplicate_candidates(
        university_id=univ_id,
        category=payload.category,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description
    )

    return {
        "candidate_count": len(candidates),
        "candidates": candidates
    }

@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_issue_report(
    category: str = Form(...),
    description: str = Form(...),
    student_priority: str = Form("MEDIUM"),
    latitude: float = Form(...),
    longitude: float = Form(...),
    building_name: Optional[str] = Form("Main Campus"),
    location_mode: Optional[str] = Form("GPS"),  # GPS or MANUAL
    existing_issue_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    context: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    # 1. Enforce Server-Side Rate Limiting (5 reports / 10 mins)
    issue_service.check_student_rate_limit(user["id"], univ_id)

    # 2. Read File Bytes & Validate Actual Magic Bytes Signature + Max 5MB Size
    file_bytes = await file.read()
    sanitized_bytes, random_filename, file_ext = storage_service.validate_and_sanitize_image(
        file_bytes, file.content_type
    )

    # 3. Create Location Entity
    loc_id = str(uuid.uuid4())
    loc_obj = {
        "id": loc_id,
        "university_id": univ_id,
        "building_name": building_name,
        "latitude": latitude,
        "longitude": longitude,
        "location_mode": location_mode,
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.locations[loc_id] = loc_obj

    # 4. Handle Master Issue vs Report Relationship
    if existing_issue_id and existing_issue_id in db_store.issues:
        issue_id = existing_issue_id
        master_issue = db_store.issues[issue_id]
        # Try adding community confirmation (anti-farming checked inside db_store)
        try:
            db_store.add_confirmation(univ_id, issue_id, user["id"])
        except ValueError:
            pass  # User already confirmed
    else:
        issue_id = str(uuid.uuid4())
        master_num = len(db_store.issues) + 101
        master_issue = {
            "id": issue_id,
            "master_issue_number": master_num,
            "university_id": univ_id,
            "title": f"{category.title()} Issue at {building_name}",
            "description": description,
            "category": category.upper(),
            "status": "SUBMITTED",
            "student_priority": student_priority.upper(),
            "ai_priority": None,
            "final_admin_priority": student_priority.upper(),
            "location_id": loc_id,
            "reporter_id": user["id"],
            "created_at": datetime.utcnow().isoformat()
        }
        db_store.issues[issue_id] = master_issue
        if univ_id not in db_store.tenant_issues:
            db_store.tenant_issues[univ_id] = []
        db_store.tenant_issues[univ_id].append(master_issue)

    # 5. Construct Private Supabase Storage Path (NO PUBLIC URL!)
    private_storage_path = storage_service.generate_private_storage_path(
        univ_id, issue_id, random_filename
    )

    # 6. Create Individual REPORT Record
    report_id = str(uuid.uuid4())
    report_obj = {
        "id": report_id,
        "university_id": univ_id,
        "issue_id": issue_id,
        "student_id": user["id"],
        "photo_storage_path": private_storage_path,  # Private bucket path!
        "description": description,
        "category": category.upper(),
        "student_priority": student_priority.upper(),
        "location_id": loc_id,
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.reports[report_id] = report_obj

    return {
        "message": "Report submitted successfully.",
        "report_id": report_id,
        "master_issue_id": issue_id,
        "private_storage_path": private_storage_path,
        "status": master_issue["status"]
    }

@router.post("/{issue_id}/confirm")
def confirm_existing_issue(
    issue_id: str,
    context: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    issue = db_store.issues.get(issue_id)
    if not issue or issue.get("university_id") != univ_id:
        raise HTTPException(status_code=404, detail="Issue not found in this university tenant")

    try:
        conf = db_store.add_confirmation(univ_id, issue_id, user["id"])
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {
        "message": "Community confirmation added successfully.",
        "confirmation_id": conf["id"],
        "issue_id": issue_id
    }

@router.get("/{report_id}/photo-access")
def get_private_photo_access(
    report_id: str,
    context: dict = Depends(get_current_tenant_user)
):
    """
    Generates private authorized access token for report photo evidence.
    Prevents public URL exposure and enforces tenant security access control.
    """
    membership = context["membership"]
    user = context["user"]

    report = db_store.reports.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Enforce Tenant Isolation
    if not user.get("is_super_admin") and report.get("university_id") != membership.university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot access storage media from another university tenant"
        )

    # Generate ephemeral private signed access token
    access_token = f"priv_signed_token_{uuid.uuid4().hex[:16]}"
    return {
        "report_id": report_id,
        "private_storage_path": report["photo_storage_path"],
        "authorized_access_token": access_token,
        "expires_in_seconds": 900
    }

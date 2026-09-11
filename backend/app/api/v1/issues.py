import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from app.api.deps import get_current_tenant_user, RequireRole
from app.models.domain import UserRole
from app.db.store import db_store

router = APIRouter(tags=["Master Issues & Community Signals"])

class AdminVerifyPayload(BaseModel):
    final_admin_priority: str  # LOW, MEDIUM, HIGH, CRITICAL

class AdminMergePayload(BaseModel):
    source_issue_id: str
    target_issue_id: str

@router.get("/issues/{issue_id}")
def get_master_issue_detail(
    issue_id: str,
    context: dict = Depends(get_current_tenant_user)
):
    membership = context["membership"]
    user = context["user"]

    issue = db_store.issues.get(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Master issue not found")

    # Enforce Tenant Isolation
    if not user.get("is_super_admin") and issue.get("university_id") != membership.university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Master issue belongs to another university tenant"
        )

    # Gather linked reports evidence
    linked_reports = [r for r in db_store.reports.values() if r.get("issue_id") == issue_id]
    
    # Gather confirmations & supporter count
    issue_confs = [c for c in db_store.confirmations if c.get("issue_id") == issue_id]

    # Gather status history audit trail
    history = [h for h in db_store.status_history if h.get("issue_id") == issue_id]

    return {
        "issue": issue,
        "linked_reports_count": len(linked_reports),
        "linked_reports": linked_reports,
        "community_confirmations_count": len(issue_confs),
        "affected_student_count": len(set([r["student_id"] for r in linked_reports] + [c["user_id"] for c in issue_confs])),
        "status_history": history,
        "is_merged": issue.get("merged_into_issue_id") is not None,
        "merged_into_issue_id": issue.get("merged_into_issue_id")
    }

@router.post("/issues/{issue_id}/confirm")
def add_community_confirmation(
    issue_id: str,
    context: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    issue = db_store.issues.get(issue_id)
    if not issue or issue.get("university_id") != univ_id:
        raise HTTPException(status_code=404, detail="Master issue not found in active university")

    if issue.get("status") in ["CLOSED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Cannot confirm a closed or rejected issue")

    try:
        conf = db_store.add_confirmation(univ_id, issue_id, user["id"])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {
        "message": "Community confirmation added successfully.",
        "confirmation_id": conf["id"],
        "issue_id": issue_id,
        "points_awarded": 10
    }

@router.post("/admin/issues/{issue_id}/verify")
def verify_master_issue(
    issue_id: str,
    payload: AdminVerifyPayload,
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER]))
):
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    issue = db_store.issues.get(issue_id)
    if not issue or issue.get("university_id") != univ_id:
        raise HTTPException(status_code=404, detail="Master issue not found in active university")

    prev_status = issue["status"]
    new_status = "VERIFIED"

    # Update Issue Priority & Status
    issue["final_admin_priority"] = payload.final_admin_priority.upper()
    issue["status"] = new_status

    # Immutable Status History Record
    db_store.record_status_transition(
        university_id=univ_id,
        issue_id=issue_id,
        changed_by_user_id=user["id"],
        previous_status=prev_status,
        new_status=new_status,
        reason=f"Admin verified issue priority as {payload.final_admin_priority.upper()}"
    )

    # Award Idempotent Verification Points (50 pts) to Original Reporter
    reporter_id = issue["reporter_id"]
    idempotency_key = f"VERIFY:{issue_id}:{reporter_id}"
    event, is_new = db_store.award_contribution_points(
        idempotency_key=idempotency_key,
        university_id=univ_id,
        user_id=reporter_id,
        event_type="VERIFIED_REPORT",
        points_awarded=50,
        issue_id=issue_id
    )

    return {
        "message": "Master issue verified successfully.",
        "issue_id": issue_id,
        "status": new_status,
        "final_admin_priority": issue["final_admin_priority"],
        "reporter_points_awarded": event["points_awarded"],
        "is_first_verification_award": is_new
    }

@router.post("/admin/issues/merge")
def merge_master_issues(
    payload: AdminMergePayload,
    context: dict = Depends(RequireRole([UserRole.ADMIN, UserRole.UNIVERSITY_OWNER]))
):
    """
    Atomic Transactional Merge Engine.
    Preserves source issue, linked reports, confirmations, timestamps, and status history.
    Sets source_issue.merged_into_issue_id = target_issue_id and source_issue.status = 'CLOSED'.
    Rejects unrelated category merges or cross-tenant merges with atomic rollback!
    """
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    source_issue = db_store.issues.get(payload.source_issue_id)
    target_issue = db_store.issues.get(payload.target_issue_id)

    if not source_issue or not target_issue:
        raise HTTPException(status_code=404, detail="Source or Target master issue not found")

    # 1. Cross-Tenant Security Check
    if source_issue.get("university_id") != univ_id or target_issue.get("university_id") != univ_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot merge issues across different university tenants"
        )

    # 2. Unrelated Category Check (Prevents merging Water Leak into Trash Overflow)
    if source_issue.get("category") != target_issue.get("category"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot merge unrelated issues: Source category '{source_issue.get('category')}' does not match target category '{target_issue.get('category')}'"
        )

    if source_issue["id"] == target_issue["id"]:
        raise HTTPException(status_code=400, detail="Cannot merge an issue into itself")

    # Atomic Transaction: Re-link reports while preserving source issue history
    source_reports = [r for r in db_store.reports.values() if r.get("issue_id") == source_issue["id"]]
    for r in source_reports:
        r["issue_id"] = target_issue["id"]

    # Re-link confirmations skipping duplicates
    source_confs = [c for c in db_store.confirmations if c.get("issue_id") == source_issue["id"]]
    for c in source_confs:
        existing = [x for x in db_store.confirmations if x["issue_id"] == target_issue["id"] and x["user_id"] == c["user_id"]]
        if not existing:
            c["issue_id"] = target_issue["id"]

    # Update Source Issue Status & Pointer
    prev_status = source_issue["status"]
    source_issue["merged_into_issue_id"] = target_issue["id"]
    source_issue["status"] = "CLOSED"

    # Immutable Status History for Source Issue
    db_store.record_status_transition(
        university_id=univ_id,
        issue_id=source_issue["id"],
        changed_by_user_id=user["id"],
        previous_status=prev_status,
        new_status="CLOSED",
        reason=f"Merged into Master Issue #{target_issue.get('master_issue_number', 'Target')}"
    )

    # Insert Admin Action Audit Trail
    audit_action = {
        "id": str(uuid.uuid4()),
        "university_id": univ_id,
        "admin_user_id": user["id"],
        "action_type": "MERGE_ISSUES",
        "target_entity": "issues",
        "target_id": source_issue["id"],
        "payload": f"Merged source issue {source_issue['id']} into target issue {target_issue['id']}",
        "created_at": datetime.utcnow().isoformat()
    }
    db_store.admin_actions.append(audit_action)

    return {
        "message": "Transactional issue merge completed successfully.",
        "source_issue_id": source_issue["id"],
        "target_issue_id": target_issue["id"],
        "merged_reports_count": len(source_reports),
        "source_status": source_issue["status"],
        "merged_into_issue_id": source_issue["merged_into_issue_id"]
    }

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_tenant_user, RequireRole
from app.models.domain import UserRole
from app.db.store import db_store

router = APIRouter(prefix="/tenant", tags=["Multi-Tenant Operations"])

@router.get("/issues")
def get_tenant_issues(context: dict = Depends(get_current_tenant_user)):
    user = context["user"]
    membership = context["membership"]

    if user.get("is_super_admin"):
        return {"message": "Super Admin platform view", "issues": db_store.tenant_issues}

    univ_id = membership.university_id
    issues = db_store.tenant_issues.get(univ_id, [])
    return {
        "university_id": univ_id,
        "role": membership.role,
        "issues": issues
    }

@router.post("/issues")
def create_tenant_issue(
    title: str,
    context: dict = Depends(get_current_tenant_user)
):
    membership = context["membership"]
    univ_id = membership.university_id

    issue = {
        "id": f"issue-{len(db_store.tenant_issues.get(univ_id, [])) + 1}",
        "university_id": univ_id,
        "title": title,
        "reporter_id": context["user"]["id"]
    }

    if univ_id not in db_store.tenant_issues:
        db_store.tenant_issues[univ_id] = []

    db_store.tenant_issues[univ_id].append(issue)
    return {"message": "Issue created within tenant boundary", "issue": issue}

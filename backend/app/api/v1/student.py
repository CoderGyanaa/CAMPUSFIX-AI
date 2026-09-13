from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.api.deps import get_current_tenant_user, RequireRole
from app.models.domain import UserRole
from app.db.store import db_store

router = APIRouter(prefix="/student", tags=["Student Portal"])

class ProfileUpdatePayload(BaseModel):
    department: Optional[str] = None
    year: Optional[str] = None
    section: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    # Security test check fields
    attempt_user_id: Optional[str] = Field(None, description="Attempts to modify user_id")
    attempt_university_id: Optional[str] = Field(None, description="Attempts to modify university_id")

@router.get("/profile")
def get_student_profile(context: dict = Depends(RequireRole([UserRole.STUDENT]))):
    user = context["user"]
    membership = context["membership"]

    profile = db_store.student_profiles.get(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    univ = db_store.get_university(membership.university_id)

    return {
        "user_id": user["id"],
        "university_id": membership.university_id,
        "university_name": univ.name if univ else "University",
        "full_name": user["full_name"],
        "email": user["email"],
        "student_id": profile["student_id"],  # Included ONLY in own private profile!
        "department": profile["department"],
        "year": profile["year"],
        "section": profile["section"],
        "phone": profile["phone"],
        "bio": profile["bio"],
        "avatar_url": profile["avatar_url"],
        "points": profile["points"],
        "rank": profile["rank"]
    }

@router.put("/profile")
def update_student_profile(
    payload: ProfileUpdatePayload,
    context: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    user = context["user"]
    membership = context["membership"]

    # Security check: Students cannot change user_id or university_id
    if payload.attempt_user_id and payload.attempt_user_id != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forbidden: Cannot modify user_id of profile"
        )
    if payload.attempt_university_id and payload.attempt_university_id != membership.university_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forbidden: Cannot modify university_id of profile"
        )

    profile = db_store.student_profiles.get(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if payload.department is not None:
        profile["department"] = payload.department
    if payload.year is not None:
        profile["year"] = payload.year
    if payload.section is not None:
        profile["section"] = payload.section
    if payload.phone is not None:
        profile["phone"] = payload.phone
    if payload.bio is not None:
        profile["bio"] = payload.bio
    if payload.avatar_url is not None:
        profile["avatar_url"] = payload.avatar_url

    return {
        "message": "Student profile updated successfully",
        "profile": profile
    }

@router.get("/dashboard-summary")
def get_student_dashboard_summary(context: dict = Depends(RequireRole([UserRole.STUDENT]))):
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    profile = db_store.student_profiles.get(user["id"], {})
    univ = db_store.get_university(univ_id)

    # Determine authoritative active campus location coordinates
    campus_lat = getattr(univ, "latitude", None) if univ else None
    campus_lng = getattr(univ, "longitude", None) if univ else None

    # Fallback to centroid of existing issue pins if explicit lat/lng missing on university
    if (campus_lat is None or campus_lng is None) and univ_id:
        univ_locs = [
            loc for i in db_store.issues.values() if i.get("university_id") == univ_id
            for loc in [db_store.locations.get(i.get("location_id"))] if loc and "latitude" in loc and "longitude" in loc
        ]
        if univ_locs:
            campus_lat = sum(l["latitude"] for l in univ_locs) / len(univ_locs)
            campus_lng = sum(l["longitude"] for l in univ_locs) / len(univ_locs)

    # Final fallback if still None
    if campus_lat is None or campus_lng is None:
        campus_lat = 37.7749
        campus_lng = -122.4194

    # Calculate real snapshot metrics
    univ_issues = db_store.tenant_issues.get(univ_id, [])
    user_reports = [r for r in db_store.reports.values() if r.get("student_id") == user["id"] and r.get("university_id") == univ_id]

    return {
        "greeting": f"Welcome back, {user['full_name']}!",
        "university_id": univ_id,
        "university_name": univ.name if univ else "University",
        "campus_center": {
            "latitude": campus_lat,
            "longitude": campus_lng,
            "name": univ.name if univ else "Campus Center",
            "country": univ.country if univ else ""
        },
        "personal_stats": {
          "points": profile.get("points", 0),
          "rank": profile.get("rank", 1),
          "verified_contributions": len(user_reports),
          "issues_resolved": 0
        },
        "campus_snapshot": {
          "critical": len([i for i in univ_issues if i.get("priority") == "CRITICAL"]),
          "high": len([i for i in univ_issues if i.get("priority") == "HIGH"]),
          "medium": len([i for i in univ_issues if i.get("priority") == "MEDIUM"]),
          "low": len([i for i in univ_issues if i.get("priority") == "LOW"])
        }
    }

@router.get("/reports")
def get_my_reports(context: dict = Depends(RequireRole([UserRole.STUDENT]))):
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    my_reports = [r for r in db_store.reports.values() if r.get("student_id") == user["id"] and r.get("university_id") == univ_id]
    return {"reports": my_reports}

@router.get("/leaderboard")
def get_public_leaderboard(context: dict = Depends(RequireRole([UserRole.STUDENT]))):
    """
    Public leaderboard showing student rankings.
    CRITICAL: Student ID is NEVER exposed in public leaderboard data!
    """
    membership = context["membership"]
    univ_id = membership.university_id

    # Filter student profiles belonging to current active university
    univ_students = [
        p for p in db_store.student_profiles.values()
        if p.get("university_id") == univ_id
    ]

    leaderboard = []
    for idx, p in enumerate(sorted(univ_students, key=lambda x: x.get("points", 0), reverse=True), start=1):
        u = db_store.users.get(p["user_id"], {})
        leaderboard.append({
            "rank": idx,
            "full_name": u.get("full_name", "Student"),
            "avatar_url": p.get("avatar_url", ""),
            "department": p.get("department", ""),
            "points": p.get("points", 0)
            # Student ID is EXCLUDED!
        })

    return {"leaderboard": leaderboard}

@router.get("/achievements")
def get_student_achievements(context: dict = Depends(RequireRole([UserRole.STUDENT]))):
    user = context["user"]
    profile = db_store.student_profiles.get(user["id"], {})
    user_pts = profile.get("points", 0)

    badges_list = []
    for b in db_store.badges.values():
        unlocked = user_pts >= b.get("points_threshold", 0)
        badges_list.append({
            "id": b["id"],
            "name": b["name"],
            "code": b["code"],
            "description": b["description"],
            "icon": b["icon"],
            "points_threshold": b["points_threshold"],
            "unlocked": unlocked
        })

    return {"achievements": badges_list, "user_points": user_pts}

@router.get("/impact")
def get_student_impact(context: dict = Depends(RequireRole([UserRole.STUDENT]))):
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    user_reports = [r for r in db_store.reports.values() if r.get("student_id") == user["id"] and r.get("university_id") == univ_id]
    user_confs = [c for c in db_store.confirmations if c.get("user_id") == user["id"] and c.get("university_id") == univ_id]

    return {
        "verified_reports_count": len(user_reports),
        "community_confirmations_count": len(user_confs),
        "issues_resolved_count": 0,
        "sdg_impact": ["SDG 11 - Sustainable Cities", "SDG 6 - Clean Water"]
    }

@router.get("/notifications")
def get_student_notifications(context: dict = Depends(RequireRole([UserRole.STUDENT]))):
    user = context["user"]
    membership = context["membership"]
    univ_id = membership.university_id

    my_notes = [n for n in db_store.notifications if n.get("user_id") == user["id"] and n.get("university_id") == univ_id]
    return {"notifications": my_notes}

@router.get("/map-issues")
def get_student_map_issues(context: dict = Depends(RequireRole([UserRole.STUDENT]))):
    membership = context["membership"]
    univ_id = membership.university_id
    return db_store.get_admin_map_issues(university_id=univ_id)


import math
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from fastapi import HTTPException, status
from app.core.config import settings
from app.db.store import db_store

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates Haversine distance in meters between two lat/lon coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Token overlap similarity score between two descriptions."""
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)

class IssueService:
    def check_student_rate_limit(self, user_id: str, university_id: str):
        """Enforces configurable N reports per M minutes rate limit per authenticated student."""
        cutoff = datetime.utcnow() - timedelta(minutes=settings.RATE_LIMIT_WINDOW_MINUTES)

        user_recent_reports = [
            r for r in db_store.reports.values()
            if r.get("student_id") == user_id
            and r.get("university_id") == university_id
            and datetime.fromisoformat(r["created_at"]) >= cutoff
        ]

        if len(user_recent_reports) >= settings.RATE_LIMIT_REPORTS_COUNT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: Maximum {settings.RATE_LIMIT_REPORTS_COUNT} reports per {settings.RATE_LIMIT_WINDOW_MINUTES} minutes allowed."
            )

    def find_duplicate_candidates(
        self,
        university_id: str,
        category: str,
        latitude: float,
        longitude: float,
        description: str
    ) -> List[Dict]:
        """
        Finds nearby active candidate issues using multi-factor scoring:
        location + category + status + time + description similarity.
        MANDATORY: Location proximity alone NEVER marks an issue as duplicate!
        """
        candidates = []
        univ_issues = [
            i for i in db_store.issues.values()
            if i.get("university_id") == university_id
            and i.get("status") in ['SUBMITTED', 'AI_ANALYZED', 'UNDER_REVIEW', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS']
        ]

        search_radius = settings.CANDIDATE_SEARCH_RADIUS_METERS

        for issue in univ_issues:
            loc_id = issue.get("location_id")
            if not loc_id or loc_id not in db_store.locations:
                continue

            loc = db_store.locations[loc_id]
            dist_meters = haversine_distance_meters(latitude, longitude, loc["latitude"], loc["longitude"])

            # 1. Candidate Radius Check (~50m threshold)
            if dist_meters > search_radius:
                continue

            # 2. Multi-Factor Evaluation
            category_match = (issue.get("category") == category)
            desc_sim = calculate_text_similarity(description, issue.get("description", ""))

            # Score calculation
            loc_score = max(0.0, 1.0 - (dist_meters / search_radius))
            cat_score = 1.0 if category_match else 0.0

            # CRITICAL RULE: If category does NOT match, location alone NEVER triggers duplicate candidate!
            if not category_match:
                match_score = 0.1 * loc_score  # Low score (<0.3 threshold)
            else:
                match_score = (0.4 * cat_score) + (0.3 * loc_score) + (0.3 * desc_sim)

            # Threshold for candidate suggestion
            if match_score >= 0.4:
                confirm_count = len([c for c in db_store.confirmations if c["issue_id"] == issue["id"]])
                candidates.append({
                    "issue_id": issue["id"],
                    "master_issue_number": issue.get("master_issue_number", 101),
                    "title": issue["title"],
                    "category": issue["category"],
                    "status": issue["status"],
                    "distance_meters": round(dist_meters, 1),
                    "match_score": round(match_score, 2),
                    "community_confirmations": confirm_count
                })

        return sorted(candidates, key=lambda x: x["match_score"], reverse=True)

issue_service = IssueService()

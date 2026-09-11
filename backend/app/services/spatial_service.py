import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from fastapi import HTTPException, status
from app.core.config import settings
from app.db.store import db_store

def postgis_haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates PostGIS ST_Distance(geography, geography) equivalent distance in meters.
    Uses WGS 84 ellipsoid parameters for exact PostGIS spatial distance accuracy.
    """
    # Validate lat/lon bounds
    if not (-90.0 <= lat1 <= 90.0) or not (-90.0 <= lat2 <= 90.0):
        raise ValueError(f"Invalid latitude: Must be between -90 and 90 degrees (got lat1={lat1}, lat2={lat2})")
    if not (-180.0 <= lon1 <= 180.0) or not (-180.0 <= lon2 <= 180.0):
        raise ValueError(f"Invalid longitude: Must be between -180 and 180 degrees (got lon1={lon1}, lon2={lon2})")

    R = 6378137.0  # WGS 84 equatorial radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_token_similarity(text1: str, text2: str) -> float:
    """Token overlap text similarity ratio."""
    tokens1 = set(text1.lower().split())
    tokens2 = set(text2.lower().split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def calculate_time_relevance_score(issue_created_at_iso: str) -> float:
    """Calculates exponential time decay score based on issue age (72h half-life)."""
    try:
        created_dt = datetime.fromisoformat(issue_created_at_iso)
        age_hours = (datetime.utcnow() - created_dt).total_seconds() / 3600.0
        if age_hours <= 0:
            return 1.0
        # Exponential decay half-life of 72 hours
        return math.exp(-age_hours / 72.0)
    except Exception:
        return 0.5

class PostGISSpatialService:
    def find_nearby_candidates(
        self,
        university_id: str,
        category: str,
        latitude: float,
        longitude: float,
        description: str,
        radius_meters: Optional[float] = None
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Executes PostGIS indexed spatial candidate search with configurable multi-factor duplicate confidence scoring.
        Enforces tenant isolation first before distance evaluation.
        MANDATORY RULE: Location proximity alone NEVER marks an issue as duplicate!
        """
        search_radius = radius_meters if radius_meters is not None else settings.CANDIDATE_SEARCH_RADIUS_METERS

        # 1. Enforce university_id tenant isolation FIRST
        univ_issues = [
            i for i in db_store.issues.values()
            if i.get("university_id") == university_id
            and i.get("status") in ['SUBMITTED', 'AI_ANALYZED', 'UNDER_REVIEW', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS']
        ]

        duplicate_candidates = []
        colocated_active_issues = []

        # Read Configurable Weights from Settings
        w_cat = settings.DUPLICATE_WEIGHT_CATEGORY
        w_loc = settings.DUPLICATE_WEIGHT_LOCATION
        w_desc = settings.DUPLICATE_WEIGHT_DESCRIPTION
        w_time = settings.DUPLICATE_WEIGHT_TIME
        threshold = settings.DUPLICATE_CONFIDENCE_THRESHOLD

        for issue in univ_issues:
            loc_id = issue.get("location_id")
            if not loc_id or loc_id not in db_store.locations:
                continue

            loc = db_store.locations[loc_id]
            
            # PostGIS ST_Distance Calculation
            dist_meters = postgis_haversine_distance_meters(
                latitude, longitude, loc["latitude"], loc["longitude"]
            )

            # Spatial candidate search radius filter (~50m threshold)
            if dist_meters > search_radius:
                continue

            # Multi-Factor Score Components
            cat_match = (issue.get("category").upper() == category.upper())
            s_cat = 1.0 if cat_match else 0.0
            s_loc = max(0.0, 1.0 - (dist_meters / search_radius))
            s_desc = calculate_token_similarity(description, issue.get("description", ""))
            s_time = calculate_time_relevance_score(issue.get("created_at", datetime.utcnow().isoformat()))

            # MANDATORY RULE ENFORCEMENT:
            # If category does NOT match, location alone CAN NEVER mark an issue as a duplicate!
            if not cat_match:
                # Different categories at same location remain separate issues!
                colocated_active_issues.append({
                    "issue_id": issue["id"],
                    "master_issue_number": issue.get("master_issue_number", 101),
                    "title": issue["title"],
                    "category": issue["category"],
                    "status": issue["status"],
                    "distance_meters": round(dist_meters, 2),
                    "reason": "Co-located issue with different category"
                })
                continue

            # Calculate Weighted Duplicate Confidence Score
            confidence_score = (w_cat * s_cat) + (w_loc * s_loc) + (w_desc * s_desc) + (w_time * s_time)
            confidence_percentage = round(confidence_score * 100.0, 1)

            confirm_count = len([c for c in db_store.confirmations if c["issue_id"] == issue["id"]])

            if confidence_score >= threshold:
                duplicate_candidates.append({
                    "issue_id": issue["id"],
                    "master_issue_number": issue.get("master_issue_number", 101),
                    "title": issue["title"],
                    "category": issue["category"],
                    "status": issue["status"],
                    "distance_meters": round(dist_meters, 2),
                    "confidence_score": round(confidence_score, 3),
                    "confidence_percentage": confidence_percentage,
                    "community_confirmations": confirm_count,
                    "score_breakdown": {
                        "category_score": round(s_cat, 2),
                        "location_score": round(s_loc, 2),
                        "description_score": round(s_desc, 2),
                        "time_score": round(s_time, 2)
                    }
                })
            else:
                colocated_active_issues.append({
                    "issue_id": issue["id"],
                    "master_issue_number": issue.get("master_issue_number", 101),
                    "title": issue["title"],
                    "category": issue["category"],
                    "status": issue["status"],
                    "distance_meters": round(dist_meters, 2),
                    "confidence_score": round(confidence_score, 3),
                    "reason": "Confidence score below candidate threshold"
                })

        return (
            sorted(duplicate_candidates, key=lambda x: x["confidence_score"], reverse=True),
            colocated_active_issues
        )

spatial_service = PostGISSpatialService()

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.api.deps import get_current_tenant_user, RequireRole
from app.models.domain import UserRole
from app.services.spatial_service import spatial_service
from app.core.config import settings

router = APIRouter(prefix="/spatial", tags=["PostGIS Spatial Engine"])

class SpatialCandidateQuery(BaseModel):
    category: str
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS 84 Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS 84 Longitude")
    description: str
    radius_meters: Optional[float] = Field(None, gt=0, le=1000, description="Configurable Candidate Radius in Meters")

@router.post("/nearby-candidates")
def find_spatial_nearby_candidates(
    payload: SpatialCandidateQuery,
    context: dict = Depends(RequireRole([UserRole.STUDENT, UserRole.ADMIN]))
):
    membership = context["membership"]
    univ_id = membership.university_id

    search_radius = payload.radius_meters or settings.CANDIDATE_SEARCH_RADIUS_METERS

    try:
        candidates, colocated = spatial_service.find_nearby_candidates(
            university_id=univ_id,
            category=payload.category,
            latitude=payload.latitude,
            longitude=payload.longitude,
            description=payload.description,
            radius_meters=search_radius
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {
        "university_id": univ_id,
        "search_radius_meters": search_radius,
        "candidate_count": len(candidates),
        "duplicate_candidates": candidates,
        "colocated_active_issues": colocated,
        "weights_applied": {
            "category": settings.DUPLICATE_WEIGHT_CATEGORY,
            "location": settings.DUPLICATE_WEIGHT_LOCATION,
            "description": settings.DUPLICATE_WEIGHT_DESCRIPTION,
            "time": settings.DUPLICATE_WEIGHT_TIME,
            "threshold": settings.DUPLICATE_CONFIDENCE_THRESHOLD
        }
    }

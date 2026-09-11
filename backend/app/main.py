from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.core.config import settings

from app.api.v1.auth import router as auth_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.tenant import router as tenant_router
from app.api.v1.student import router as student_router
from app.api.v1.reports import router as reports_router
from app.api.v1.spatial import router as spatial_router
from app.api.v1.issues import router as issues_router
from app.api.v1.triage import router as triage_router
from app.api.v1.admin import router as admin_router
from app.api.v1.owner import router as owner_router
from app.api.v1.platform import router as platform_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.analytics import router as analytics_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Campus Sustainability Operations & Community Engagement Platform API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(onboarding_router, prefix="/api/v1")
app.include_router(tenant_router, prefix="/api/v1")
app.include_router(student_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(spatial_router, prefix="/api/v1")
app.include_router(issues_router, prefix="/api/v1")
app.include_router(triage_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(owner_router, prefix="/api/v1")
app.include_router(platform_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str

@app.get("/health", response_model=HealthResponse)
def root_health():
    return {
        "status": "ok",
        "service": "CampusFix AI Backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

@app.get("/api/v1/health", response_model=HealthResponse)
def api_v1_health():
    return {
        "status": "ok",
        "service": "CampusFix AI API v1",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

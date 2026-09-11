from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusFix AI"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    
    # Configurable Candidate Search Radius (meters)
    CANDIDATE_SEARCH_RADIUS_METERS: float = 50.0

    # Configurable Duplicate Confidence Scoring Weights (Configurable per business rules)
    DUPLICATE_WEIGHT_CATEGORY: float = 0.35
    DUPLICATE_WEIGHT_LOCATION: float = 0.25
    DUPLICATE_WEIGHT_DESCRIPTION: float = 0.25
    DUPLICATE_WEIGHT_TIME: float = 0.15
    DUPLICATE_CONFIDENCE_THRESHOLD: float = 0.45

    # Configurable Rate Limiting (Server-side per authenticated student)
    RATE_LIMIT_REPORTS_COUNT: int = 5
    RATE_LIMIT_WINDOW_MINUTES: int = 10

    # Photo Security & Private Storage
    MAX_PHOTO_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB Server-side limit
    SUPABASE_STORAGE_BUCKET_REPORTS: str = "private-issue-reports"

    # Secure Environment-Configured CORS Origins
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Server-Side Only Private Credentials
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/campusfix_db"
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # Gemini AI Triage Engine Settings
    GEMINI_PRIMARY_MODEL: str = "gemini-2.5-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-2.5-flash-lite"
    GEMINI_TIMEOUT_SECONDS: int = 8
    GEMINI_MAX_RETRIES: int = 2
    GEMINI_PROMPT_VERSION: str = "v1.0.0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

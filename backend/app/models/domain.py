from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserRole(str, Enum):
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"
    UNIVERSITY_OWNER = "UNIVERSITY_OWNER"
    SUPER_ADMIN = "SUPER_ADMIN"

class MembershipStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    PENDING_INVITE = "PENDING_INVITE"

class RequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MORE_INFO_REQUESTED = "MORE_INFO_REQUESTED"

# --- Database Models / Schemas ---

class University(BaseModel):
    id: str
    name: str
    official_website: str
    email_domain: str
    country: str
    is_active: bool = True
    created_at: str

class UniversityRegistrationRequest(BaseModel):
    id: str
    university_name: str
    official_website: str
    institution_type: str
    country: str
    state: str
    city: str
    applicant_name: str
    applicant_designation: str
    official_email: str
    phone: str
    status: RequestStatus = RequestStatus.PENDING
    rejection_reason: Optional[str] = None
    created_at: str

class UserProfile(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_super_admin: bool = False
    is_verified: bool = True
    created_at: str

class UniversityMembership(BaseModel):
    id: str
    user_id: str
    university_id: str
    role: UserRole
    status: MembershipStatus = MembershipStatus.ACTIVE
    department: Optional[str] = None
    student_id: Optional[str] = None
    created_at: str

class OwnerActivationToken(BaseModel):
    token: str
    university_id: str
    email: EmailStr
    used: bool = False
    created_at: str

class AdminInvitation(BaseModel):
    token: str
    email: EmailStr
    university_id: str
    role: UserRole = UserRole.ADMIN
    department: Optional[str] = None
    used: bool = False
    created_at: str

# --- API Request/Response Payloads ---

class StudentSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    university_id: str
    student_id: str
    department: str
    year: str
    section: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    memberships: List[UniversityMembership]

class GoogleOAuthExchangePayload(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    provider: str = "google"
    provider_id: Optional[str] = None

class UniversityRegisterPayload(BaseModel):
    university_name: str
    official_website: str
    institution_type: str
    country: str
    state: str
    city: str
    applicant_name: str
    applicant_designation: str
    official_email: EmailStr
    phone: str

class OwnerActivatePayload(BaseModel):
    token: str
    password: str = Field(min_length=6)
    full_name: str

class AdminInvitePayload(BaseModel):
    official_email: EmailStr
    full_name: str
    designation: str
    department: str

class AcceptAdminInvitePayload(BaseModel):
    token: str
    password: str = Field(min_length=6)
    full_name: str

class ForgotPasswordPayload(BaseModel):
    email: EmailStr

class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str = Field(min_length=6)

# --- Gemini AI Triage Models ---

class GeminiTriageResponse(BaseModel):
    recommended_category: str
    recommended_priority: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    sdg_mapping: str
    reasoning: str
    suggested_action: str

class AITriageRecord(BaseModel):
    id: str
    university_id: str
    issue_id: str
    recommended_category: str
    recommended_priority: str
    confidence_score: float
    sdg_mapping: str
    reasoning: str
    suggested_action: str
    prompt_version: str = "v1.0.0"
    primary_model: str = "gemini-2.5-flash"
    model_used: str = "gemini-2.5-flash"
    fallback_used: bool = False
    retry_count: int = 0
    failure_reason: Optional[str] = None
    is_fallback: bool = False
    raw_response: Optional[str] = None
    created_at: str

class AdminOverrideTriagePayload(BaseModel):
    final_admin_priority: str = Field(pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    category: Optional[str] = None
    notes: Optional[str] = None

# --- M12 Notification & Communication Models ---

class NotificationType(str, Enum):
    REPORT_STATUS_CHANGE = "REPORT_STATUS_CHANGE"
    COMMUNITY_VERIFICATION = "COMMUNITY_VERIFICATION"
    ISSUE_ASSIGNMENT = "ISSUE_ASSIGNMENT"
    BADGE_EARNED = "BADGE_EARNED"
    POINTS_AWARDED = "POINTS_AWARDED"
    UNIVERSITY_BROADCAST = "UNIVERSITY_BROADCAST"
    SUPER_ADMIN_ANNOUNCEMENT = "SUPER_ADMIN_ANNOUNCEMENT"

class NotificationCategory(str, Enum):
    SYSTEM = "SYSTEM"
    COMMUNITY = "COMMUNITY"
    REWARD = "REWARD"
    ADMIN = "ADMIN"
    BROADCAST = "BROADCAST"

class NotificationPreferencePayload(BaseModel):
    email_reports: Optional[bool] = None
    email_verifications: Optional[bool] = None
    email_rewards: Optional[bool] = None
    email_announcements: Optional[bool] = None
    inapp_enabled: Optional[bool] = None

class NotificationPreferenceResponse(BaseModel):
    user_id: str
    email_reports: bool = True
    email_verifications: bool = True
    email_rewards: bool = True
    email_announcements: bool = True
    inapp_enabled: bool = True

class NotificationItem(BaseModel):
    id: str
    university_id: str
    user_id: str
    type: str
    category: str = "SYSTEM"
    title: str
    message: str
    is_read: bool = False
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    delivery_status: str = "DELIVERED"
    email_sent: bool = False
    idempotency_key: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str

class NotificationListResponse(BaseModel):
    notifications: List[NotificationItem]
    unread_count: int

class SuperAdminAnnouncementPayload(BaseModel):
    title: str = Field(min_length=2)
    message: str = Field(min_length=5)
    target_university_ids: Optional[List[str]] = Field(default=None, description="Null or empty targets all universities")

# --- M13 Analytics & Impact Models ---

class PersonalImpactTimelineItem(BaseModel):
    id: str
    event_type: str
    title: str
    points: int
    timestamp: str

class StudentImpactResponse(BaseModel):
    user_id: str
    university_id: str
    verified_reports_count: int
    resolved_issues_count: int
    community_confirmations_count: int
    points_earned: int
    badges_earned_count: int
    sdg_contributions: Dict[str, int]
    monthly_trends: Dict[str, int]
    timeline: List[PersonalImpactTimelineItem]

class DepartmentWorkloadItem(BaseModel):
    department_id: Optional[str]
    department_name: str
    total_assigned: int
    in_progress: int
    resolved: int

class SlaPerformanceMetrics(BaseModel):
    total_closed: int
    resolved_within_sla_count: int
    sla_compliance_pct: float
    avg_resolution_time_hours: float

class UniversityAnalyticsResponse(BaseModel):
    university_id: str
    university_name: str
    total_reports: int
    verified_issues: int
    resolved_issues: int
    open_in_progress_issues: int
    resolution_rate_pct: float
    avg_resolution_time_hours: float
    sla_performance: SlaPerformanceMetrics
    category_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    department_workload: List[DepartmentWorkloadItem]
    monthly_trends: Dict[str, int]
    sdg_mapping: Dict[str, int]
    student_engagement: Dict[str, int]

class AnalyticsExportResponse(BaseModel):
    university_id: str
    generated_at: str
    format: str = "csv"
    csv_content: str


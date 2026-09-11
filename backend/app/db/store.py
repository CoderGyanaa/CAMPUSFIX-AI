import uuid
import bcrypt
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from app.models.domain import (
    UserRole, MembershipStatus, RequestStatus,
    University, UniversityRegistrationRequest, UserProfile,
    UniversityMembership, OwnerActivationToken, AdminInvitation
)
from app.core.notifications import email_provider, rate_limiter
from app.core.analytics import analytics_cache, SDG_CATEGORY_MAPPING

class InMemoryStore:
    def __init__(self):
        self.users: Dict[str, dict] = {}  # user_id -> user_dict
        self.universities: Dict[str, University] = {}  # univ_id -> University
        self.memberships: Dict[str, UniversityMembership] = {}  # membership_id -> UniversityMembership
        self.requests: Dict[str, UniversityRegistrationRequest] = {}  # req_id -> Request
        self.owner_tokens: Dict[str, OwnerActivationToken] = {}  # token -> Token
        self.admin_invites: Dict[str, AdminInvitation] = {}  # token -> Invite
        self.reset_tokens: Dict[str, str] = {}  # token -> email
        
        # M3, M4, M5, M6, M7 Schemas
        self.student_profiles: Dict[str, dict] = {}  # user_id -> profile_dict
        self.issues: Dict[str, dict] = {}  # issue_id -> issue_dict
        self.reports: Dict[str, dict] = {}  # report_id -> report_dict
        self.confirmations: List[dict] = []  # list of confirmation_dicts
        self.locations: Dict[str, dict] = {}  # location_id -> location_dict
        self.assignments: Dict[str, dict] = {}  # assignment_id -> assignment_dict
        self.status_history: List[dict] = []  # list of status_history_dicts
        self.ai_analysis: Dict[str, dict] = {}  # analysis_id -> analysis_dict
        self.contribution_events: Dict[str, dict] = {}  # idempotency_key -> event_dict
        self.badges: Dict[str, dict] = {}  # badge_code -> badge_dict
        self.user_badges: List[dict] = []  # list of user_badge_dicts
        self.notifications: List[dict] = []  # list of notification_dicts
        self.notification_preferences: Dict[str, dict] = {}  # user_id -> pref_dict
        self.admin_actions: List[dict] = []  # list of admin_action_dicts
        self.tenant_issues: Dict[str, List[dict]] = {}  # univ_id -> list of issues
        self.departments: Dict[str, dict] = {}  # dept_id -> dept_dict
        self.gamification_configs: Dict[str, dict] = {}  # univ_id -> config_dict
        self.security_events: List[dict] = []  # list of security_event dicts

        self._seed_super_admin()

    def hash_password(self, password: str) -> str:
        pwd_bytes = password.encode('utf-8')[:72]
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(pwd_bytes, salt)
        return hashed.decode('utf-8')

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        try:
            return bcrypt.checkpw(pwd_bytes, hashed_bytes)
        except Exception:
            return False

    def _seed_super_admin(self):
        super_admin_id = "super-admin-1"
        hashed = self.hash_password("SuperAdmin123!")
        self.users[super_admin_id] = {
            "id": super_admin_id,
            "email": "superadmin@campusfix.ai",
            "full_name": "Platform Super Admin",
            "hashed_password": hashed,
            "is_super_admin": True,
            "is_verified": True,
            "created_at": datetime.utcnow().isoformat()
        }

    def get_user_by_email(self, email: str) -> Optional[dict]:
        email_clean = email.lower().strip()
        for u in self.users.values():
            if u["email"].lower() == email_clean:
                return u
        return None

    def create_user(self, email: str, password: str, full_name: str, is_super_admin: bool = False) -> dict:
        user_id = str(uuid.uuid4())
        hashed = self.hash_password(password)
        user_dict = {
            "id": user_id,
            "email": email.lower().strip(),
            "full_name": full_name,
            "hashed_password": hashed,
            "is_super_admin": is_super_admin,
            "is_verified": True,
            "created_at": datetime.utcnow().isoformat()
        }
        self.users[user_id] = user_dict
        return user_dict

    def create_university(self, name: str, website: str, email_domain: str, country: str) -> University:
        univ_id = str(uuid.uuid4())
        univ = University(
            id=univ_id,
            name=name,
            official_website=website,
            email_domain=email_domain.lower(),
            country=country,
            is_active=True,
            created_at=datetime.utcnow().isoformat()
        )
        self.universities[univ_id] = univ
        self.tenant_issues[univ_id] = []
        return univ

    def get_university(self, univ_id: str) -> Optional[University]:
        return self.universities.get(univ_id)

    def create_membership(self, user_id: str, university_id: str, role: UserRole, department: Optional[str] = None, student_id: Optional[str] = None, status: MembershipStatus = MembershipStatus.ACTIVE) -> UniversityMembership:
        mem_id = str(uuid.uuid4())
        mem = UniversityMembership(
            id=mem_id,
            user_id=user_id,
            university_id=university_id,
            role=role,
            status=status,
            department=department,
            student_id=student_id,
            created_at=datetime.utcnow().isoformat()
        )
        self.memberships[mem_id] = mem
        
        if role == UserRole.STUDENT:
            self.student_profiles[user_id] = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "university_id": university_id,
                "student_id": student_id or "ST-000",
                "department": department or "General",
                "year": "1st Year",
                "section": "A",
                "phone": "",
                "bio": "",
                "avatar_url": "",
                "points": 0,
                "rank": 1,
                "created_at": datetime.utcnow().isoformat()
            }
        return mem

    def get_user_memberships(self, user_id: str) -> List[UniversityMembership]:
        return [m for m in self.memberships.values() if m.user_id == user_id]

    def get_user_tenant_membership(self, user_id: str, university_id: str) -> Optional[UniversityMembership]:
        for m in self.memberships.values():
            if m.user_id == user_id and m.university_id == university_id:
                return m
        return None

    def add_confirmation(self, university_id: str, issue_id: str, user_id: str) -> dict:
        for c in self.confirmations:
            if c["issue_id"] == issue_id and c["user_id"] == user_id:
                raise ValueError(f"UNIQUE constraint violation: User {user_id} has already confirmed issue {issue_id}")
        
        conf = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "issue_id": issue_id,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        }
        self.confirmations.append(conf)
        
        # Award Idempotent Confirmation Event Points (10 pts)
        idempotency_key = f"CONFIRM:{issue_id}:{user_id}"
        self.award_contribution_points(
            idempotency_key=idempotency_key,
            university_id=university_id,
            user_id=user_id,
            event_type="COMMUNITY_CONFIRMATION",
            points_awarded=10,
            issue_id=issue_id
        )

        return conf

    def award_contribution_points(
        self,
        idempotency_key: str,
        university_id: str,
        user_id: str,
        event_type: str,
        points_awarded: int,
        issue_id: Optional[str] = None
    ) -> Tuple[dict, bool]:
        """
        Idempotent contribution event reward allocation.
        A VERIFIED_REPORT or COMMUNITY_CONFIRMATION event will NEVER award points twice on retries!
        """
        if idempotency_key in self.contribution_events:
            # Idempotent match: Return existing event without adding points again
            return self.contribution_events[idempotency_key], False

        event_obj = {
            "id": str(uuid.uuid4()),
            "idempotency_key": idempotency_key,
            "university_id": university_id,
            "user_id": user_id,
            "event_type": event_type,
            "points_awarded": points_awarded,
            "issue_id": issue_id,
            "created_at": datetime.utcnow().isoformat()
        }
        self.contribution_events[idempotency_key] = event_obj

        # Add points to student profile
        if user_id in self.student_profiles:
            self.student_profiles[user_id]["points"] += points_awarded

        return event_obj, True

    def record_status_transition(self, university_id: str, issue_id: str, changed_by_user_id: str, previous_status: str, new_status: str, reason: Optional[str] = None):
        """Records an immutable status history transition."""
        trans = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "issue_id": issue_id,
            "changed_by_user_id": changed_by_user_id,
            "previous_status": previous_status,
            "new_status": new_status,
            "reason": reason or "",
            "created_at": datetime.utcnow().isoformat()
        }
        self.status_history.append(trans)
        return trans

    # --- AI Triage Store Methods ---

    def save_ai_analysis(self, university_id: str, issue_id: str, analysis_data: dict) -> dict:
        """Saves or updates an AI triage analysis record for an issue."""
        analysis_id = str(uuid.uuid4())
        record = {
            "id": analysis_id,
            "university_id": university_id,
            "issue_id": issue_id,
            "recommended_category": analysis_data.get("recommended_category", "OTHER"),
            "recommended_priority": analysis_data.get("recommended_priority", "MEDIUM"),
            "confidence_score": float(analysis_data.get("confidence_score", 0.5)),
            "sdg_mapping": analysis_data.get("sdg_mapping", "SDG 11: Sustainable Cities and Communities"),
            "reasoning": analysis_data.get("reasoning", ""),
            "suggested_action": analysis_data.get("suggested_action", ""),
            "prompt_version": analysis_data.get("prompt_version", "v1.0.0"),
            "primary_model": analysis_data.get("primary_model", "gemini-2.5-flash"),
            "model_used": analysis_data.get("model_used", "gemini-2.5-flash"),
            "fallback_used": analysis_data.get("fallback_used", False),
            "retry_count": analysis_data.get("retry_count", 0),
            "failure_reason": analysis_data.get("failure_reason"),
            "is_fallback": analysis_data.get("is_fallback", False),
            "raw_response": analysis_data.get("raw_response"),
            "created_at": datetime.utcnow().isoformat()
        }
        self.ai_analysis[issue_id] = record

        # Update issue's ai_priority and status to AI_ANALYZED if in issues dict
        if issue_id in self.issues:
            self.issues[issue_id]["ai_priority"] = record["recommended_priority"]
            if self.issues[issue_id].get("status") == "SUBMITTED":
                prev_status = self.issues[issue_id]["status"]
                self.issues[issue_id]["status"] = "AI_ANALYZED"
                self.record_status_transition(
                    university_id=university_id,
                    issue_id=issue_id,
                    changed_by_user_id="SYSTEM_AI",
                    previous_status=prev_status,
                    new_status="AI_ANALYZED",
                    reason=f"AI Triage completed by model {record['model_used']}"
                )

        return record

    def get_ai_analysis_by_issue_id(self, university_id: str, issue_id: str) -> Optional[dict]:
        """Retrieves AI analysis for an issue, enforcing tenant isolation."""
        record = self.ai_analysis.get(issue_id)
        if record and record.get("university_id") == university_id:
            return record
        return None

    def override_admin_priority(self, university_id: str, issue_id: str, admin_user_id: str, final_priority: str, category: Optional[str] = None, notes: Optional[str] = None) -> dict:
        """Allows an admin to override final priority and category on an issue."""
        if issue_id not in self.issues:
            raise KeyError("Issue not found")

        issue = self.issues[issue_id]
        if issue.get("university_id") != university_id:
            raise PermissionError("Cross-tenant access denied")

        issue["final_admin_priority"] = final_priority
        if category:
            issue["category"] = category

        # Record admin action audit log
        action_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": admin_user_id,
            "action_type": "OVERRIDE_AI_TRIAGE",
            "target_entity": "issues",
            "target_id": issue_id,
            "payload": f"final_admin_priority={final_priority}, category={category or issue.get('category')}, notes={notes or ''}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(action_rec)
        return issue

    # --- M9 Admin Portal Store Methods ---

    def get_admin_dashboard_stats(self, university_id: str) -> dict:
        """Returns operational summary metrics for active university tenant."""
        univ_issues = [i for i in self.issues.values() if i.get("university_id") == university_id]
        
        total_submitted = len(univ_issues)
        pending_triage = len([i for i in univ_issues if i.get("status") in ["SUBMITTED", "AI_ANALYZED"]])
        critical_high_count = len([i for i in univ_issues if (i.get("final_admin_priority") or i.get("ai_priority") or i.get("student_priority")) in ["CRITICAL", "HIGH"]])
        assigned_in_progress = len([i for i in univ_issues if i.get("status") in ["ASSIGNED", "IN_PROGRESS"]])
        resolved_count = len([i for i in univ_issues if i.get("status") in ["RESOLVED", "CLOSED"]])

        # Department Workload Summary
        dept_counts: Dict[str, int] = {}
        for i in univ_issues:
            dept = i.get("department_id") or "Unassigned"
            dept_counts[dept] = dept_counts.get(dept, 0) + 1

        return {
            "total_submitted": total_submitted,
            "pending_triage": pending_triage,
            "critical_high_count": critical_high_count,
            "assigned_in_progress": assigned_in_progress,
            "resolved_count": resolved_count,
            "department_workload": dept_counts
        }

    def update_issue_status(self, university_id: str, issue_id: str, admin_user_id: str, new_status: str, reason: Optional[str] = None) -> dict:
        """Executes operational status transition with tenant isolation, status_history logging, admin_actions logging, and student notification."""
        if issue_id not in self.issues:
            raise KeyError("Issue not found")

        issue = self.issues[issue_id]
        if issue.get("university_id") != university_id:
            raise PermissionError("Cross-tenant access denied")

        prev_status = issue.get("status", "SUBMITTED")
        issue["status"] = new_status
        issue["updated_at"] = datetime.utcnow().isoformat()

        # 1. Record immutable status transition
        self.record_status_transition(
            university_id=university_id,
            issue_id=issue_id,
            changed_by_user_id=admin_user_id,
            previous_status=prev_status,
            new_status=new_status,
            reason=reason
        )

        # 2. Record admin audit log
        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": admin_user_id,
            "action_type": "UPDATE_ISSUE_STATUS",
            "target_entity": "issues",
            "target_id": issue_id,
            "payload": f"prev={prev_status}, new={new_status}, reason={reason or ''}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        # 3. Create student notification
        reporter_id = issue.get("reporter_id")
        if reporter_id:
            self.create_notification(
                university_id=university_id,
                user_id=reporter_id,
                notif_type="REPORT_STATUS_CHANGE",
                title=f"Issue #{issue.get('master_issue_number', '')} Status Updated",
                message=f"Your reported issue status has changed to {new_status}. {reason or ''}".strip(),
                category="SYSTEM",
                entity_type="ISSUE",
                entity_id=issue_id,
                idempotency_key=f"STATUS_CHANGE_{issue_id}_{new_status}"
            )

        return issue

    def assign_issue(self, university_id: str, issue_id: str, admin_user_id: str, assigned_to_user_id: Optional[str] = None, department_id: Optional[str] = None, notes: Optional[str] = None) -> dict:
        """Assigns an issue to a staff member or department."""
        if issue_id not in self.issues:
            raise KeyError("Issue not found")

        issue = self.issues[issue_id]
        if issue.get("university_id") != university_id:
            raise PermissionError("Cross-tenant access denied")

        issue["assignee_id"] = assigned_to_user_id
        issue["department_id"] = department_id
        prev_status = issue.get("status")
        issue["status"] = "ASSIGNED"
        issue["updated_at"] = datetime.utcnow().isoformat()

        # Save assignment record
        asgn_id = str(uuid.uuid4())
        assignment = {
            "id": asgn_id,
            "university_id": university_id,
            "issue_id": issue_id,
            "assigned_to_user_id": assigned_to_user_id,
            "department_id": department_id,
            "assigned_by_user_id": admin_user_id,
            "notes": notes,
            "created_at": datetime.utcnow().isoformat()
        }
        self.assignments[asgn_id] = assignment

        # Status transition
        self.record_status_transition(
            university_id=university_id,
            issue_id=issue_id,
            changed_by_user_id=admin_user_id,
            previous_status=prev_status,
            new_status="ASSIGNED",
            reason=f"Assigned to dept {department_id or 'General'}. {notes or ''}".strip()
        )

        # Audit log
        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": admin_user_id,
            "action_type": "ASSIGN_ISSUE",
            "target_entity": "issues",
            "target_id": issue_id,
            "payload": f"assignee={assigned_to_user_id}, department={department_id}, notes={notes or ''}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return issue

    def get_admin_audit_logs(self, university_id: str) -> List[dict]:
        """Returns administrative audit logs for active university tenant."""
        return [a for a in self.admin_actions if a.get("university_id") == university_id]

    def get_admin_map_issues(self, university_id: str) -> List[dict]:
        """Returns geospatial pin data for campus map view scoped by tenant."""
        univ_issues = [i for i in self.issues.values() if i.get("university_id") == university_id]
        pins = []
        for i in univ_issues:
            loc = self.locations.get(i.get("location_id")) if i.get("location_id") else None
            pins.append({
                "id": i["id"],
                "master_issue_number": i.get("master_issue_number"),
                "title": i["title"],
                "category": i["category"],
                "status": i["status"],
                "student_priority": i.get("student_priority", "MEDIUM"),
                "ai_priority": i.get("ai_priority"),
                "final_admin_priority": i.get("final_admin_priority"),
                "latitude": loc.get("latitude", 37.7749) if loc else 37.7749,
                "longitude": loc.get("longitude", -122.4194) if loc else -122.4194,
                "building_name": loc.get("building_name", "Campus Grounds") if loc else "Campus Grounds"
            })
        return pins

    # --- M10 University Owner Store Methods ---

    def get_owner_dashboard_stats(self, university_id: str) -> dict:
        """Returns executive KPI statistics for university owner."""
        students = [m for m in self.memberships.values() if m.university_id == university_id and m.role == UserRole.STUDENT]
        admins = [m for m in self.memberships.values() if m.university_id == university_id and m.role == UserRole.ADMIN]
        issues = [i for i in self.issues.values() if i.get("university_id") == university_id]
        
        total_reports = len(issues)
        resolved_count = len([i for i in issues if i.get("status") in ["RESOLVED", "CLOSED"]])
        resolution_rate = round((resolved_count / total_reports * 100), 1) if total_reports > 0 else 100.0

        # Calculate total sustainability points awarded in university
        total_points = sum([e.get("points_awarded", 0) for e in self.contribution_events.values() if e.get("university_id") == university_id])

        return {
          "total_students": len(students),
          "active_admins": len([a for a in admins if a.status == MembershipStatus.ACTIVE]),
          "total_reports": total_reports,
          "resolved_count": resolved_count,
          "resolution_rate_pct": resolution_rate,
          "total_points_awarded": total_points
        }

    def update_university_profile(self, university_id: str, owner_user_id: str, name: Optional[str] = None, official_website: Optional[str] = None, logo_url: Optional[str] = None, primary_color: Optional[str] = None, contact_email: Optional[str] = None) -> dict:
        """Updates university profile settings and logs audit record."""
        if university_id not in self.universities:
            raise KeyError("University not found")

        univ = self.universities[university_id]
        old_data = f"name={univ.name}, website={univ.official_website}"
        
        if name: univ.name = name
        if official_website: univ.official_website = official_website

        # Log audit action
        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": owner_user_id,
            "action_type": "UPDATE_UNIVERSITY_PROFILE",
            "target_entity": "universities",
            "target_id": university_id,
            "payload": f"old: [{old_data}] -> new: [name={univ.name}, website={univ.official_website}, logo={logo_url or ''}]",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return {
            "id": univ.id,
            "name": univ.name,
            "official_website": univ.official_website,
            "logo_url": logo_url or "",
            "primary_color": primary_color or "#059669",
            "contact_email": contact_email or ""
        }

    def list_departments(self, university_id: str) -> List[dict]:
        """Lists departments for a university."""
        return [d for d in self.departments.values() if d.get("university_id") == university_id]

    def create_department(self, university_id: str, owner_user_id: str, name: str, code: str, description: Optional[str] = None) -> dict:
        """Creates a department for a university and logs audit entry."""
        dept_id = str(uuid.uuid4())
        dept = {
            "id": dept_id,
            "university_id": university_id,
            "name": name,
            "code": code.upper().strip(),
            "description": description or "",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat()
        }
        self.departments[dept_id] = dept

        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": owner_user_id,
            "action_type": "CREATE_DEPARTMENT",
            "target_entity": "university_departments",
            "target_id": dept_id,
            "payload": f"name={name}, code={code}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return dept

    def list_university_admins(self, university_id: str) -> List[dict]:
        """Lists campus admin users for active university."""
        admins = []
        for m in self.memberships.values():
            if m.university_id == university_id and m.role == UserRole.ADMIN:
                user = self.users.get(m.user_id)
                if user:
                    admins.append({
                        "membership_id": m.id,
                        "user_id": user["id"],
                        "email": user["email"],
                        "full_name": user["full_name"],
                        "department": m.department,
                        "status": m.status,
                        "created_at": m.created_at
                    })
        return admins

    def invite_admin_by_owner(self, university_id: str, owner_user_id: str, official_email: str, full_name: str, department: Optional[str] = None) -> dict:
        """Invites a campus admin and creates invitation token."""
        token = f"admin-invite-{uuid.uuid4().hex[:12]}"
        invite = AdminInvitation(
            token=token,
            email=official_email.lower().strip(),
            university_id=university_id,
            role=UserRole.ADMIN,
            department=department,
            used=False,
            created_at=datetime.utcnow().isoformat()
        )
        self.admin_invites[token] = invite

        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": owner_user_id,
            "action_type": "INVITE_CAMPUS_ADMIN",
            "target_entity": "admin_invitations",
            "target_id": token,
            "payload": f"email={official_email}, department={department or ''}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return {"invite_token": token, "email": official_email, "department": department}

    def update_membership_status_by_owner(self, university_id: str, target_user_id: str, owner_user_id: str, new_status: str) -> dict:
        """
        Updates membership status (ACTIVE or SUSPENDED) for an admin or student in owner's university.
        Enforces cross-university rejection.
        """
        mem = self.get_user_tenant_membership(target_user_id, university_id)
        if not mem:
            raise PermissionError("Target user does not belong to owner's university tenant")

        if mem.user_id == owner_user_id:
            raise ValueError("Owner cannot suspend their own membership")

        old_status = mem.status
        mem.status = MembershipStatus(new_status)

        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": owner_user_id,
            "action_type": "UPDATE_MEMBERSHIP_STATUS",
            "target_entity": "university_memberships",
            "target_id": mem.id,
            "payload": f"target_user_id={target_user_id}, role={mem.role}, old_status={old_status}, new_status={new_status}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return {"user_id": target_user_id, "status": mem.status, "role": mem.role}

    def list_university_students(self, university_id: str) -> List[dict]:
        """Lists students belonging to active university tenant."""
        students = []
        for m in self.memberships.values():
            if m.university_id == university_id and m.role == UserRole.STUDENT:
                user = self.users.get(m.user_id)
                prof = self.student_profiles.get(m.user_id, {})
                if user:
                    students.append({
                        "user_id": user["id"],
                        "email": user["email"],
                        "full_name": user["full_name"],
                        "student_id": prof.get("student_id", m.student_id or "N/A"),
                        "department": prof.get("department", m.department or "General"),
                        "points": prof.get("points", 0),
                        "status": m.status,
                        "created_at": m.created_at
                    })
        return students

    def get_gamification_config(self, university_id: str) -> dict:
        """Returns gamification configuration for active university."""
        default_config = {
            "report_points": 50,
            "confirmation_points": 10,
            "resolution_points": 100
        }
        return self.gamification_configs.get(university_id, default_config)

    def update_gamification_config(self, university_id: str, owner_user_id: str, report_points: int, confirmation_points: int, resolution_points: int) -> dict:
        """
        Updates future gamification configuration rules.
        Validates server-side bounds (report 1-1000, confirmation 1-500, resolution 1-2000).
        NEVER modifies historical contribution events or existing student points!
        Audits old and new configuration values in admin_actions.
        """
        # Server-side bounds validation
        if not (1 <= report_points <= 1000):
            raise ValueError("report_points must be between 1 and 1000")
        if not (1 <= confirmation_points <= 500):
            raise ValueError("confirmation_points must be between 1 and 500")
        if not (1 <= resolution_points <= 2000):
            raise ValueError("resolution_points must be between 1 and 2000")

        old_config = self.get_gamification_config(university_id)
        new_config = {
            "report_points": report_points,
            "confirmation_points": confirmation_points,
            "resolution_points": resolution_points
        }
        self.gamification_configs[university_id] = new_config

        # Record audit log with old and new values
        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": owner_user_id,
            "action_type": "UPDATE_GAMIFICATION_CONFIG",
            "target_entity": "gamification_config",
            "target_id": university_id,
            "payload": f"old={old_config} -> new={new_config}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return new_config

    def broadcast_university_notification(self, university_id: str, owner_user_id: str, title: str, message: str) -> dict:
        """Broadcasts a notification to all students and staff in active university."""
        members = [m for m in self.memberships.values() if m.university_id == university_id and m.status == MembershipStatus.ACTIVE]
        created_count = 0
        for m in members:
            notif = {
                "id": str(uuid.uuid4()),
                "university_id": university_id,
                "user_id": m.user_id,
                "type": "CAMPUS_ANNOUNCEMENT",
                "title": title,
                "message": message,
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }
            self.notifications.append(notif)
            created_count += 1

        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": owner_user_id,
            "action_type": "BROADCAST_NOTIFICATION",
            "target_entity": "notifications",
            "target_id": university_id,
            "payload": f"title={title}, recipient_count={created_count}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return {"title": title, "recipients_notified": created_count}

    # --- M11 Super Admin Platform Store Methods ---

    def get_platform_dashboard_stats(self) -> dict:
        """Returns global platform KPI statistics for Super Admin."""
        total_univs = len(self.universities)
        active_univs = len([u for u in self.universities.values() if u.is_active])
        pending_requests = len([r for r in self.requests.values() if r.status == RequestStatus.PENDING])
        total_reports = len(self.issues)
        security_alerts_count = len(self.security_events)

        return {
            "total_universities": total_univs,
            "active_universities": active_univs,
            "pending_requests": pending_requests,
            "total_reports": total_reports,
            "security_alerts_count": security_alerts_count,
            "system_status": "OPERATIONAL"
        }

    def list_platform_universities(self) -> List[dict]:
        """Returns global directory of all registered universities with status and metrics."""
        result = []
        for univ_id, univ in self.universities.items():
            univ_issues = [i for i in self.issues.values() if i.get("university_id") == univ_id]
            owner_mem = next((m for m in self.memberships.values() if m.university_id == univ_id and m.role == UserRole.UNIVERSITY_OWNER), None)
            owner_user = self.users.get(owner_mem.user_id) if owner_mem else None

            result.append({
                "id": univ.id,
                "name": univ.name,
                "official_website": univ.official_website,
                "email_domain": univ.email_domain,
                "country": univ.country,
                "is_active": univ.is_active,
                "total_reports": len(univ_issues),
                "owner_email": owner_user["email"] if owner_user else "N/A",
                "created_at": univ.created_at
            })
        return result

    def update_university_tenant_status(self, university_id: str, super_admin_id: str, is_active: bool) -> dict:
        """
        Suspends or reactivates an entire university tenant (`is_active`).
        Setting is_active = False immediately revokes protected API access for ALL users in tenant.
        Audits action in admin_actions.
        """
        if university_id not in self.universities:
            raise KeyError("University not found")

        univ = self.universities[university_id]
        old_status = univ.is_active
        univ.is_active = is_active

        # Record immutable Super Admin audit log
        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": super_admin_id,
            "action_type": "SUPER_ADMIN_TOGGLE_TENANT_STATUS",
            "target_entity": "universities",
            "target_id": university_id,
            "payload": f"university={univ.name}, old_is_active={old_status}, new_is_active={is_active}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return {"university_id": university_id, "name": univ.name, "is_active": univ.is_active}

    def reissue_owner_token(self, university_id: str, super_admin_id: str) -> dict:
        """Reissues an owner activation token for a university and logs audit record."""
        if university_id not in self.universities:
            raise KeyError("University not found")

        univ = self.universities[university_id]
        new_token = f"reissued-owner-{uuid.uuid4().hex[:12]}"
        
        token_obj = OwnerActivationToken(
            token=new_token,
            university_id=university_id,
            email=f"owner@{univ.email_domain}",
            used=False,
            created_at=datetime.utcnow().isoformat()
        )
        self.owner_tokens[new_token] = token_obj

        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "admin_user_id": super_admin_id,
            "action_type": "SUPER_ADMIN_REISSUE_OWNER_TOKEN",
            "target_entity": "owner_tokens",
            "target_id": new_token,
            "payload": f"reissued token for {univ.name}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return {"university_id": university_id, "owner_activation_token": new_token}

    def get_platform_aggregated_analytics(self) -> dict:
        """
        Returns aggregated, non-PII platform sustainability metrics across all campuses.
        STRICTLY ENFORCED: Zero student names, emails, student IDs, personal locations, or individual report text!
        """
        category_counts: Dict[str, int] = {}
        priority_counts: Dict[str, int] = {}
        total_reports = len(self.issues)
        total_resolved = 0

        for i in self.issues.values():
            cat = i.get("category", "OTHER")
            category_counts[cat] = category_counts.get(cat, 0) + 1

            prio = i.get("final_admin_priority") or i.get("ai_priority") or i.get("student_priority", "MEDIUM")
            priority_counts[prio] = priority_counts.get(prio, 0) + 1

            if i.get("status") in ["RESOLVED", "CLOSED"]:
                total_resolved += 1

        total_points = sum([e.get("points_awarded", 0) for e in self.contribution_events.values()])

        return {
            "total_reports_platform_wide": total_reports,
            "total_resolved_platform_wide": total_resolved,
            "global_resolution_rate_pct": round((total_resolved / total_reports * 100), 1) if total_reports > 0 else 100.0,
            "total_sustainability_points": total_points,
            "category_distribution": category_counts,
            "priority_distribution": priority_counts
        }

    def get_platform_audit_logs(self) -> List[dict]:
        """Returns platform-wide audit log history for Super Admin."""
        return list(self.admin_actions)

    def get_platform_security_events(self) -> List[dict]:
        """Returns security monitoring events feed."""
        return list(self.security_events)

    def record_security_event(self, event_type: str, user_id: Optional[str] = None, university_id: Optional[str] = None, payload: str = ""):
        """Records a platform security event (rate limit breach, failed login, cross-tenant attempt)."""
        ev = {
            "id": str(uuid.uuid4()),
            "university_id": university_id,
            "user_id": user_id,
            "event_type": event_type,
            "payload": payload,
            "created_at": datetime.utcnow().isoformat()
        }
        self.security_events.append(ev)
        return ev

    # --- M12 Notification & Communication Store Methods ---

    def get_user_notification_preferences(self, user_id: str) -> dict:
        """Returns notification preferences for a user, or defaults."""
        if user_id in self.notification_preferences:
            return self.notification_preferences[user_id]
        
        defaults = {
            "user_id": user_id,
            "email_reports": True,
            "email_verifications": True,
            "email_rewards": True,
            "email_announcements": True,
            "inapp_enabled": True
        }
        self.notification_preferences[user_id] = defaults
        return defaults

    def update_user_notification_preferences(self, user_id: str, payload_dict: dict) -> dict:
        """Updates user notification preferences."""
        prefs = self.get_user_notification_preferences(user_id)
        for key, val in payload_dict.items():
            if val is not None and key in prefs:
                prefs[key] = val
        return prefs

    def create_notification(
        self,
        university_id: str,
        user_id: str,
        notif_type: str,
        title: str,
        message: str,
        category: str = "SYSTEM",
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Optional[dict]:
        """
        Creates an in-app and email notification with strict idempotency, rate limiting, and preference evaluation.
        """
        # 1. Idempotency Check
        if idempotency_key:
            existing = next((n for n in self.notifications if n.get("idempotency_key") == idempotency_key), None)
            if existing:
                return existing

        # 2. University Tenant Active Check
        univ = self.universities.get(university_id)
        if univ and not univ.is_active:
            return None

        # 3. User Membership Active Check
        membership = self.get_user_tenant_membership(user_id, university_id)
        if membership and membership.status != MembershipStatus.ACTIVE:
            return None

        # 4. Rate Limiting Check
        if rate_limiter.is_rate_limited(user_id):
            self.record_security_event("NOTIFICATION_RATE_LIMITED", user_id=user_id, university_id=university_id, payload=f"Rate limit exceeded for notification type {notif_type}")
            delivery_status = "RATE_LIMITED"
        else:
            delivery_status = "DELIVERED"

        # 5. User Preferences Evaluation
        prefs = self.get_user_notification_preferences(user_id)
        if not prefs.get("inapp_enabled", True):
            delivery_status = "SUPPRESSED"

        email_sent = False
        # Email channel dispatch based on category preference
        email_allowed = (
            (category in ["SYSTEM", "ADMIN"] and prefs.get("email_reports", True)) or
            (category == "COMMUNITY" and prefs.get("email_verifications", True)) or
            (category == "REWARD" and prefs.get("email_rewards", True)) or
            (category == "BROADCAST" and prefs.get("email_announcements", True))
        )

        user = self.users.get(user_id)
        if email_allowed and user and user.get("email"):
            email_sent = email_provider.send_email(
                to_email=user["email"],
                subject=title,
                body_text=message,
                metadata={"notification_type": notif_type, "entity_type": entity_type, "entity_id": entity_id}
            )

        notif_id = str(uuid.uuid4())
        notif = {
            "id": notif_id,
            "university_id": university_id,
            "user_id": user_id,
            "type": notif_type,
            "category": category,
            "title": title,
            "message": message,
            "is_read": False,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "delivery_status": delivery_status,
            "email_sent": email_sent,
            "idempotency_key": idempotency_key,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        }

        self.notifications.append(notif)
        return notif

    def get_user_notifications(
        self,
        user_id: str,
        university_id: str,
        unread_only: bool = False,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """Returns user notifications filtered by active tenant, category, unread state with pagination."""
        user_notes = [
            n for n in self.notifications
            if n.get("user_id") == user_id and n.get("university_id") == university_id
        ]

        unread_count = len([n for n in user_notes if not n.get("is_read")])

        if unread_only:
            user_notes = [n for n in user_notes if not n.get("is_read")]

        if category:
            user_notes = [n for n in user_notes if n.get("category") == category]

        # Sort descending by creation date
        user_notes.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        paginated = user_notes[offset:offset + limit]
        return {
            "notifications": paginated,
            "unread_count": unread_count
        }

    def mark_notification_read(self, notification_id: str, user_id: str) -> dict:
        """Marks a notification as read with strict user ownership enforcement."""
        notif = next((n for n in self.notifications if n.get("id") == notification_id), None)
        if not notif:
            raise KeyError("Notification not found")
        if notif.get("user_id") != user_id:
            raise PermissionError("Cross-user notification access denied")

        notif["is_read"] = True
        return notif

    def mark_all_notifications_read(self, user_id: str, university_id: str) -> dict:
        """Marks all notifications for user in active university as read."""
        count = 0
        for n in self.notifications:
            if n.get("user_id") == user_id and n.get("university_id") == university_id:
                if not n.get("is_read"):
                    n["is_read"] = True
                    count += 1
        return {"updated_count": count}

    def dispatch_super_admin_announcement(self, super_admin_id: str, title: str, message: str, target_university_ids: Optional[List[str]] = None) -> dict:
        """
        Dispatches platform-wide system announcement from Super Admin across universities.
        Audits action in admin_actions.
        """
        if target_university_ids:
            target_univs = [u for u in self.universities.values() if u.id in target_university_ids and u.is_active]
        else:
            target_univs = [u for u in self.universities.values() if u.is_active]

        dispatched_count = 0
        for univ in target_univs:
            members = [m for m in self.memberships.values() if m.university_id == univ.id and m.status == MembershipStatus.ACTIVE]
            for m in members:
                self.create_notification(
                    university_id=univ.id,
                    user_id=m.user_id,
                    notif_type="SUPER_ADMIN_ANNOUNCEMENT",
                    title=f"[Platform Announcement] {title}",
                    message=message,
                    category="BROADCAST",
                    idempotency_key=f"SA_ANNOUNCEMENT_{super_admin_id}_{univ.id}_{m.user_id}_{hash(title)}"
                )
                dispatched_count += 1

        audit_rec = {
            "id": str(uuid.uuid4()),
            "university_id": target_univs[0].id if target_univs else str(uuid.uuid4()),
            "admin_user_id": super_admin_id,
            "action_type": "SUPER_ADMIN_PLATFORM_ANNOUNCEMENT",
            "target_entity": "notifications",
            "target_id": super_admin_id,
            "payload": f"title={title}, target_universities={len(target_univs)}, recipients={dispatched_count}",
            "created_at": datetime.utcnow().isoformat()
        }
        self.admin_actions.append(audit_rec)

        return {"title": title, "universities_targeted": len(target_univs), "recipients_notified": dispatched_count}

    # --- M13 Analytics & Impact Store Methods ---

    def get_student_impact_analytics(self, user_id: str, university_id: str) -> dict:
        """
        Calculates personal student sustainability impact metrics.
        CRITICAL: Strictly zero fabricated environmental metrics! Only empirical verified counts.
        """
        # User reports in active university
        user_reports = [
            r for r in self.reports.values()
            if r.get("student_id") == user_id and r.get("university_id") == university_id
        ]

        verified_reports_count = len(user_reports)

        # Count resolved parent issues
        resolved_issues_count = 0
        sdg_counts: Dict[str, int] = {}
        monthly_trends: Dict[str, int] = {}

        for r in user_reports:
            cat = r.get("category", "OTHER")
            sdg = SDG_CATEGORY_MAPPING.get(cat, "SDG 11: Sustainable Cities & Communities")
            sdg_counts[sdg] = sdg_counts.get(sdg, 0) + 1

            created_ts = r.get("created_at", "")
            month_key = created_ts[:7] if len(created_ts) >= 7 else "Recent"
            monthly_trends[month_key] = monthly_trends.get(month_key, 0) + 1

            issue_id = r.get("issue_id")
            if issue_id and issue_id in self.issues:
                issue = self.issues[issue_id]
                if issue.get("status") in ["RESOLVED", "CLOSED"]:
                    resolved_issues_count += 1

        # Community confirmations submitted by student
        user_confirmations = [
            c for c in self.confirmations
            if c.get("user_id") == user_id and c.get("university_id") == university_id
        ]
        community_confirmations_count = len(user_confirmations)

        # Points earned & Badges earned
        user_events = [
            e for e in self.contribution_events.values()
            if e.get("user_id") == user_id and e.get("university_id") == university_id
        ]
        points_earned = sum([e.get("points_awarded", 0) for e in user_events])

        badges_earned_count = len([
            ub for ub in self.user_badges
            if ub.get("user_id") == user_id and ub.get("university_id") == university_id
        ])

        # Impact timeline (verified events only)
        timeline = []
        for e in sorted(user_events, key=lambda x: x.get("created_at", ""), reverse=True)[:15]:
            timeline.append({
                "id": e.get("id", str(uuid.uuid4())),
                "event_type": e.get("event_type", "CONTRIBUTION"),
                "title": f"{e.get('event_type', '').replace('_', ' ').title()} (+{e.get('points_awarded', 0)} pts)",
                "points": e.get("points_awarded", 0),
                "timestamp": e.get("created_at", "")
            })

        return {
            "user_id": user_id,
            "university_id": university_id,
            "verified_reports_count": verified_reports_count,
            "resolved_issues_count": resolved_issues_count,
            "community_confirmations_count": community_confirmations_count,
            "points_earned": points_earned,
            "badges_earned_count": badges_earned_count,
            "sdg_contributions": sdg_counts,
            "monthly_trends": monthly_trends,
            "timeline": timeline
        }

    def get_university_analytics(
        self,
        university_id: str,
        role: str = "ADMIN",
        user_id: str = "",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        department_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> dict:
        """
        Calculates executive university analytics with multi-filter controls, SLA metrics, department workload, and 60s TTL caching.
        Cache keys explicitly include authorized scope (tenant_id, user_id, role) to prevent cross-tenant cache leakage!
        """
        filter_params = {
            "start_date": start_date,
            "end_date": end_date,
            "category": category,
            "priority": priority,
            "department_id": department_id,
            "status": status
        }

        # Generate scoped cache key
        cache_key = analytics_cache.generate_cache_key(
            tenant_id=university_id,
            user_id=user_id,
            role=role,
            filter_params=filter_params
        )

        cached_result = analytics_cache.get(cache_key)
        if cached_result is not None:
            return cached_result

        # Fetch and filter university issues
        univ_issues = [
            i for i in self.issues.values()
            if i.get("university_id") == university_id
        ]

        if start_date:
            univ_issues = [i for i in univ_issues if i.get("created_at", "") >= start_date]
        if end_date:
            univ_issues = [i for i in univ_issues if i.get("created_at", "") <= end_date]
        if category:
            univ_issues = [i for i in univ_issues if i.get("category") == category]
        if priority:
            univ_issues = [
                i for i in univ_issues
                if (i.get("final_admin_priority") or i.get("ai_priority") or i.get("student_priority")) == priority
            ]
        if department_id:
            univ_issues = [i for i in univ_issues if i.get("department_id") == department_id]
        if status:
            univ_issues = [i for i in univ_issues if i.get("status") == status]

        total_reports = len(univ_issues)
        verified_issues = len([i for i in univ_issues if i.get("status") != "SUBMITTED"])
        resolved_issues = len([i for i in univ_issues if i.get("status") in ["RESOLVED", "CLOSED"]])
        open_in_progress_issues = len([i for i in univ_issues if i.get("status") in ["SUBMITTED", "IN_PROGRESS", "ASSIGNED"]])
        resolution_rate_pct = round((resolved_issues / total_reports * 100), 1) if total_reports > 0 else 100.0

        # Calculate average resolution time in hours and SLA performance (target 48 hours)
        resolution_durations_hours: List[float] = []
        resolved_within_sla_count = 0

        for i in univ_issues:
            if i.get("status") in ["RESOLVED", "CLOSED"]:
                created_dt = datetime.fromisoformat(i.get("created_at", datetime.utcnow().isoformat()))
                updated_dt = datetime.fromisoformat(i.get("updated_at", datetime.utcnow().isoformat()))
                duration_hours = max(0.1, (updated_dt - created_dt).total_seconds() / 3600.0)
                resolution_durations_hours.append(duration_hours)
                if duration_hours <= 48.0:
                    resolved_within_sla_count += 1

        avg_resolution_time_hours = round(
            sum(resolution_durations_hours) / len(resolution_durations_hours), 1
        ) if resolution_durations_hours else 0.0

        sla_compliance_pct = round(
            (resolved_within_sla_count / len(resolution_durations_hours) * 100), 1
        ) if resolution_durations_hours else 100.0

        # Distribution breakdowns
        cat_counts: Dict[str, int] = {}
        prio_counts: Dict[str, int] = {}
        sdg_counts: Dict[str, int] = {}
        monthly_trends: Dict[str, int] = {}

        for i in univ_issues:
            cat = i.get("category", "OTHER")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

            prio = i.get("final_admin_priority") or i.get("ai_priority") or i.get("student_priority", "MEDIUM")
            prio_counts[prio] = prio_counts.get(prio, 0) + 1

            sdg = SDG_CATEGORY_MAPPING.get(cat, "SDG 11: Sustainable Cities & Communities")
            sdg_counts[sdg] = sdg_counts.get(sdg, 0) + 1

            month_key = i.get("created_at", "")[:7] or "Recent"
            monthly_trends[month_key] = monthly_trends.get(month_key, 0) + 1

        # Department Workload
        dept_workload_map: Dict[str, Dict[str, Any]] = {}
        for d_id, d in self.departments.items():
            if d.get("university_id") == university_id:
                dept_workload_map[d_id] = {
                    "department_id": d_id,
                    "department_name": d.get("name", "Department"),
                    "total_assigned": 0,
                    "in_progress": 0,
                    "resolved": 0
                }

        for i in univ_issues:
            d_id = i.get("department_id")
            if d_id and d_id in dept_workload_map:
                entry = dept_workload_map[d_id]
                entry["total_assigned"] += 1
                if i.get("status") in ["IN_PROGRESS", "ASSIGNED"]:
                    entry["in_progress"] += 1
                elif i.get("status") in ["RESOLVED", "CLOSED"]:
                    entry["resolved"] += 1

        # Student Engagement Metrics
        active_reporters = len(set([i.get("reporter_id") for i in univ_issues if i.get("reporter_id")]))
        confirming_students = len(set([c.get("user_id") for c in self.confirmations if c.get("university_id") == university_id]))

        univ_obj = self.universities.get(university_id)

        result = {
            "university_id": university_id,
            "university_name": univ_obj.name if univ_obj else "University",
            "total_reports": total_reports,
            "verified_issues": verified_issues,
            "resolved_issues": resolved_issues,
            "open_in_progress_issues": open_in_progress_issues,
            "resolution_rate_pct": resolution_rate_pct,
            "avg_resolution_time_hours": avg_resolution_time_hours,
            "sla_performance": {
                "total_closed": len(resolution_durations_hours),
                "resolved_within_sla_count": resolved_within_sla_count,
                "sla_compliance_pct": sla_compliance_pct,
                "avg_resolution_time_hours": avg_resolution_time_hours
            },
            "category_distribution": cat_counts,
            "priority_distribution": prio_counts,
            "department_workload": list(dept_workload_map.values()),
            "monthly_trends": monthly_trends,
            "sdg_mapping": sdg_counts,
            "student_engagement": {
                "active_reporters": active_reporters,
                "confirming_students": confirming_students,
                "total_contribution_events": len([e for e in self.contribution_events.values() if e.get("university_id") == university_id])
            }
        }

        # Cache calculation result
        analytics_cache.set(cache_key, result)
        return result

    def export_university_analytics_csv(
        self,
        university_id: str,
        role: str = "ADMIN",
        user_id: str = "",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        department_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> str:
        """Exports university analytics summary into a downloadable CSV string."""
        data = self.get_university_analytics(
            university_id=university_id,
            role=role,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            category=category,
            priority=priority,
            department_id=department_id,
            status=status
        )

        lines = [
            "CampusFix AI - Executive University Analytics Export",
            f"University Name, {data['university_name']}",
            f"Export Generated At, {datetime.utcnow().isoformat()}",
            "",
            "Metric, Value",
            f"Total Reports Processed, {data['total_reports']}",
            f"Verified Issues, {data['verified_issues']}",
            f"Resolved Issues, {data['resolved_issues']}",
            f"Open / In-Progress Issues, {data['open_in_progress_issues']}",
            f"Resolution Rate (%), {data['resolution_rate_pct']}%",
            f"Average Resolution Duration (Hours), {data['avg_resolution_time_hours']} hours",
            f"SLA Compliance Rate (%), {data['sla_performance']['sla_compliance_pct']}%",
            "",
            "Category, Total Count"
        ]

        for cat, count in data["category_distribution"].items():
            lines.append(f"{cat}, {count}")

        lines.extend(["", "Priority, Total Count"])
        for prio, count in data["priority_distribution"].items():
            lines.append(f"{prio}, {count}")

        lines.extend(["", "Department, Total Assigned, In Progress, Resolved"])
        for dept in data["department_workload"]:
            lines.append(f"{dept['department_name']}, {dept['total_assigned']}, {dept['in_progress']}, {dept['resolved']}")

        return "\n".join(lines)

db_store = InMemoryStore()





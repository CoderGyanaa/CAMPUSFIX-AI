-- ====================================================================
-- CampusFix AI — Milestone M3 DDL Migration & PostgreSQL RLS Hardening
-- ====================================================================

-- 1. Create Private Security Schema
CREATE SCHEMA IF NOT EXISTS auth_internal;

-- 2. Core Tables required by helper functions

-- Universities
CREATE TABLE IF NOT EXISTS public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    official_website VARCHAR(255) NOT NULL,
    email_domain VARCHAR(100) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- University Memberships
CREATE TABLE IF NOT EXISTS public.university_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN', 'UNIVERSITY_OWNER', 'SUPER_ADMIN')),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_INVITE')),
    department VARCHAR(100),
    student_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_university UNIQUE (user_id, university_id)
);

-- 3. Create Security Definer Helper Function
CREATE OR REPLACE FUNCTION auth_internal.get_active_user_university_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
    SELECT university_id 
    FROM public.university_memberships
    WHERE user_id = p_user_id AND status = 'ACTIVE';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- Restrict EXECUTE privileges
REVOKE ALL ON FUNCTION auth_internal.get_active_user_university_ids(UUID) FROM PUBLIC;

-- Locations
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    building_name VARCHAR(255) NOT NULL,
    floor VARCHAR(50),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues (Master Issues)
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_issue_number SERIAL,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('WASTE', 'WATER', 'ENERGY', 'CLEANLINESS', 'FOOD', 'TRANSPORT', 'INFRASTRUCTURE', 'OTHER')),
    status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'AI_ANALYZED', 'UNDER_REVIEW', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED')),
    student_priority VARCHAR(20) CHECK (student_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    ai_priority VARCHAR(20) CHECK (ai_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    final_admin_priority VARCHAR(20) CHECK (final_admin_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL,
    assignee_id UUID,
    department_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports (Individual Submissions)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    photo_url TEXT NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    student_priority VARCHAR(20) NOT NULL,
    location_id UUID REFERENCES public.locations(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Confirmations (+1 Community Confirmations)
CREATE TABLE IF NOT EXISTS public.confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_issue_user_confirmation UNIQUE (issue_id, user_id)
);

-- Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    assigned_to_user_id UUID,
    department_id UUID,
    assigned_by_user_id UUID NOT NULL,
    due_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status History
CREATE TABLE IF NOT EXISTS public.status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    changed_by_user_id UUID NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Analysis
CREATE TABLE IF NOT EXISTS public.ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    recommended_category VARCHAR(50),
    recommended_priority VARCHAR(20),
    confidence_score DOUBLE PRECISION,
    sdg_mapping VARCHAR(100),
    reasoning TEXT,
    suggested_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contribution Events
CREATE TABLE IF NOT EXISTS public.contribution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('VERIFIED_REPORT', 'HIGH_IMPACT_CONTRIBUTION', 'COMMUNITY_CONFIRMATION', 'RESOLUTION_CONTRIBUTION')),
    points_awarded INTEGER NOT NULL,
    issue_id UUID REFERENCES public.issues(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges & User Badges
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    points_threshold INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Actions
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    target_id UUID NOT NULL,
    payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. High-Performance Indexes for RLS and Tenant Filtering
CREATE INDEX IF NOT EXISTS idx_memberships_user_univ ON public.university_memberships(user_id, university_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.university_memberships(status);
CREATE INDEX IF NOT EXISTS idx_issues_univ_status ON public.issues(university_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_univ_category ON public.issues(university_id, category);
CREATE INDEX IF NOT EXISTS idx_reports_univ_issue ON public.reports(university_id, issue_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_issue_user ON public.confirmations(issue_id, user_id);
CREATE INDEX IF NOT EXISTS idx_locations_univ ON public.locations(university_id);
CREATE INDEX IF NOT EXISTS idx_events_univ_user ON public.contribution_events(university_id, user_id);

-- 5. PostgreSQL Row Level Security (RLS) Policies & Grants

-- Enable RLS on operational entities
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Configure Explicit Grants (Defense-in-depth alongside RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.confirmations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;

-- RLS Policy: Issues
CREATE POLICY rls_issues_tenant_all ON public.issues
    FOR ALL
    USING (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    )
    WITH CHECK (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    );

-- RLS Policy: Reports
CREATE POLICY rls_reports_tenant_all ON public.reports
    FOR ALL
    USING (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    )
    WITH CHECK (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    );

-- RLS Policy: Confirmations
CREATE POLICY rls_confirmations_tenant_all ON public.confirmations
    FOR ALL
    USING (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    )
    WITH CHECK (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    );

-- Migration 006: University Owner Portal Settings & Departments Schema

ALTER TABLE public.universities
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#059669',
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS gamification_config JSONB DEFAULT '{"report_points": 50, "confirmation_points": 10, "resolution_points": 100}';

-- University Departments Table
CREATE TABLE IF NOT EXISTS public.university_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    head_user_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_univ_dept_code UNIQUE (university_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_univ ON public.university_departments(university_id);

-- Enforce PostgreSQL Row Level Security (RLS)
ALTER TABLE public.university_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_departments_tenant_all ON public.university_departments;
CREATE POLICY rls_departments_tenant_all ON public.university_departments
    FOR ALL
    USING (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    )
    WITH CHECK (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.university_departments TO authenticated;

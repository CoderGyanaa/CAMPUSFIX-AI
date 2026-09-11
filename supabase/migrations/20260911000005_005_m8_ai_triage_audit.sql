-- Migration 005: Gemini AI Triage Telemetry & Model Fallback Audit Schema

ALTER TABLE public.ai_analysis
    ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(20) DEFAULT 'v1.0.0',
    ADD COLUMN IF NOT EXISTS primary_model VARCHAR(50) DEFAULT 'gemini-2.5-flash',
    ADD COLUMN IF NOT EXISTS model_used VARCHAR(50) DEFAULT 'gemini-2.5-flash',
    ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS raw_response TEXT;

-- Index for issue triage lookups
CREATE INDEX IF NOT EXISTS idx_ai_analysis_univ_issue ON public.ai_analysis(university_id, issue_id);

-- Enforce PostgreSQL Row Level Security (RLS)
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_ai_analysis_tenant_all ON public.ai_analysis;
CREATE POLICY rls_ai_analysis_tenant_all ON public.ai_analysis
    FOR ALL
    USING (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    )
    WITH CHECK (
        university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis TO authenticated;

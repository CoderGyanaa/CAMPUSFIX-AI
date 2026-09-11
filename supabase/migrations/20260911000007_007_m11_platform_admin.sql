-- Migration 007: Super Admin Platform Audit & Security Monitoring Schema

-- Security Events Table for Platform Threat & Rate Limit Monitoring
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
    user_id UUID,
    event_type VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);

-- Platform Configuration Table
CREATE TABLE IF NOT EXISTS public.platform_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by_user_id UUID NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce PostgreSQL Row Level Security (RLS)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Only Super Admins can query security events and platform config
DROP POLICY IF EXISTS rls_security_events_super_admin ON public.security_events;
CREATE POLICY rls_security_events_super_admin ON public.security_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.university_memberships
            WHERE university_memberships.user_id = auth.uid()
            AND university_memberships.role = 'SUPER_ADMIN'
            AND university_memberships.status = 'ACTIVE'
        )
    );

GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.platform_config TO authenticated;

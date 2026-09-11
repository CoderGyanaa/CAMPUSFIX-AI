-- ====================================================================
-- CampusFix AI — Milestone M7 Idempotency & Transactional Merge DDL
-- ====================================================================

-- 1. Idempotency Key for Contribution Events (Prevents double points on retries)
ALTER TABLE public.contribution_events 
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

ALTER TABLE public.contribution_events
    ADD CONSTRAINT uq_event_idempotency UNIQUE (idempotency_key);

-- 2. Add merged_into_issue_id to Issues table (Preserves source issue history)
ALTER TABLE public.issues 
    ADD COLUMN IF NOT EXISTS merged_into_issue_id UUID REFERENCES public.issues(id);

-- 3. High-Performance Index on merged_into_issue_id
CREATE INDEX IF NOT EXISTS idx_issues_merged_into ON public.issues(merged_into_issue_id);

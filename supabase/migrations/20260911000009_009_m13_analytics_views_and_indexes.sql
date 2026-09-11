-- M12/M13 Migration: Analytics Views, Performance Indexes & RLS Security

-- 1. Performance Indexes for Frequent Analytics Filter Queries
CREATE INDEX IF NOT EXISTS idx_issues_analytics_univ_created ON public.issues(university_id, created_at, status, category);
CREATE INDEX IF NOT EXISTS idx_issues_analytics_dept ON public.issues(university_id, department_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_analytics_user ON public.reports(university_id, student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_status_history_analytics ON public.status_history(university_id, issue_id, created_at);

-- 2. PostgreSQL Analytics Views with EXPLICIT security_invoker = true
-- Ensures view execution strictly enforces the querying user's RLS policies
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'issues'
    ) THEN
        EXECUTE '
        CREATE OR REPLACE VIEW public.view_university_resolution_performance
        WITH (security_invoker = true) AS
        SELECT
            university_id,
            COUNT(*) AS total_issues,
            COUNT(*) FILTER (WHERE status IN (''RESOLVED'', ''CLOSED'')) AS resolved_issues,
            COUNT(*) FILTER (WHERE status = ''SUBMITTED'') AS submitted_issues,
            COUNT(*) FILTER (WHERE status IN (''IN_PROGRESS'', ''ASSIGNED'')) AS in_progress_issues,
            COUNT(*) FILTER (WHERE COALESCE(final_admin_priority, ai_priority, student_priority, ''MEDIUM'') = ''CRITICAL'') AS critical_issues,
            COUNT(*) FILTER (WHERE COALESCE(final_admin_priority, ai_priority, student_priority, ''MEDIUM'') = ''HIGH'') AS high_issues
        FROM public.issues
        GROUP BY university_id;
        ';
    END IF;
END $$;

-- 3. Explicit Grants for Authenticated Users
GRANT SELECT ON public.view_university_resolution_performance TO authenticated;

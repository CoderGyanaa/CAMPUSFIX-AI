-- ====================================================================
-- CampusFix AI — Milestone M4 Student Profiles DDL & RLS Policies
-- ====================================================================

-- 1. Create Student Profiles Table
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    student_id VARCHAR(100),
    department VARCHAR(100),
    year VARCHAR(50) DEFAULT '1st Year',
    section VARCHAR(50) DEFAULT 'A',
    phone VARCHAR(50) DEFAULT '',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    points INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_profile_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_univ_user ON public.student_profiles(university_id, user_id);

-- 2. Enable RLS on student_profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Configure Grants
GRANT SELECT, INSERT, UPDATE ON public.student_profiles TO authenticated;

-- 3. RLS Policy: SELECT (Own profile only)
CREATE POLICY rls_student_profile_select ON public.student_profiles
    FOR SELECT
    USING (user_id = auth.uid());

-- 4. RLS Policy: INSERT (Own user_id + active university_id)
CREATE POLICY rls_student_profile_insert ON public.student_profiles
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() 
        AND university_id IN (SELECT auth_internal.get_active_user_university_ids(auth.uid()))
    );

-- 5. RLS Policy: UPDATE (Own profile only, USING + WITH CHECK, immutable user_id and university_id)
CREATE POLICY rls_student_profile_update ON public.student_profiles
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
    );

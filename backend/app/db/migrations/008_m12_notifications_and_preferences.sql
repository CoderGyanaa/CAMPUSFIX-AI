-- M12 Migration: Notifications, Preferences, Idempotency & RLS Security

-- 1. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY,
    email_reports BOOLEAN DEFAULT true,
    email_verifications BOOLEAN DEFAULT true,
    email_rewards BOOLEAN DEFAULT true,
    email_announcements BOOLEAN DEFAULT true,
    inapp_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Extend Notifications Table with Category, Entity Reference, Delivery Status & Idempotency Key
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'SYSTEM';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'DELIVERED';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add Unique Idempotency Constraint if not existing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_notifications_idempotency_key'
    ) THEN
        ALTER TABLE public.notifications ADD CONSTRAINT uq_notifications_idempotency_key UNIQUE (idempotency_key);
    END IF;
END $$;

-- Indexes for Notification Retrieval
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_category ON public.notifications(user_id, category);

-- 3. Enable RLS & Configure Explicit Grants
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

-- RLS Policies for Notifications
DROP POLICY IF EXISTS rls_notifications_select ON public.notifications;
CREATE POLICY rls_notifications_select ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS rls_notifications_update ON public.notifications;
CREATE POLICY rls_notifications_update ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS rls_notifications_insert ON public.notifications;
CREATE POLICY rls_notifications_insert ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('ADMIN', 'UNIVERSITY_OWNER', 'SUPER_ADMIN'));

-- RLS Policies for Notification Preferences
DROP POLICY IF EXISTS rls_preferences_select ON public.notification_preferences;
CREATE POLICY rls_preferences_select ON public.notification_preferences
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS rls_preferences_insert ON public.notification_preferences;
CREATE POLICY rls_preferences_insert ON public.notification_preferences
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS rls_preferences_update ON public.notification_preferences;
CREATE POLICY rls_preferences_update ON public.notification_preferences
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

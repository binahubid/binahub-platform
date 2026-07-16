-- ========================================================
-- BinaHub AMS — Supabase Setup Batch 4
-- Jalankan skrip SQL ini di Supabase SQL Editor untuk
-- menginisialisasi tabel-tabel baru v0.7.6.
-- ========================================================

-- 1. MIGRATION 002: IMPORT CV DATA RPC
CREATE OR REPLACE FUNCTION import_cv_data(
  p_associate_id UUID,
  p_full_name TEXT,
  p_headline TEXT,
  p_bio TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_skills TEXT[],
  p_experiences JSONB,
  p_educations JSONB
) RETURNS VOID AS $$
DECLARE
  v_exp JSONB;
  v_edu JSONB;
  v_skill TEXT;
BEGIN
  -- Insert/Update profile
  INSERT INTO associate_profiles (associate_id, full_name, headline, bio, phone, created_at, updated_at)
  VALUES (p_associate_id, p_full_name, p_headline, p_bio, p_phone, NOW(), NOW())
  ON CONFLICT (associate_id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      headline = EXCLUDED.headline,
      bio = EXCLUDED.bio,
      phone = EXCLUDED.phone,
      updated_at = NOW();

  -- Update email on associates table
  UPDATE associates SET email = p_email WHERE id = p_associate_id;

  -- Clear existing data for fresh import
  DELETE FROM associate_skills WHERE associate_id = p_associate_id;
  DELETE FROM associate_experiences WHERE associate_id = p_associate_id;
  DELETE FROM associate_educations WHERE associate_id = p_associate_id;

  -- Insert skills
  IF p_skills IS NOT NULL THEN
    FOREACH v_skill IN ARRAY p_skills LOOP
      INSERT INTO associate_skills (associate_id, name, created_at)
      VALUES (p_associate_id, v_skill, NOW());
    END LOOP;
  END IF;

  -- Insert experiences
  IF p_experiences IS NOT NULL THEN
    FOR v_exp IN SELECT * FROM jsonb_array_elements(p_experiences) LOOP
      INSERT INTO associate_experiences (
        associate_id,
        organization,
        role,
        start_date,
        end_date,
        description,
        created_at,
        updated_at
      ) VALUES (
        p_associate_id,
        v_exp->>'organization',
        v_exp->>'role',
        v_exp->>'start_date',
        v_exp->>'end_date',
        v_exp->>'description',
        NOW(),
        NOW()
      );
    END LOOP;
  END IF;

  -- Insert educations
  IF p_educations IS NOT NULL THEN
    FOR v_edu IN SELECT * FROM jsonb_array_elements(p_educations) LOOP
      INSERT INTO associate_educations (
        associate_id,
        institution,
        degree,
        field_of_study,
        start_date,
        end_date,
        description,
        created_at,
        updated_at
      ) VALUES (
        p_associate_id,
        v_edu->>'institution',
        v_edu->>'degree',
        v_edu->>'field_of_study',
        v_edu->>'start_date',
        v_edu->>'end_date',
        v_edu->>'description',
        NOW(),
        NOW()
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. MIGRATION 003: CENTRALIZED NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  recipient_role TEXT NOT NULL, -- 'associate' | 'admin'
  type TEXT NOT NULL, -- 'invitation' | 'accepted' | 'declined' | 'completed' | 'withdrawn' | 'reviewed' | 'revision_requested' | 'applied'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  reference_id UUID, -- assignment_id atau assignee_id terkait
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to notifications" ON notifications;
CREATE POLICY "Allow all access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- 3. MIGRATION 004: PROGRESS LOGS TABLE
CREATE TABLE IF NOT EXISTS assignment_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  associate_id UUID NOT NULL,
  notes TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignment_progress_logs_assignment ON assignment_progress_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_progress_logs_associate ON assignment_progress_logs(associate_id);

ALTER TABLE assignment_progress_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to assignment_progress_logs" ON assignment_progress_logs;
CREATE POLICY "Allow all access to assignment_progress_logs" ON assignment_progress_logs FOR ALL USING (true) WITH CHECK (true);

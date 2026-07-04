-- ============================================
-- BinaHub AMS — Database Schema
-- Tabel: associate_reviews (bukan reviews)
-- ============================================

-- 1. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  client_name text NOT NULL,
  description text,
  status text DEFAULT 'draft' NOT NULL,
  start_date text,
  end_date text,
  needed_roles jsonb DEFAULT '[]' NOT NULL,
  needed_count integer DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- 2. ADMIN PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS admin_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  admin_id uuid NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true NOT NULL,
  review_alerts boolean DEFAULT true NOT NULL,
  weekly_summary boolean DEFAULT false NOT NULL,
  new_associate_alerts boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- 3. ASSIGNMENT ASSIGNEES TABLE
CREATE TABLE IF NOT EXISTS assignment_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  assignment_id uuid NOT NULL,
  associate_id uuid NOT NULL,
  status text DEFAULT 'invited' NOT NULL,
  role text,
  notes text,
  invited_by uuid,
  invited_at timestamp DEFAULT now() NOT NULL,
  accepted_at timestamp,
  completed_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- 4. UNIQUE CONSTRAINT: satu associate hanya satu assignment role
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_assignees_unique ON assignment_assignees(assignment_id, associate_id);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_assignment_assignees_assignment_id ON assignment_assignees(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_assignees_associate_id ON assignment_assignees(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_experiences_associate_id ON associate_experiences(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_educations_associate_id ON associate_educations(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_skills_associate_id ON associate_skills(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_languages_associate_id ON associate_languages(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_portfolios_associate_id ON associate_portfolios(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_documents_associate_id ON associate_documents(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_social_links_associate_id ON associate_social_links(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_emergency_contacts_associate_id ON associate_emergency_contacts(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_reviews_associate_id ON associate_reviews(associate_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);

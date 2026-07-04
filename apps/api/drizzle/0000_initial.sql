-- ============================================
-- AMS BinaHub Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE associates (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending_review', 'active', 'inactive', 'suspended')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILE DOMAIN
-- ============================================

CREATE TABLE associate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID UNIQUE REFERENCES associates(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  nationality TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE associate_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE associate_educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  start_year INT,
  end_year INT,
  gpa DECIMAL(3,2),
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE associate_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE associate_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  project_url TEXT,
  start_date DATE,
  end_date DATE,
  skills_used TEXT[],
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE associate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  category TEXT,
  proficiency TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(associate_id, skill_name)
);

CREATE TABLE associate_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  proficiency TEXT CHECK (proficiency IN ('basic', 'conversational', 'fluent', 'native')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(associate_id, language)
);

CREATE TABLE associate_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID UNIQUE REFERENCES associates(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'available' 
    CHECK (status IN ('available', 'limited', 'unavailable')),
  max_hours_per_week INT,
  preferred_work_type TEXT[],
  travel_willingness TEXT CHECK (travel_willingness IN ('no', 'limited', 'flexible')),
  available_from DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE associate_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(associate_id, platform)
);

CREATE TABLE associate_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE associate_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID UNIQUE REFERENCES associates(id) ON DELETE CASCADE,
  locale TEXT DEFAULT 'id',
  email_notifications BOOLEAN DEFAULT TRUE,
  whatsapp_notifications BOOLEAN DEFAULT TRUE,
  profile_visibility TEXT DEFAULT 'public' 
    CHECK (profile_visibility IN ('public', 'private', 'contacts_only')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FILES DOMAIN
-- ============================================

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  owner_type TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT DEFAULT 'supabase',
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INT NOT NULL,
  visibility TEXT DEFAULT 'private' 
    CHECK (visibility IN ('public', 'private', 'contacts_only')),
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_files_owner ON files(owner_id, owner_type);
CREATE INDEX idx_files_category ON files(category);

-- ============================================
-- REVIEWS DOMAIN
-- ============================================

CREATE TABLE associate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  strengths TEXT,
  improvements TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'revision_needed')),
  decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENT QUEUE
-- ============================================

CREATE TABLE event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error_message TEXT,
  available_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_event_queue_status ON event_queue(status, available_at);

-- ============================================
-- SEARCH SYNC LOG
-- ============================================

CREATE TABLE search_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to enqueue transformation events
CREATE OR REPLACE FUNCTION enqueue_transformation_event(
  p_type TEXT,
  p_aggregate_type TEXT,
  p_aggregate_id UUID,
  p_engagement_id UUID DEFAULT NULL,
  p_participant_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO event_queue (
    type,
    aggregate_type,
    aggregate_id,
    payload
  ) VALUES (
    p_type,
    p_aggregate_type,
    p_aggregate_id,
    p_payload
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE associates ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE associate_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_sync_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Associates: Users can read their own, admins can read all
CREATE POLICY "Users can view own associate" ON associates
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all associates" ON associates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Associate Profiles: Users can update their own
CREATE POLICY "Users can view own profile" ON associate_profiles
  FOR SELECT USING (auth.uid() = associate_id);

CREATE POLICY "Users can update own profile" ON associate_profiles
  FOR UPDATE USING (auth.uid() = associate_id);

CREATE POLICY "Users can insert own profile" ON associate_profiles
  FOR INSERT WITH CHECK (auth.uid() = associate_id);

-- Similar policies for other associate_* tables...
-- (Add more as needed)

-- Files: Users can view their own files
CREATE POLICY "Users can view own files" ON files
  FOR SELECT USING (auth.uid() = owner_id OR uploaded_by = auth.uid());

CREATE POLICY "Users can upload files" ON files
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Reviews: Reviewers can view and update their own reviews
CREATE POLICY "Reviewers can view reviews" ON associate_reviews
  FOR SELECT USING (
    auth.uid() = reviewer_id OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Event Queue: Only service role can access
CREATE POLICY "Service role can manage events" ON event_queue
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

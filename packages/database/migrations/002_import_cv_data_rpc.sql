-- =========================================================================
-- BinaHub AMS — Migration 002
-- Perekaman RPC import_cv_data dan Tabel rate_limits
-- =========================================================================

-- 1. Create rate_limits table for serverless rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable Row Level Security (RLS) on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for rate_limits (allow service role / admin bypass)
CREATE POLICY "Allow all access for admin/service role"
  ON rate_limits FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Create Pl/pgSQL RPC function import_cv_data
CREATE OR REPLACE FUNCTION import_cv_data(
  p_associate_id uuid,
  p_profile jsonb,
  p_experiences jsonb,
  p_educations jsonb,
  p_skills jsonb,
  p_languages jsonb,
  p_certifications jsonb
) RETURNS void AS $$
BEGIN
  -- 1. Update/Upsert associate_profiles
  INSERT INTO associate_profiles (
    associate_id, 
    full_name, 
    phone, 
    city, 
    headline, 
    bio, 
    nationality, 
    date_of_birth, 
    gender, 
    updated_at
  )
  VALUES (
    p_associate_id,
    COALESCE(p_profile->>'fullName', (SELECT full_name FROM associate_profiles WHERE associate_id = p_associate_id), 'Unnamed'),
    COALESCE(p_profile->>'phone', (SELECT phone FROM associate_profiles WHERE associate_id = p_associate_id)),
    COALESCE(p_profile->>'city', (SELECT city FROM associate_profiles WHERE associate_id = p_associate_id)),
    COALESCE(p_profile->>'headline', (SELECT headline FROM associate_profiles WHERE associate_id = p_associate_id)),
    COALESCE(p_profile->>'bio', (SELECT bio FROM associate_profiles WHERE associate_id = p_associate_id)),
    COALESCE(p_profile->>'nationality', (SELECT nationality FROM associate_profiles WHERE associate_id = p_associate_id)),
    COALESCE(p_profile->>'dateOfBirth', (SELECT date_of_birth FROM associate_profiles WHERE associate_id = p_associate_id)),
    COALESCE(p_profile->>'gender', (SELECT gender FROM associate_profiles WHERE associate_id = p_associate_id)),
    now()
  )
  ON CONFLICT (associate_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    nationality = EXCLUDED.nationality,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    updated_at = EXCLUDED.updated_at;

  -- 2. Clear and Insert experiences (skip entries missing required fields)
  DELETE FROM associate_experiences WHERE associate_id = p_associate_id;
  IF p_experiences IS NOT NULL AND jsonb_array_length(p_experiences) > 0 THEN
    INSERT INTO associate_experiences (associate_id, organization, position, description, start_date, end_date, is_current)
    SELECT 
      p_associate_id,
      COALESCE(val->>'organization', val->>'company', 'Unknown'),
      COALESCE(val->>'position', val->>'role', val->>'title', 'Unknown'),
      COALESCE(val->>'description', ''),
      CASE 
        WHEN COALESCE(val->>'startDate', val->>'start_date', '') = '' THEN '1970-01'
        WHEN length(COALESCE(val->>'startDate', val->>'start_date', '')) = 4 THEN COALESCE(val->>'startDate', val->>'start_date') || '-01'
        ELSE COALESCE(val->>'startDate', val->>'start_date', '1970-01')
      END,
      CASE 
        WHEN COALESCE(val->>'endDate', val->>'end_date', '') = '' THEN NULL
        WHEN length(COALESCE(val->>'endDate', val->>'end_date', '')) = 4 THEN COALESCE(val->>'endDate', val->>'end_date') || '-01'
        ELSE COALESCE(val->>'endDate', val->>'end_date')
      END,
      COALESCE((val->>'isCurrent')::boolean, (val->>'is_current')::boolean, COALESCE(val->>'endDate', val->>'end_date') IS NULL)
    FROM jsonb_array_elements(p_experiences) AS val;
  END IF;

  -- 3. Clear and Insert educations (skip entries missing required fields)
  DELETE FROM associate_educations WHERE associate_id = p_associate_id;
  IF p_educations IS NOT NULL AND jsonb_array_length(p_educations) > 0 THEN
    INSERT INTO associate_educations (associate_id, institution, degree, field_of_study, start_year, end_year)
    SELECT 
      p_associate_id,
      COALESCE(val->>'institution', val->>'school', 'Unknown'),
      COALESCE(val->>'degree', 'Unknown'),
      COALESCE(val->>'fieldOfStudy', val->>'field_of_study', val->>'major', ''),
      CASE 
        WHEN val->>'startYear' ~ '^\d+$' THEN (val->>'startYear')::integer
        WHEN val->>'start_year' ~ '^\d+$' THEN (val->>'start_year')::integer
        ELSE NULL
      END,
      CASE 
        WHEN val->>'endYear' ~ '^\d+$' THEN (val->>'endYear')::integer
        WHEN val->>'end_year' ~ '^\d+$' THEN (val->>'end_year')::integer
        ELSE NULL
      END
    FROM jsonb_array_elements(p_educations) AS val;
  END IF;

  -- 4. Clear and Insert skills (skip entries missing required fields)
  DELETE FROM associate_skills WHERE associate_id = p_associate_id;
  IF p_skills IS NOT NULL AND jsonb_array_length(p_skills) > 0 THEN
    INSERT INTO associate_skills (associate_id, skill_name, category, proficiency, years_experience)
    SELECT 
      p_associate_id,
      COALESCE(val->>'skillName', val->>'skill_name', val->>'name', 'Unknown'),
      COALESCE(val->>'category', 'technical'),
      COALESCE(val->>'proficiency', 'intermediate'),
      CASE 
        WHEN val->>'yearsExperience' ~ '^\d+$' THEN (val->>'yearsExperience')::integer
        WHEN val->>'years_experience' ~ '^\d+$' THEN (val->>'years_experience')::integer
        ELSE NULL
      END
    FROM jsonb_array_elements(p_skills) AS val;
  END IF;

  -- 5. Clear and Insert languages (skip entries missing required fields)
  DELETE FROM associate_languages WHERE associate_id = p_associate_id;
  IF p_languages IS NOT NULL AND jsonb_array_length(p_languages) > 0 THEN
    INSERT INTO associate_languages (associate_id, language, proficiency)
    SELECT 
      p_associate_id,
      COALESCE(val->>'language', val->>'name', 'Unknown'),
      COALESCE(val->>'proficiency', 'conversational')
    FROM jsonb_array_elements(p_languages) AS val;
  END IF;

  -- 6. Clear and Insert certifications (skip entries missing required fields)
  DELETE FROM associate_certifications WHERE associate_id = p_associate_id;
  IF p_certifications IS NOT NULL AND jsonb_array_length(p_certifications) > 0 THEN
    INSERT INTO associate_certifications (associate_id, name, issuer, issue_date, expiry_date)
    SELECT 
      p_associate_id,
      COALESCE(val->>'name', val->>'title', 'Unknown'),
      COALESCE(val->>'issuer', val->>'organization', val->>'provider', ''),
      COALESCE(val->>'issueDate', val->>'issue_date'),
      COALESCE(val->>'expiryDate', val->>'expiry_date')
    FROM jsonb_array_elements(p_certifications) AS val;
  END IF;
END;
$$ LANGUAGE plpgsql;

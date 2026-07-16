-- =========================================================================
-- BinaHub AMS — SQL Setup Batch 4
-- Silakan salin dan jalankan di SQL Editor Supabase Anda
-- =========================================================================

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
    COALESCE(p_profile->>'fullName', (SELECT full_name FROM associate_profiles WHERE associate_id = p_associate_id)),
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

  -- 2. Clear and Insert experiences
  DELETE FROM associate_experiences WHERE associate_id = p_associate_id;
  IF p_experiences IS NOT NULL AND jsonb_array_length(p_experiences) > 0 THEN
    INSERT INTO associate_experiences (associate_id, organization, position, description, start_date, end_date, is_current)
    SELECT 
      p_associate_id,
      (val->>'company'),
      (val->>'position'),
      COALESCE(val->>'description', ''),
      (val->>'startDate'),
      (val->>'endDate'),
      COALESCE((val->>'isCurrent')::boolean, (val->>'endDate') IS NULL)
    FROM jsonb_array_elements(p_experiences) AS val;
  END IF;

  -- 3. Clear and Insert educations
  DELETE FROM associate_educations WHERE associate_id = p_associate_id;
  IF p_educations IS NOT NULL AND jsonb_array_length(p_educations) > 0 THEN
    INSERT INTO associate_educations (associate_id, institution, degree, field_of_study, start_year, end_year)
    SELECT 
      p_associate_id,
      (val->>'institution'),
      (val->>'degree'),
      COALESCE(val->>'fieldOfStudy', ''),
      (val->>'startYear')::integer,
      (val->>'endYear')::integer
    FROM jsonb_array_elements(p_educations) AS val;
  END IF;

  -- 4. Clear and Insert skills
  DELETE FROM associate_skills WHERE associate_id = p_associate_id;
  IF p_skills IS NOT NULL AND jsonb_array_length(p_skills) > 0 THEN
    INSERT INTO associate_skills (associate_id, skill_name, category, proficiency, years_experience)
    SELECT 
      p_associate_id,
      (val->>'skillName'),
      COALESCE(val->>'category', 'technical'),
      COALESCE(val->>'proficiency', 'intermediate'),
      (val->>'yearsExperience')::integer
    FROM jsonb_array_elements(p_skills) AS val;
  END IF;

  -- 5. Clear and Insert languages
  DELETE FROM associate_languages WHERE associate_id = p_associate_id;
  IF p_languages IS NOT NULL AND jsonb_array_length(p_languages) > 0 THEN
    INSERT INTO associate_languages (associate_id, language, proficiency)
    SELECT 
      p_associate_id,
      (val->>'language'),
      COALESCE(val->>'proficiency', 'conversational')
    FROM jsonb_array_elements(p_languages) AS val;
  END IF;

  -- 6. Clear and Insert certifications
  DELETE FROM associate_certifications WHERE associate_id = p_associate_id;
  IF p_certifications IS NOT NULL AND jsonb_array_length(p_certifications) > 0 THEN
    INSERT INTO associate_certifications (associate_id, name, issuer, issue_date, expiry_date)
    SELECT 
      p_associate_id,
      (val->>'name'),
      (val->>'issuer'),
      (val->>'issueDate'),
      (val->>'expiryDate')
    FROM jsonb_array_elements(p_certifications) AS val;
  END IF;
END;
$$ LANGUAGE plpgsql;

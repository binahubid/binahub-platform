-- =========================================================================
-- BinaHub AMS — Migration 008
-- Complete and harden the reviewed CV import transaction.
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
DECLARE
  v_linkedin text;
  v_website text;
BEGIN
  INSERT INTO associate_profiles (
    associate_id,
    full_name,
    preferred_name,
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
    COALESCE(p_profile->>'preferredName', (SELECT preferred_name FROM associate_profiles WHERE associate_id = p_associate_id)),
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
    preferred_name = EXCLUDED.preferred_name,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    nationality = EXCLUDED.nationality,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    updated_at = EXCLUDED.updated_at;

  DELETE FROM associate_experiences WHERE associate_id = p_associate_id;
  IF p_experiences IS NOT NULL AND jsonb_array_length(p_experiences) > 0 THEN
    INSERT INTO associate_experiences (
      associate_id,
      organization,
      position,
      industry,
      description,
      achievement,
      start_date,
      end_date,
      is_current
    )
    SELECT
      p_associate_id,
      val->>'organization',
      val->>'position',
      NULLIF(val->>'industry', ''),
      NULLIF(val->>'description', ''),
      NULLIF(val->>'achievement', ''),
      CASE
        WHEN length(val->>'startDate') = 4 THEN (val->>'startDate') || '-01'
        ELSE val->>'startDate'
      END,
      CASE
        WHEN COALESCE(val->>'endDate', '') = '' THEN NULL
        WHEN length(val->>'endDate') = 4 THEN (val->>'endDate') || '-01'
        ELSE val->>'endDate'
      END,
      COALESCE((val->>'isCurrent')::boolean, COALESCE(val->>'endDate', '') = '')
    FROM jsonb_array_elements(p_experiences) AS val;
  END IF;

  DELETE FROM associate_educations WHERE associate_id = p_associate_id;
  IF p_educations IS NOT NULL AND jsonb_array_length(p_educations) > 0 THEN
    INSERT INTO associate_educations (
      associate_id,
      institution,
      degree,
      field_of_study,
      start_year,
      end_year
    )
    SELECT
      p_associate_id,
      val->>'institution',
      val->>'degree',
      NULLIF(val->>'fieldOfStudy', ''),
      CASE WHEN val->>'startYear' ~ '^\d+$' THEN (val->>'startYear')::integer ELSE NULL END,
      CASE WHEN val->>'endYear' ~ '^\d+$' THEN (val->>'endYear')::integer ELSE NULL END
    FROM jsonb_array_elements(p_educations) AS val;
  END IF;

  DELETE FROM associate_skills WHERE associate_id = p_associate_id;
  IF p_skills IS NOT NULL AND jsonb_array_length(p_skills) > 0 THEN
    INSERT INTO associate_skills (
      associate_id,
      skill_name,
      category,
      proficiency,
      years_experience
    )
    SELECT
      p_associate_id,
      val->>'skillName',
      COALESCE(val->>'category', 'other'),
      COALESCE(val->>'proficiency', 'intermediate'),
      CASE WHEN val->>'yearsExperience' ~ '^\d+$' THEN (val->>'yearsExperience')::integer ELSE NULL END
    FROM jsonb_array_elements(p_skills) AS val;
  END IF;

  DELETE FROM associate_languages WHERE associate_id = p_associate_id;
  IF p_languages IS NOT NULL AND jsonb_array_length(p_languages) > 0 THEN
    INSERT INTO associate_languages (associate_id, language, proficiency)
    SELECT
      p_associate_id,
      val->>'language',
      COALESCE(val->>'proficiency', 'conversational')
    FROM jsonb_array_elements(p_languages) AS val;
  END IF;

  DELETE FROM associate_certifications WHERE associate_id = p_associate_id;
  IF p_certifications IS NOT NULL AND jsonb_array_length(p_certifications) > 0 THEN
    INSERT INTO associate_certifications (
      associate_id,
      name,
      issuer,
      issue_date,
      expiry_date,
      credential_id,
      credential_url
    )
    SELECT
      p_associate_id,
      val->>'name',
      COALESCE(val->>'issuer', ''),
      NULLIF(val->>'issueDate', ''),
      NULLIF(val->>'expiryDate', ''),
      NULLIF(val->>'credentialId', ''),
      NULLIF(val->>'credentialUrl', '')
    FROM jsonb_array_elements(p_certifications) AS val;
  END IF;

  IF p_profile ? 'linkedIn' THEN
    v_linkedin := NULLIF(BTRIM(p_profile->>'linkedIn'), '');
    DELETE FROM associate_social_links
      WHERE associate_id = p_associate_id AND lower(platform) = 'linkedin';
    IF v_linkedin IS NOT NULL THEN
      INSERT INTO associate_social_links (associate_id, platform, url, is_primary)
      VALUES (p_associate_id, 'linkedin', v_linkedin, true);
    END IF;
  END IF;

  IF p_profile ? 'website' THEN
    v_website := NULLIF(BTRIM(p_profile->>'website'), '');
    DELETE FROM associate_social_links
      WHERE associate_id = p_associate_id AND lower(platform) = 'website';
    IF v_website IS NOT NULL THEN
      INSERT INTO associate_social_links (associate_id, platform, url, is_primary)
      VALUES (p_associate_id, 'website', v_website, false);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION import_cv_data(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION import_cv_data(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION import_cv_data(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO service_role;

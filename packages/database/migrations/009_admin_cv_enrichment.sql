-- =========================================================================
-- BinaHub AMS — Migration 009
-- Merge an administrator-reviewed AI CV draft into an associate profile.
-- Existing collections are preserved; only missing natural-key entries are
-- added. Scalar profile fields are updated only when the reviewed CV supplies
-- a non-empty value.
-- =========================================================================

CREATE OR REPLACE FUNCTION merge_cv_data(
  p_associate_id uuid,
  p_profile jsonb,
  p_experiences jsonb,
  p_educations jsonb,
  p_skills jsonb,
  p_languages jsonb,
  p_certifications jsonb,
  p_portfolios jsonb
) RETURNS jsonb AS $$
DECLARE
  v_existing associate_profiles%ROWTYPE;
  v_linkedin text;
  v_website text;
  v_experiences integer := 0;
  v_educations integer := 0;
  v_skills integer := 0;
  v_languages integer := 0;
  v_certifications integer := 0;
  v_portfolios integer := 0;
BEGIN
  -- Applying the same reviewed draft concurrently must not pass the natural-key
  -- checks twice and create duplicate collection rows.
  PERFORM pg_advisory_xact_lock(
    hashtext('merge_cv_data'),
    hashtext(p_associate_id::text)
  );

  IF NOT EXISTS (SELECT 1 FROM associates WHERE id = p_associate_id) THEN
    RAISE EXCEPTION 'associate_not_found';
  END IF;

  SELECT * INTO v_existing
  FROM associate_profiles
  WHERE associate_id = p_associate_id;

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
    roles,
    expertises,
    updated_at
  ) VALUES (
    p_associate_id,
    COALESCE(NULLIF(BTRIM(p_profile->>'fullName'), ''), v_existing.full_name, 'Unnamed'),
    COALESCE(NULLIF(BTRIM(p_profile->>'preferredName'), ''), v_existing.preferred_name),
    COALESCE(NULLIF(BTRIM(p_profile->>'phone'), ''), v_existing.phone),
    COALESCE(NULLIF(BTRIM(p_profile->>'city'), ''), v_existing.city),
    COALESCE(NULLIF(BTRIM(p_profile->>'headline'), ''), v_existing.headline),
    COALESCE(NULLIF(BTRIM(p_profile->>'bio'), ''), v_existing.bio),
    COALESCE(NULLIF(BTRIM(p_profile->>'nationality'), ''), v_existing.nationality),
    COALESCE(NULLIF(BTRIM(p_profile->>'dateOfBirth'), ''), v_existing.date_of_birth),
    COALESCE(NULLIF(BTRIM(p_profile->>'gender'), ''), v_existing.gender),
    (
      SELECT COALESCE(jsonb_agg(value ORDER BY value), '[]'::jsonb)
      FROM (
        SELECT DISTINCT value
        FROM jsonb_array_elements_text(
          COALESCE(v_existing.roles, '[]'::jsonb) || COALESCE(p_profile->'roles', '[]'::jsonb)
        ) AS role(value)
        WHERE BTRIM(value) <> ''
      ) roles
    ),
    (
      SELECT COALESCE(jsonb_agg(value ORDER BY value), '[]'::jsonb)
      FROM (
        SELECT DISTINCT value
        FROM jsonb_array_elements_text(
          COALESCE(v_existing.expertises, '[]'::jsonb) || COALESCE(p_profile->'expertises', '[]'::jsonb)
        ) AS expertise(value)
        WHERE BTRIM(value) <> ''
      ) expertises
    ),
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
    roles = EXCLUDED.roles,
    expertises = EXCLUDED.expertises,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO associate_experiences (
    associate_id, organization, position, industry, description, achievement,
    start_date, end_date, is_current
  )
  SELECT
    p_associate_id,
    val->>'organization',
    val->>'position',
    NULLIF(val->>'industry', ''),
    NULLIF(val->>'description', ''),
    NULLIF(val->>'achievement', ''),
    val->>'startDate',
    NULLIF(val->>'endDate', ''),
    COALESCE((val->>'isCurrent')::boolean, COALESCE(val->>'endDate', '') = '')
  FROM jsonb_array_elements(COALESCE(p_experiences, '[]'::jsonb)) AS val
  WHERE NOT EXISTS (
    SELECT 1 FROM associate_experiences existing
    WHERE existing.associate_id = p_associate_id
      AND lower(existing.organization) = lower(val->>'organization')
      AND lower(existing.position) = lower(val->>'position')
      AND existing.start_date = val->>'startDate'
  );
  GET DIAGNOSTICS v_experiences = ROW_COUNT;

  INSERT INTO associate_educations (
    associate_id, institution, degree, field_of_study, start_year, end_year
  )
  SELECT
    p_associate_id,
    val->>'institution',
    val->>'degree',
    NULLIF(val->>'fieldOfStudy', ''),
    CASE WHEN val->>'startYear' ~ '^\d+$' THEN (val->>'startYear')::integer ELSE NULL END,
    CASE WHEN val->>'endYear' ~ '^\d+$' THEN (val->>'endYear')::integer ELSE NULL END
  FROM jsonb_array_elements(COALESCE(p_educations, '[]'::jsonb)) AS val
  WHERE NOT EXISTS (
    SELECT 1 FROM associate_educations existing
    WHERE existing.associate_id = p_associate_id
      AND lower(existing.institution) = lower(val->>'institution')
      AND lower(existing.degree) = lower(val->>'degree')
      AND COALESCE(existing.end_year, 0) = COALESCE(
        CASE WHEN val->>'endYear' ~ '^\d+$' THEN (val->>'endYear')::integer ELSE NULL END,
        0
      )
  );
  GET DIAGNOSTICS v_educations = ROW_COUNT;

  INSERT INTO associate_skills (
    associate_id, skill_name, category, proficiency, years_experience
  )
  SELECT
    p_associate_id,
    val->>'skillName',
    COALESCE(NULLIF(val->>'category', ''), 'other'),
    COALESCE(NULLIF(val->>'proficiency', ''), 'intermediate'),
    CASE WHEN val->>'yearsExperience' ~ '^\d+$' THEN (val->>'yearsExperience')::integer ELSE NULL END
  FROM jsonb_array_elements(COALESCE(p_skills, '[]'::jsonb)) AS val
  WHERE NOT EXISTS (
    SELECT 1 FROM associate_skills existing
    WHERE existing.associate_id = p_associate_id
      AND lower(existing.skill_name) = lower(val->>'skillName')
  );
  GET DIAGNOSTICS v_skills = ROW_COUNT;

  INSERT INTO associate_languages (associate_id, language, proficiency)
  SELECT
    p_associate_id,
    val->>'language',
    COALESCE(NULLIF(val->>'proficiency', ''), 'conversational')
  FROM jsonb_array_elements(COALESCE(p_languages, '[]'::jsonb)) AS val
  WHERE NOT EXISTS (
    SELECT 1 FROM associate_languages existing
    WHERE existing.associate_id = p_associate_id
      AND lower(existing.language) = lower(val->>'language')
  );
  GET DIAGNOSTICS v_languages = ROW_COUNT;

  INSERT INTO associate_certifications (
    associate_id, name, issuer, issue_date, expiry_date, credential_id, credential_url
  )
  SELECT
    p_associate_id,
    val->>'name',
    COALESCE(val->>'issuer', ''),
    NULLIF(val->>'issueDate', ''),
    NULLIF(val->>'expiryDate', ''),
    NULLIF(val->>'credentialId', ''),
    NULLIF(val->>'credentialUrl', '')
  FROM jsonb_array_elements(COALESCE(p_certifications, '[]'::jsonb)) AS val
  WHERE NOT EXISTS (
    SELECT 1 FROM associate_certifications existing
    WHERE existing.associate_id = p_associate_id
      AND lower(existing.name) = lower(val->>'name')
      AND lower(existing.issuer) = lower(COALESCE(val->>'issuer', ''))
  );
  GET DIAGNOSTICS v_certifications = ROW_COUNT;

  INSERT INTO associate_portfolios (
    associate_id, title, description, category, client_name, project_url,
    start_date, end_date, skills_used
  )
  SELECT
    p_associate_id,
    val->>'title',
    NULLIF(val->>'description', ''),
    NULLIF(val->>'category', ''),
    NULLIF(val->>'clientName', ''),
    NULLIF(val->>'projectUrl', ''),
    NULLIF(val->>'startDate', ''),
    NULLIF(val->>'endDate', ''),
    COALESCE(val->'skillsUsed', '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_portfolios, '[]'::jsonb)) AS val
  WHERE NOT EXISTS (
    SELECT 1 FROM associate_portfolios existing
    WHERE existing.associate_id = p_associate_id
      AND lower(existing.title) = lower(val->>'title')
      AND lower(COALESCE(existing.client_name, '')) = lower(COALESCE(val->>'clientName', ''))
  );
  GET DIAGNOSTICS v_portfolios = ROW_COUNT;

  IF p_profile ? 'linkedIn' THEN
    v_linkedin := NULLIF(BTRIM(p_profile->>'linkedIn'), '');
    IF v_linkedin IS NOT NULL THEN
      DELETE FROM associate_social_links
      WHERE associate_id = p_associate_id AND lower(platform) = 'linkedin';
      INSERT INTO associate_social_links (associate_id, platform, url, is_primary)
      VALUES (p_associate_id, 'linkedin', v_linkedin, true);
    END IF;
  END IF;

  IF p_profile ? 'website' THEN
    v_website := NULLIF(BTRIM(p_profile->>'website'), '');
    IF v_website IS NOT NULL THEN
      DELETE FROM associate_social_links
      WHERE associate_id = p_associate_id AND lower(platform) = 'website';
      INSERT INTO associate_social_links (associate_id, platform, url, is_primary)
      VALUES (p_associate_id, 'website', v_website, false);
    END IF;
  END IF;

  UPDATE associates
  SET updated_at = now()
  WHERE id = p_associate_id;

  RETURN jsonb_build_object(
    'profileUpdated', true,
    'experiencesAdded', v_experiences,
    'educationsAdded', v_educations,
    'skillsAdded', v_skills,
    'languagesAdded', v_languages,
    'certificationsAdded', v_certifications,
    'portfoliosAdded', v_portfolios
  );
END;
$$ LANGUAGE plpgsql SET search_path = public;

REVOKE ALL ON FUNCTION merge_cv_data(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION merge_cv_data(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION merge_cv_data(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO service_role;

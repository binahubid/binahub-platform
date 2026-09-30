-- ============================================
-- BinaHub AMS — Database Schema
-- Tabel: associate_reviews (bukan reviews)
-- ============================================

-- 0. ASSOCIATE FINANCIAL DETAILS (isolated from associate_profiles to prevent leakage)
CREATE TABLE IF NOT EXISTS associate_financial_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID NOT NULL UNIQUE REFERENCES associates(id) ON DELETE CASCADE,
  npwp TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE associate_financial_details ENABLE ROW LEVEL SECURITY;
-- Runtime access uses the API service-role client. Do not expose this table to anon/authenticated clients.
REVOKE ALL ON TABLE associate_financial_details FROM anon, authenticated;

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
  compensation_amount numeric(18, 2),
  compensation_currency text,
  compensation_basis text,
  compensation_notes text,
  transport_amount numeric(18, 2),
  preparation_amount numeric(18, 2),
  invitation_expires_at timestamp with time zone,
  compensation_updated_at timestamp with time zone,
  compensation_updated_by uuid,
  invited_by uuid,
  invited_at timestamp DEFAULT now() NOT NULL,
  accepted_at timestamp,
  completed_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE assignment_assignees DROP CONSTRAINT IF EXISTS assignment_assignees_compensation_amount_check;
ALTER TABLE assignment_assignees ADD CONSTRAINT assignment_assignees_compensation_amount_check CHECK (compensation_amount IS NULL OR compensation_amount >= 0);
ALTER TABLE assignment_assignees DROP CONSTRAINT IF EXISTS assignment_assignees_compensation_currency_check;
ALTER TABLE assignment_assignees ADD CONSTRAINT assignment_assignees_compensation_currency_check CHECK (compensation_currency IS NULL OR compensation_currency ~ '^[A-Z]{3}$');
ALTER TABLE assignment_assignees DROP CONSTRAINT IF EXISTS assignment_assignees_compensation_basis_check;
ALTER TABLE assignment_assignees ADD CONSTRAINT assignment_assignees_compensation_basis_check CHECK (compensation_basis IS NULL OR compensation_basis IN ('fixed_project', 'per_day', 'per_session', 'per_hour', 'per_deliverable', 'other'));
ALTER TABLE assignment_assignees DROP CONSTRAINT IF EXISTS assignment_assignees_compensation_override_check;
ALTER TABLE assignment_assignees ADD CONSTRAINT assignment_assignees_compensation_override_check CHECK ((compensation_amount IS NULL AND compensation_currency IS NULL AND compensation_basis IS NULL) OR (compensation_amount IS NOT NULL AND compensation_currency IS NOT NULL AND compensation_basis IS NOT NULL));
ALTER TABLE assignment_assignees DROP CONSTRAINT IF EXISTS assignment_assignees_compensation_notes_check;
ALTER TABLE assignment_assignees ADD CONSTRAINT assignment_assignees_compensation_notes_check CHECK (compensation_notes IS NULL OR char_length(compensation_notes) <= 2000);
ALTER TABLE assignment_assignees DROP CONSTRAINT IF EXISTS assignment_assignees_transport_amount_check;
ALTER TABLE assignment_assignees ADD CONSTRAINT assignment_assignees_transport_amount_check CHECK (transport_amount IS NULL OR transport_amount >= 0);
ALTER TABLE assignment_assignees DROP CONSTRAINT IF EXISTS assignment_assignees_preparation_amount_check;
ALTER TABLE assignment_assignees ADD CONSTRAINT assignment_assignees_preparation_amount_check CHECK (preparation_amount IS NULL OR preparation_amount >= 0);

CREATE TABLE IF NOT EXISTS assignment_compensation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  assignment_assignee_id uuid REFERENCES assignment_assignees(id) ON DELETE SET NULL,
  assignment_id uuid NOT NULL,
  associate_id uuid NOT NULL,
  previous_amount numeric(18, 2),
  previous_currency text,
  previous_basis text,
  previous_notes text,
  new_amount numeric(18, 2),
  new_currency text,
  new_basis text,
  new_notes text,
  change_type text NOT NULL CHECK (change_type IN ('override_set', 'override_updated', 'inherit_default')),
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assignment_compensation_history_assignee ON assignment_compensation_history(assignment_assignee_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_compensation_history_assignment ON assignment_compensation_history(assignment_id, changed_at DESC);
ALTER TABLE assignment_compensation_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE assignment_compensation_history FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE assignment_compensation_history TO service_role;

CREATE OR REPLACE FUNCTION record_assignment_compensation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO assignment_compensation_history (
    assignment_assignee_id,
    assignment_id,
    associate_id,
    previous_amount,
    previous_currency,
    previous_basis,
    previous_notes,
    new_amount,
    new_currency,
    new_basis,
    new_notes,
    change_type,
    changed_by,
    changed_at
  ) VALUES (
    NEW.id,
    NEW.assignment_id,
    NEW.associate_id,
    OLD.compensation_amount,
    OLD.compensation_currency,
    OLD.compensation_basis,
    OLD.compensation_notes,
    NEW.compensation_amount,
    NEW.compensation_currency,
    NEW.compensation_basis,
    NEW.compensation_notes,
    CASE
      WHEN NEW.compensation_amount IS NULL THEN 'inherit_default'
      WHEN OLD.compensation_amount IS NULL THEN 'override_set'
      ELSE 'override_updated'
    END,
    NEW.compensation_updated_by,
    COALESCE(NEW.compensation_updated_at, now())
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION record_assignment_compensation_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS assignment_assignees_compensation_audit ON assignment_assignees;
CREATE TRIGGER assignment_assignees_compensation_audit
AFTER UPDATE OF compensation_amount, compensation_currency, compensation_basis, compensation_notes
ON assignment_assignees
FOR EACH ROW
WHEN (
  OLD.compensation_amount IS DISTINCT FROM NEW.compensation_amount
  OR OLD.compensation_currency IS DISTINCT FROM NEW.compensation_currency
  OR OLD.compensation_basis IS DISTINCT FROM NEW.compensation_basis
  OR OLD.compensation_notes IS DISTINCT FROM NEW.compensation_notes
)
EXECUTE FUNCTION record_assignment_compensation_change();

CREATE OR REPLACE FUNCTION record_initial_assignment_compensation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.compensation_amount IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO assignment_compensation_history (
    assignment_assignee_id,
    assignment_id,
    associate_id,
    previous_amount,
    previous_currency,
    previous_basis,
    previous_notes,
    new_amount,
    new_currency,
    new_basis,
    new_notes,
    change_type,
    changed_by,
    changed_at
  ) VALUES (
    NEW.id,
    NEW.assignment_id,
    NEW.associate_id,
    NULL,
    NULL,
    NULL,
    NULL,
    NEW.compensation_amount,
    NEW.compensation_currency,
    NEW.compensation_basis,
    NEW.compensation_notes,
    'override_set',
    NEW.compensation_updated_by,
    COALESCE(NEW.compensation_updated_at, now())
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION record_initial_assignment_compensation() FROM PUBLIC;

DROP TRIGGER IF EXISTS assignment_assignees_initial_compensation_audit ON assignment_assignees;
CREATE TRIGGER assignment_assignees_initial_compensation_audit
AFTER INSERT ON assignment_assignees
FOR EACH ROW
WHEN (NEW.compensation_amount IS NOT NULL)
EXECUTE FUNCTION record_initial_assignment_compensation();

-- 4. UNIQUE CONSTRAINT: satu associate hanya satu assignment role
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_assignees_unique ON assignment_assignees(assignment_id, associate_id);

CREATE OR REPLACE FUNCTION public.guard_assignment_acceptance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE required_count integer; filled_count integer;
BEGIN
  IF new.status <> 'accepted' OR old.status = 'accepted' THEN RETURN new; END IF;
  IF old.status NOT IN ('invited', 'applied') THEN RAISE EXCEPTION 'Undangan tidak lagi dapat diterima'; END IF;
  IF new.invitation_expires_at IS NOT NULL AND new.invitation_expires_at <= now() THEN RAISE EXCEPTION 'Batas waktu undangan telah lewat'; END IF;
  SELECT needed_count INTO required_count FROM public.assignments WHERE id = new.assignment_id FOR UPDATE;
  IF required_count IS NULL THEN RAISE EXCEPTION 'Assignment tidak tersedia'; END IF;
  SELECT count(*) INTO filled_count FROM public.assignment_assignees
  WHERE assignment_id = new.assignment_id AND id <> new.id AND status IN ('accepted', 'in_progress', 'completed', 'reviewed');
  IF filled_count >= required_count THEN RAISE EXCEPTION 'Seluruh posisi assignment sudah terisi'; END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_assignment_acceptance() FROM PUBLIC;
DROP TRIGGER IF EXISTS assignment_assignees_acceptance_guard ON public.assignment_assignees;
CREATE TRIGGER assignment_assignees_acceptance_guard BEFORE UPDATE OF status ON public.assignment_assignees
FOR EACH ROW WHEN (new.status = 'accepted' AND old.status IS DISTINCT FROM new.status)
EXECUTE FUNCTION public.guard_assignment_acceptance();

CREATE OR REPLACE FUNCTION public.guard_assignment_needed_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE filled_count integer;
BEGIN
  SELECT count(*) INTO filled_count FROM public.assignment_assignees
  WHERE assignment_id = new.id AND status IN ('accepted', 'in_progress', 'completed', 'reviewed');
  IF new.needed_count < filled_count THEN
    RAISE EXCEPTION 'Jumlah kebutuhan tidak boleh lebih kecil dari posisi terisi';
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_assignment_needed_count() FROM PUBLIC;
DROP TRIGGER IF EXISTS assignments_needed_count_guard ON public.assignments;
CREATE TRIGGER assignments_needed_count_guard BEFORE UPDATE OF needed_count ON public.assignments
FOR EACH ROW WHEN (new.needed_count IS DISTINCT FROM old.needed_count)
EXECUTE FUNCTION public.guard_assignment_needed_count();

-- 5. INDEXES
ALTER TABLE associate_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_assignment_assignees_assignment_id ON assignment_assignees(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_assignees_associate_id ON assignment_assignees(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_experiences_associate_id ON associate_experiences(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_educations_associate_id ON associate_educations(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_skills_associate_id ON associate_skills(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_languages_associate_id ON associate_languages(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_portfolios_associate_id ON associate_portfolios(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_documents_associate_id ON associate_documents(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_documents_active_by_associate ON associate_documents(associate_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_associate_social_links_associate_id ON associate_social_links(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_emergency_contacts_associate_id ON associate_emergency_contacts(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_reviews_associate_id ON associate_reviews(associate_id);
CREATE INDEX IF NOT EXISTS idx_associate_financial_details_associate_id ON associate_financial_details(associate_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);

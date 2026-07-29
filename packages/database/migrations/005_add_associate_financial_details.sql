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

CREATE INDEX IF NOT EXISTS idx_associate_financial_details_associate
  ON associate_financial_details(associate_id);

ALTER TABLE associate_financial_details ENABLE ROW LEVEL SECURITY;

-- Runtime access uses the API service-role client. Do not expose this table to anon/authenticated clients.
REVOKE ALL ON TABLE associate_financial_details FROM anon, authenticated;

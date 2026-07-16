-- Create assignment progress logs table
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
CREATE POLICY "Allow all access to assignment_progress_logs" ON assignment_progress_logs FOR ALL USING (true) WITH CHECK (true);

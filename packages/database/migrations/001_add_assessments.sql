-- Add associate_assessments table
CREATE TABLE IF NOT EXISTS associate_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  assessment_type TEXT NOT NULL,
  score INTEGER DEFAULT 0 NOT NULL,
  max_score INTEGER DEFAULT 100 NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  assessor TEXT,
  feedback TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_assessments_associate_id ON associate_assessments(associate_id);

-- Enable RLS
ALTER TABLE associate_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Associates can view own assessments"
  ON associate_assessments FOR SELECT
  USING (associate_id = auth.uid());

CREATE POLICY "Admins can manage all assessments"
  ON associate_assessments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add associate_tasks table
CREATE TABLE IF NOT EXISTS associate_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_associate_id ON associate_tasks(associate_id);

ALTER TABLE associate_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Associates can manage own tasks"
  ON associate_tasks FOR ALL
  USING (associate_id = auth.uid());

-- Add associate_development_plans table
CREATE TABLE IF NOT EXISTS associate_development_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID NOT NULL UNIQUE REFERENCES associates(id) ON DELETE CASCADE,
  current_score INTEGER DEFAULT 0 NOT NULL,
  target_score INTEGER DEFAULT 80 NOT NULL,
  recommended_actions JSONB DEFAULT '[]' NOT NULL,
  learning_paths JSONB DEFAULT '[]' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dev_plans_associate_id ON associate_development_plans(associate_id);

-- Enable RLS
ALTER TABLE associate_development_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Associates can view own development plans"
  ON associate_development_plans FOR SELECT
  USING (associate_id = auth.uid());

CREATE POLICY "Admins can manage all development plans"
  ON associate_development_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

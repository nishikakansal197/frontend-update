/*
  # Create Areas and Departments Tables

  1. New Tables
    - `areas` - Geographic areas for location management
    - `departments` - Government departments
    - `issue_assignments` - Track issue assignments between roles

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  district_id text, -- Reference to district (can be enhanced later)
  state_id text, -- Reference to state
  population integer,
  area_sq_km decimal(10, 2),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('administration', 'public_works', 'utilities', 'environment', 'safety', 'parks', 'planning', 'finance')),
  head_official_id uuid,
  contact_email text,
  contact_phone text,
  office_address text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create issue assignments table
CREATE TABLE IF NOT EXISTS issue_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  assignment_type text NOT NULL CHECK (assignment_type IN ('admin_to_area', 'area_to_department', 'department_to_contractor')),
  assignment_notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints to existing tables
DO $$
BEGIN
  -- Add assigned_area_id to profiles if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'assigned_area_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN assigned_area_id uuid REFERENCES areas(id) ON DELETE SET NULL;
  END IF;

  -- Add assigned_department_id to profiles if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'assigned_department_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN assigned_department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
  END IF;

  -- Add workflow_stage to issues if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'workflow_stage'
  ) THEN
    ALTER TABLE issues ADD COLUMN workflow_stage text DEFAULT 'reported' CHECK (workflow_stage IN ('reported', 'area_review', 'department_assigned', 'contractor_assigned', 'in_progress', 'department_review', 'resolved'));
  END IF;

  -- Add assigned_department_id to issues if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'assigned_department_id'
  ) THEN
    ALTER TABLE issues ADD COLUMN assigned_department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
  END IF;

  -- Add current_assignee_id to issues if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'current_assignee_id'
  ) THEN
    ALTER TABLE issues ADD COLUMN current_assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- Update user_type constraint to include new types
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
    CHECK (user_type IN ('user', 'admin', 'area_super_admin', 'department_admin', 'tender'));
END $$;

-- Enable RLS
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_assignments ENABLE ROW LEVEL SECURITY;

-- Areas policies
CREATE POLICY "Anyone can read active areas"
  ON areas FOR SELECT TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Admins can manage areas"
  ON areas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type IN ('admin', 'area_super_admin')
    )
  );

-- Departments policies
CREATE POLICY "Anyone can read active departments"
  ON departments FOR SELECT TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type IN ('admin', 'area_super_admin', 'department_admin')
    )
  );

-- Issue assignments policies
CREATE POLICY "Users can read relevant assignments"
  ON issue_assignments FOR SELECT TO authenticated
  USING (
    assigned_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type IN ('admin', 'area_super_admin', 'department_admin')
    )
  );

CREATE POLICY "Authorized users can create assignments"
  ON issue_assignments FOR INSERT TO authenticated
  WITH CHECK (
    assigned_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type IN ('admin', 'area_super_admin', 'department_admin')
    )
  );

-- Insert sample areas
INSERT INTO areas (name, code, description, district_id, state_id, is_active) VALUES
('Central Mumbai', 'MUM-C', 'Central business district of Mumbai', '1-1', '1', true),
('South Mumbai', 'MUM-S', 'Southern peninsula of Mumbai', '1-1', '1', true),
('Western Mumbai', 'MUM-W', 'Western suburbs of Mumbai', '1-1', '1', true),
('Eastern Mumbai', 'MUM-E', 'Eastern suburbs of Mumbai', '1-1', '1', true),
('Pune Central', 'PUN-C', 'Central Pune area', '1-2', '1', true),
('Pune West', 'PUN-W', 'Western Pune area', '1-2', '1', true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample departments
INSERT INTO departments (name, code, description, category, contact_email, contact_phone, is_active) VALUES
('Public Works Department', 'PWD', 'Responsible for roads, bridges, and infrastructure maintenance', 'public_works', 'pwd@city.gov', '+1-555-0201', true),
('Water & Utilities Department', 'WUD', 'Manages water supply, sewage, and utility services', 'utilities', 'water@city.gov', '+1-555-0202', true),
('Parks & Recreation Department', 'PRD', 'Maintains parks, gardens, and recreational facilities', 'parks', 'parks@city.gov', '+1-555-0203', true),
('Environmental Services', 'ENV', 'Handles environmental protection and waste management', 'environment', 'env@city.gov', '+1-555-0204', true),
('Public Safety Department', 'PSD', 'Ensures public safety and emergency response', 'safety', 'safety@city.gov', '+1-555-0205', true),
('Urban Planning Department', 'UPD', 'City planning and development oversight', 'planning', 'planning@city.gov', '+1-555-0206', true)
ON CONFLICT (code) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_areas_district_id ON areas(district_id);
CREATE INDEX IF NOT EXISTS idx_areas_state_id ON areas(state_id);
CREATE INDEX IF NOT EXISTS idx_areas_is_active ON areas(is_active);

CREATE INDEX IF NOT EXISTS idx_departments_category ON departments(category);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

CREATE INDEX IF NOT EXISTS idx_issue_assignments_issue_id ON issue_assignments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_assignments_assigned_by ON issue_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_issue_assignments_assigned_to ON issue_assignments(assigned_to);

CREATE INDEX IF NOT EXISTS idx_profiles_assigned_area_id ON profiles(assigned_area_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_department_id ON profiles(assigned_department_id);

-- Create triggers for updated_at
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issue_assignments_updated_at BEFORE UPDATE ON issue_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
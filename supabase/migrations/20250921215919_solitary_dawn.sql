/*
  # Enhanced Tenders and Work Progress System

  1. Updates to existing tables
    - Add workflow_stage to tenders
    - Add contractor assignment fields
    - Add work progress tracking

  2. New Tables
    - `work_progress` - Track contractor work progress
    - `tender_documents` - Store tender-related documents

  3. Security
    - Enhanced RLS policies
    - Proper access controls
*/

-- Add missing columns to tenders table
DO $$
BEGIN
  -- Add workflow_stage if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'workflow_stage'
  ) THEN
    ALTER TABLE tenders ADD COLUMN workflow_stage text DEFAULT 'created' CHECK (workflow_stage IN ('created', 'available', 'bidding_closed', 'under_review', 'awarded', 'work_in_progress', 'work_completed', 'verified', 'completed'));
  END IF;

  -- Add source_issue_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'source_issue_id'
  ) THEN
    ALTER TABLE tenders ADD COLUMN source_issue_id uuid REFERENCES issues(id) ON DELETE SET NULL;
  END IF;

  -- Add department_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE tenders ADD COLUMN department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
  END IF;

  -- Add awarded_contractor_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'awarded_contractor_id'
  ) THEN
    ALTER TABLE tenders ADD COLUMN awarded_contractor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add work tracking fields if not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'work_started_at'
  ) THEN
    ALTER TABLE tenders ADD COLUMN work_started_at timestamptz;
  END IF;

  -- Rename awarded_to to match new naming convention
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'awarded_to'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'awarded_contractor_id'
  ) THEN
    ALTER TABLE tenders RENAME COLUMN awarded_to TO awarded_contractor_id;
  END IF;
END $$;

-- Create work_progress table
CREATE TABLE IF NOT EXISTS work_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid REFERENCES tenders(id) ON DELETE CASCADE NOT NULL,
  contractor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  progress_type text NOT NULL CHECK (progress_type IN ('start', 'update', 'milestone', 'completion')),
  title text NOT NULL,
  description text NOT NULL,
  progress_percentage integer CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  images text[], -- Array of image URLs
  materials_used text[],
  challenges_faced text,
  next_steps text,
  requires_verification boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  verification_notes text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tender_documents table
CREATE TABLE IF NOT EXISTS tender_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid REFERENCES tenders(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('specification', 'drawing', 'contract', 'amendment', 'progress_report', 'completion_certificate')),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  is_public boolean DEFAULT true,
  version integer DEFAULT 1,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE work_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_documents ENABLE ROW LEVEL SECURITY;

-- Work progress policies
CREATE POLICY "Contractors can manage own work progress"
  ON work_progress FOR ALL TO authenticated
  USING (contractor_id = auth.uid());

CREATE POLICY "Department admins can read work progress"
  ON work_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders t
      JOIN profiles p ON p.id = auth.uid()
      WHERE t.id = work_progress.tender_id 
      AND t.department_id = p.assigned_department_id
      AND p.user_type = 'department_admin'
    )
  );

CREATE POLICY "Department admins can verify work progress"
  ON work_progress FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenders t
      JOIN profiles p ON p.id = auth.uid()
      WHERE t.id = work_progress.tender_id 
      AND t.department_id = p.assigned_department_id
      AND p.user_type = 'department_admin'
    )
  );

CREATE POLICY "Admins can read all work progress"
  ON work_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type IN ('admin', 'area_super_admin')
    )
  );

-- Tender documents policies
CREATE POLICY "Anyone can read public tender documents"
  ON tender_documents FOR SELECT TO authenticated
  USING (is_public = true);

CREATE POLICY "Authorized users can upload documents"
  ON tender_documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type IN ('admin', 'area_super_admin', 'department_admin', 'tender')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_progress_tender_id ON work_progress(tender_id);
CREATE INDEX IF NOT EXISTS idx_work_progress_contractor_id ON work_progress(contractor_id);
CREATE INDEX IF NOT EXISTS idx_work_progress_status ON work_progress(status);

CREATE INDEX IF NOT EXISTS idx_tender_documents_tender_id ON tender_documents(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_documents_document_type ON tender_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_tenders_source_issue_id ON tenders(source_issue_id);
CREATE INDEX IF NOT EXISTS idx_tenders_department_id ON tenders(department_id);
CREATE INDEX IF NOT EXISTS idx_tenders_awarded_contractor_id ON tenders(awarded_contractor_id);

-- Create triggers
CREATE TRIGGER update_work_progress_updated_at BEFORE UPDATE ON work_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tender_documents_updated_at BEFORE UPDATE ON tender_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle bid acceptance and tender awarding
CREATE OR REPLACE FUNCTION handle_bid_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a bid is accepted, update the tender
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE tenders 
    SET 
      awarded_contractor_id = NEW.user_id,
      awarded_amount = NEW.amount,
      awarded_at = now(),
      status = 'awarded',
      workflow_stage = 'awarded',
      updated_at = now()
    WHERE id = NEW.tender_id;

    -- Update related issue if exists
    UPDATE issues 
    SET 
      workflow_stage = 'contractor_assigned',
      status = 'in_progress',
      current_assignee_id = NEW.user_id,
      updated_at = now()
    WHERE id = (
      SELECT source_issue_id 
      FROM tenders 
      WHERE id = NEW.tender_id
    );
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for bid acceptance
DROP TRIGGER IF EXISTS handle_bid_acceptance_trigger ON bids;
CREATE TRIGGER handle_bid_acceptance_trigger
  AFTER UPDATE ON bids
  FOR EACH ROW
  EXECUTE FUNCTION handle_bid_acceptance();

-- Function to handle work progress completion
CREATE OR REPLACE FUNCTION handle_work_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When work progress is verified as completion
  IF NEW.status = 'approved' AND NEW.progress_type = 'completion' AND OLD.status != 'approved' THEN
    -- Update tender status
    UPDATE tenders 
    SET 
      status = 'completed',
      workflow_stage = 'verified',
      completion_date = CURRENT_DATE,
      updated_at = now()
    WHERE id = NEW.tender_id;

    -- Update related issue to resolved
    UPDATE issues 
    SET 
      status = 'resolved',
      workflow_stage = 'resolved',
      resolved_at = now(),
      actual_resolution_date = CURRENT_DATE,
      updated_at = now()
    WHERE id = (
      SELECT source_issue_id 
      FROM tenders 
      WHERE id = NEW.tender_id
    );
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for work completion
DROP TRIGGER IF EXISTS handle_work_completion_trigger ON work_progress;
CREATE TRIGGER handle_work_completion_trigger
  AFTER UPDATE ON work_progress
  FOR EACH ROW
  EXECUTE FUNCTION handle_work_completion();
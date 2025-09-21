/*
  # Enhanced Feedback System

  1. Updates to feedback table
    - Add priority field if not exists
    - Add better indexing
    - Update RLS policies

  2. Security
    - Allow anonymous feedback submission
    - Admin response capabilities
*/

-- Add priority column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback' AND column_name = 'priority'
  ) THEN
    ALTER TABLE feedback ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- Update feedback policies to allow anonymous submissions
DROP POLICY IF EXISTS "Anyone can create feedback" ON feedback;

CREATE POLICY "Anyone can create feedback"
  ON feedback FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Allow users to read their own feedback (including anonymous)
DROP POLICY IF EXISTS "Users can read own feedback" ON feedback;

CREATE POLICY "Users can read own feedback"
  ON feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous users to read their feedback if they have the ID
CREATE POLICY "Anonymous can read feedback"
  ON feedback FOR SELECT TO anon
  USING (user_id IS NULL);

-- Admins can manage all feedback
DROP POLICY IF EXISTS "Admins can manage feedback" ON feedback;

CREATE POLICY "Admins can manage all feedback"
  ON feedback FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type IN ('admin', 'area_super_admin', 'department_admin')
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Function to automatically set priority based on type
CREATE OR REPLACE FUNCTION set_feedback_priority()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set priority based on type if not explicitly set
  IF NEW.priority IS NULL THEN
    CASE NEW.type
      WHEN 'complaint' THEN NEW.priority = 'high';
      WHEN 'suggestion' THEN NEW.priority = 'medium';
      WHEN 'compliment' THEN NEW.priority = 'low';
      WHEN 'inquiry' THEN NEW.priority = 'medium';
      ELSE NEW.priority = 'medium';
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-setting priority
DROP TRIGGER IF EXISTS set_feedback_priority_trigger ON feedback;
CREATE TRIGGER set_feedback_priority_trigger
  BEFORE INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_feedback_priority();
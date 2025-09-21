/*
  # Enhanced CivicConnect Database Schema

  1. New Tables
    - `profiles` - Enhanced user profiles with detailed information
    - `issues` - Enhanced civic issues with better location tracking
    - `community_posts` - Community discussion posts
    - `tenders` - Government tenders for contractors
    - `bids` - Contractor bids on tenders
    - `feedback` - User feedback system
    - `municipal_officials` - Contact information for officials
    - `issue_updates` - Track issue status updates
    - `user_verifications` - Email verification tracking

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for different user types
    - Add verification requirements
*/

-- Create enhanced profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  user_type text NOT NULL DEFAULT 'user' CHECK (user_type IN ('user', 'admin', 'tender')),
  full_name text,
  first_name text,
  last_name text,
  phone text,
  address text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'India',
  avatar_url text,
  points integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  verification_token text,
  verification_sent_at timestamptz,
  verified_at timestamptz,
  last_login_at timestamptz,
  preferences jsonb DEFAULT '{}',
  notification_settings jsonb DEFAULT '{"email": true, "push": true, "sms": false}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enhanced issues table
CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('roads', 'utilities', 'environment', 'safety', 'parks', 'other')),
  subcategory text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'resolved', 'closed', 'rejected')),
  location_name text,
  address text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  area text,
  ward text,
  district text,
  images text[], -- Array of Cloudinary URLs
  attachments text[], -- Additional file attachments
  assigned_to text,
  assigned_department text,
  estimated_resolution_date date,
  actual_resolution_date date,
  resolution_notes text,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  views_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  is_anonymous boolean DEFAULT false,
  is_urgent boolean DEFAULT false,
  tags text[],
  metadata jsonb DEFAULT '{}',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create issue updates table for tracking status changes
CREATE TABLE IF NOT EXISTS issue_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  old_status text,
  new_status text NOT NULL,
  update_type text NOT NULL CHECK (update_type IN ('status_change', 'assignment', 'comment', 'resolution')),
  notes text,
  attachments text[],
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create issue comments table
CREATE TABLE IF NOT EXISTS issue_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_official boolean DEFAULT false,
  attachments text[],
  parent_comment_id uuid REFERENCES issue_comments(id) ON DELETE CASCADE,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create issue votes table
CREATE TABLE IF NOT EXISTS issue_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(issue_id, user_id)
);

-- Create enhanced community_posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'discussions' CHECK (category IN ('discussions', 'announcements', 'suggestions', 'events', 'polls')),
  tags text[],
  images text[],
  attachments text[],
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  is_official boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  event_date timestamptz,
  poll_options jsonb,
  poll_votes jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enhanced tenders table
CREATE TABLE IF NOT EXISTS tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  subcategory text,
  location text NOT NULL,
  area text,
  ward text,
  district text,
  estimated_budget_min decimal(15, 2),
  estimated_budget_max decimal(15, 2),
  deadline_date date NOT NULL,
  submission_deadline timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('draft', 'available', 'bidding_closed', 'under_review', 'awarded', 'in_progress', 'completed', 'cancelled')),
  requirements text[],
  documents text[], -- URLs to tender documents
  evaluation_criteria jsonb,
  awarded_to uuid REFERENCES profiles(id),
  awarded_amount decimal(15, 2),
  awarded_at timestamptz,
  completion_date date,
  performance_rating integer CHECK (performance_rating >= 1 AND performance_rating <= 5),
  performance_notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enhanced bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid REFERENCES tenders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount decimal(15, 2) NOT NULL,
  details text NOT NULL,
  timeline text,
  methodology text,
  team_details text,
  previous_experience text,
  documents text[], -- URLs to bid documents
  is_selected boolean DEFAULT false,
  evaluation_score decimal(5, 2),
  evaluation_notes text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn')),
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tender_id, user_id)
);

-- Create enhanced feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('complaint', 'suggestion', 'compliment', 'inquiry', 'bug_report')),
  subject text NOT NULL,
  message text NOT NULL,
  category text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  contact_email text,
  contact_phone text,
  attachments text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'under_review', 'responded', 'resolved', 'closed')),
  admin_response text,
  admin_notes text,
  responded_by uuid REFERENCES profiles(id),
  responded_at timestamptz,
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enhanced municipal_officials table
CREATE TABLE IF NOT EXISTS municipal_officials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  department text NOT NULL,
  sub_department text,
  email text,
  phone text,
  whatsapp_number text,
  office_address text,
  office_hours text,
  responsibilities text[],
  specializations text[],
  avatar_url text,
  bio text,
  languages_spoken text[],
  social_media jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user verifications table
CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  verification_type text NOT NULL CHECK (verification_type IN ('email', 'phone', 'identity')),
  verification_token text NOT NULL,
  verification_code text,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('issue_update', 'tender_update', 'community_post', 'system', 'reminder')),
  related_id uuid, -- Can reference issues, tenders, posts, etc.
  related_type text,
  is_read boolean DEFAULT false,
  is_sent boolean DEFAULT false,
  delivery_method text[] DEFAULT ARRAY['in_app'],
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipal_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Issues policies
CREATE POLICY "Anyone can read public issues"
  ON issues FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Verified users can create issues"
  ON issues FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_verified = true
    )
  );

CREATE POLICY "Users can update own issues"
  ON issues FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all issues"
  ON issues FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Issue updates policies
CREATE POLICY "Anyone can read public issue updates"
  ON issue_updates FOR SELECT TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can create issue updates"
  ON issue_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = updated_by);

-- Issue comments policies
CREATE POLICY "Anyone can read issue comments"
  ON issue_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Verified users can create comments"
  ON issue_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_verified = true
    )
  );

-- Issue votes policies
CREATE POLICY "Anyone can read issue votes"
  ON issue_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Verified users can vote"
  ON issue_votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_verified = true
    )
  );

-- Community posts policies
CREATE POLICY "Anyone can read community posts"
  ON community_posts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Verified users can create posts"
  ON community_posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_verified = true
    )
  );

-- Tenders policies
CREATE POLICY "Anyone can read available tenders"
  ON tenders FOR SELECT TO authenticated
  USING (status IN ('available', 'bidding_closed', 'awarded', 'completed'));

CREATE POLICY "Admins can manage tenders"
  ON tenders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Bids policies
CREATE POLICY "Contractors can read relevant bids"
  ON bids FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Verified contractors can create bids"
  ON bids FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'tender' AND is_verified = true
    )
  );

-- Feedback policies
CREATE POLICY "Users can read own feedback"
  ON feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create feedback"
  ON feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can manage feedback"
  ON feedback FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Municipal officials policies
CREATE POLICY "Anyone can read active officials"
  ON municipal_officials FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage officials"
  ON municipal_officials FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- User verifications policies
CREATE POLICY "Users can read own verifications"
  ON user_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own verifications"
  ON user_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Create comprehensive indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);

CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_issues_area ON issues(area);
CREATE INDEX IF NOT EXISTS idx_issues_ward ON issues(ward);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);

CREATE INDEX IF NOT EXISTS idx_issue_updates_issue_id ON issue_updates(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_votes_issue_id ON issue_votes(issue_id);

CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_category ON tenders(category);
CREATE INDEX IF NOT EXISTS idx_tenders_deadline ON tenders(deadline_date);
CREATE INDEX IF NOT EXISTS idx_tenders_area ON tenders(area);

CREATE INDEX IF NOT EXISTS idx_bids_tender_id ON bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Insert enhanced sample data
INSERT INTO municipal_officials (name, title, department, sub_department, email, phone, whatsapp_number, office_address, office_hours, responsibilities, specializations, bio, languages_spoken) VALUES
('John Smith', 'City Manager', 'Administration', 'Executive Office', 'john.smith@city.gov', '+1-555-0101', '+15550101', '123 City Hall, Main St, Room 201', 'Mon-Fri 9AM-5PM', ARRAY['City operations', 'Budget management', 'Policy implementation', 'Strategic planning'], ARRAY['Public administration', 'Urban planning', 'Budget management'], 'Experienced city manager with 15+ years in municipal governance', ARRAY['English', 'Spanish']),

('Sarah Johnson', 'Public Works Director', 'Public Works', 'Infrastructure', 'sarah.johnson@city.gov', '+1-555-0102', '+15550102', '456 Works Dept, Industrial Ave, Building A', 'Mon-Fri 8AM-4PM', ARRAY['Road maintenance', 'Water systems', 'Waste management', 'Traffic management'], ARRAY['Civil engineering', 'Infrastructure management', 'Environmental compliance'], 'Civil engineer specializing in municipal infrastructure development', ARRAY['English']),

('Mike Chen', 'Parks & Recreation Director', 'Parks & Recreation', 'Community Services', 'mike.chen@city.gov', '+1-555-0103', '+15550103', '789 Parks Office, Green St, Suite 100', 'Mon-Fri 9AM-5PM', ARRAY['Park maintenance', 'Recreation programs', 'Community events', 'Sports facilities'], ARRAY['Recreation management', 'Event planning', 'Community engagement'], 'Recreation specialist focused on community wellness and engagement', ARRAY['English', 'Mandarin']),

('Emily Davis', 'Environmental Services Manager', 'Environment', 'Sustainability', 'emily.davis@city.gov', '+1-555-0104', '+15550104', '321 Environmental Center, Eco Blvd, Floor 2', 'Mon-Fri 8AM-4PM', ARRAY['Environmental protection', 'Sustainability programs', 'Waste reduction', 'Green initiatives'], ARRAY['Environmental science', 'Sustainability planning', 'Climate action'], 'Environmental scientist dedicated to sustainable city development', ARRAY['English', 'French']),

('David Wilson', 'Public Safety Coordinator', 'Public Safety', 'Emergency Services', 'david.wilson@city.gov', '+1-555-0105', '+15550105', '654 Safety Office, Security St, Emergency Center', '24/7 Emergency Response', ARRAY['Emergency response', 'Safety programs', 'Community policing', 'Disaster preparedness'], ARRAY['Emergency management', 'Public safety', 'Crisis communication'], 'Public safety expert with emergency management certification', ARRAY['English']);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON tenders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_municipal_officials_updated_at BEFORE UPDATE ON municipal_officials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
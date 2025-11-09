-- ============================================================
-- BuildConnect Enhancement: Rating System & Additional Features
-- ============================================================
-- Features:
-- 1. Contractor rating system
-- 2. Project completion tracking
-- 3. Enhanced contractor profiles with stats
-- ============================================================

-- STEP 1: Create ratings table
-- ============================================================

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  builder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title VARCHAR(200),
  review_text TEXT,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  timeline_rating INTEGER CHECK (timeline_rating >= 1 AND timeline_rating <= 5),
  budget_rating INTEGER CHECK (budget_rating >= 1 AND budget_rating <= 5),
  would_hire_again BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one rating per project
  CONSTRAINT unique_project_rating UNIQUE(project_id, builder_id, contractor_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ratings_contractor ON ratings(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ratings_builder ON ratings(builder_id);
CREATE INDEX IF NOT EXISTS idx_ratings_project ON ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created ON ratings(created_at DESC);

-- ============================================================
-- STEP 2: Add rating-related columns to contractors table
-- ============================================================

ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_projects_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS communication_score DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timeline_score DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_score DECIMAL(3,2) DEFAULT 0;

-- ============================================================
-- STEP 3: Add project completion tracking
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_rated BOOLEAN DEFAULT false;

-- ============================================================
-- STEP 4: Create function to update contractor ratings
-- ============================================================

CREATE OR REPLACE FUNCTION update_contractor_ratings(p_contractor_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_rating DECIMAL(3,2);
  v_total_ratings INTEGER;
  v_quality DECIMAL(3,2);
  v_communication DECIMAL(3,2);
  v_timeline DECIMAL(3,2);
  v_budget DECIMAL(3,2);
  v_completed INTEGER;
BEGIN
  -- Calculate average ratings
  SELECT
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*),
    ROUND(AVG(quality_rating)::numeric, 2),
    ROUND(AVG(communication_rating)::numeric, 2),
    ROUND(AVG(timeline_rating)::numeric, 2),
    ROUND(AVG(budget_rating)::numeric, 2)
  INTO
    v_avg_rating,
    v_total_ratings,
    v_quality,
    v_communication,
    v_timeline,
    v_budget
  FROM ratings
  WHERE contractor_id = p_contractor_id;

  -- Count completed projects
  SELECT COUNT(*)
  INTO v_completed
  FROM projects
  WHERE awarded_to = p_contractor_id
    AND status = 'completed';

  -- Update contractor record
  UPDATE contractors
  SET
    average_rating = COALESCE(v_avg_rating, 0),
    total_ratings = COALESCE(v_total_ratings, 0),
    quality_score = COALESCE(v_quality, 0),
    communication_score = COALESCE(v_communication, 0),
    timeline_score = COALESCE(v_timeline, 0),
    budget_score = COALESCE(v_budget, 0),
    total_projects_completed = COALESCE(v_completed, 0),
    updated_at = NOW()
  WHERE user_id = p_contractor_id;

  RETURN json_build_object(
    'success', true,
    'average_rating', COALESCE(v_avg_rating, 0),
    'total_ratings', COALESCE(v_total_ratings, 0),
    'total_completed', COALESCE(v_completed, 0)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_contractor_ratings(UUID) TO authenticated;

-- ============================================================
-- STEP 5: Create function to submit rating
-- ============================================================

CREATE OR REPLACE FUNCTION submit_rating(
  p_project_id UUID,
  p_contractor_id UUID,
  p_rating INTEGER,
  p_review_title VARCHAR(200),
  p_review_text TEXT,
  p_quality_rating INTEGER,
  p_communication_rating INTEGER,
  p_timeline_rating INTEGER,
  p_budget_rating INTEGER,
  p_would_hire_again BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_builder_id UUID;
  v_rating_id UUID;
BEGIN
  -- Get builder ID from auth context
  v_builder_id := auth.uid();

  -- Verify the builder owns this project
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND builder_id = v_builder_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: You can only rate your own projects'
    );
  END IF;

  -- Verify project is awarded to this contractor
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND awarded_to = p_contractor_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This contractor was not awarded this project'
    );
  END IF;

  -- Insert or update rating
  INSERT INTO ratings (
    project_id,
    builder_id,
    contractor_id,
    rating,
    review_title,
    review_text,
    quality_rating,
    communication_rating,
    timeline_rating,
    budget_rating,
    would_hire_again
  )
  VALUES (
    p_project_id,
    v_builder_id,
    p_contractor_id,
    p_rating,
    p_review_title,
    p_review_text,
    p_quality_rating,
    p_communication_rating,
    p_timeline_rating,
    p_budget_rating,
    p_would_hire_again
  )
  ON CONFLICT (project_id, builder_id, contractor_id)
  DO UPDATE SET
    rating = p_rating,
    review_title = p_review_title,
    review_text = p_review_text,
    quality_rating = p_quality_rating,
    communication_rating = p_communication_rating,
    timeline_rating = p_timeline_rating,
    budget_rating = p_budget_rating,
    would_hire_again = p_would_hire_again,
    updated_at = NOW()
  RETURNING id INTO v_rating_id;

  -- Mark project as rated
  UPDATE projects
  SET is_rated = true
  WHERE id = p_project_id;

  -- Update contractor's rating stats
  PERFORM update_contractor_ratings(p_contractor_id);

  RETURN json_build_object(
    'success', true,
    'rating_id', v_rating_id,
    'message', 'Rating submitted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION submit_rating(UUID, UUID, INTEGER, VARCHAR, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN) TO authenticated;

-- ============================================================
-- STEP 6: Enable Row Level Security for ratings
-- ============================================================

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read ratings
CREATE POLICY "Ratings are viewable by everyone"
  ON ratings FOR SELECT
  USING (true);

-- Policy: Only builders can insert ratings for their projects
CREATE POLICY "Builders can rate their contractors"
  ON ratings FOR INSERT
  WITH CHECK (
    auth.uid() = builder_id
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND builder_id = auth.uid()
    )
  );

-- Policy: Builders can update their own ratings
CREATE POLICY "Builders can update their own ratings"
  ON ratings FOR UPDATE
  USING (auth.uid() = builder_id)
  WITH CHECK (auth.uid() = builder_id);

-- ============================================================
-- STEP 7: Add profile views tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Track view context
  context VARCHAR(50), -- 'bid_card', 'search', 'direct'
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_profile_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id, viewed_at DESC);

-- Enable RLS
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profile view stats"
  ON profile_views FOR SELECT
  USING (auth.uid() = viewed_profile_id OR auth.uid() = viewer_id);

CREATE POLICY "Authenticated users can log profile views"
  ON profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- ============================================================
-- STEP 8: Update existing contractor ratings (initial data)
-- ============================================================

-- Calculate ratings for all existing contractors
DO $$
DECLARE
  contractor_record RECORD;
BEGIN
  FOR contractor_record IN
    SELECT DISTINCT user_id FROM contractors
  LOOP
    PERFORM update_contractor_ratings(contractor_record.user_id);
  END LOOP;
END $$;

-- ============================================================
-- STEP 9: Create helpful views
-- ============================================================

-- View: Contractor stats with ratings
CREATE OR REPLACE VIEW contractor_stats AS
SELECT
  c.user_id,
  c.id as contractor_id,
  p.full_name,
  p.company_name,
  p.email,
  p.phone,
  c.specializations,
  c.experience_years,
  c.average_rating,
  c.total_ratings,
  c.total_projects_completed,
  c.quality_score,
  c.communication_score,
  c.timeline_score,
  c.budget_score,
  c.certifications,
  c.portfolio_url,
  c.bio,
  (
    SELECT COUNT(*)
    FROM bids b
    WHERE b.contractor_id = c.user_id AND b.status = 'accepted'
  ) as total_accepted_bids,
  (
    SELECT COUNT(*)
    FROM bids b
    WHERE b.contractor_id = c.user_id
  ) as total_bids_submitted,
  c.created_at,
  c.updated_at
FROM contractors c
JOIN profiles p ON c.user_id = p.id;

-- ============================================================
-- STEP 10: Create notification preferences table
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  email_on_bid_received BOOLEAN DEFAULT true,
  email_on_bid_accepted BOOLEAN DEFAULT true,
  email_on_bid_rejected BOOLEAN DEFAULT true,
  email_on_new_project BOOLEAN DEFAULT true,
  email_on_rating_received BOOLEAN DEFAULT true,
  email_on_message BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- SUCCESS MESSAGES
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Rating system created successfully!';
  RAISE NOTICE '✅ Contractor stats updated';
  RAISE NOTICE '✅ Profile views tracking enabled';
  RAISE NOTICE '✅ Notification preferences initialized';
  RAISE NOTICE '';
  RAISE NOTICE '📊 New Features Available:';
  RAISE NOTICE '   - submit_rating() function for builders to rate contractors';
  RAISE NOTICE '   - update_contractor_ratings() to recalculate stats';
  RAISE NOTICE '   - contractor_stats view for enhanced profiles';
  RAISE NOTICE '   - profile_views table for analytics';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Implement UI components for ratings and profiles';
END $$;

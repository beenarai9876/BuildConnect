-- ============================================================
-- CRITICAL FIX: Foreign Key Mismatch in Projects Table
-- This fixes the "awarded_to" constraint error when accepting bids
-- ============================================================

-- STEP 1: Drop the incorrect foreign key constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_awarded_to_fkey;

-- STEP 2: Add the correct foreign key constraint
-- awarded_to should reference profiles.id (not contractors.id)
-- because bids.contractor_id also references profiles.id
ALTER TABLE projects
  ADD CONSTRAINT projects_awarded_to_fkey
  FOREIGN KEY (awarded_to)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- STEP 3: Verify the fix
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'projects'
  AND kcu.column_name = 'awarded_to';

-- Should show: awarded_to -> profiles(id)

-- ============================================================
-- STEP 4: Add missing indexes for better performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_awarded_to ON projects(awarded_to);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_status ON bids(contractor_id, status);

-- ============================================================
-- STEP 5: Create helper function to safely accept bids
-- ============================================================

CREATE OR REPLACE FUNCTION accept_bid(
  p_bid_id UUID,
  p_project_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contractor_id UUID;
  v_result JSON;
BEGIN
  -- Get the contractor_id from the bid
  SELECT contractor_id INTO v_contractor_id
  FROM bids
  WHERE id = p_bid_id AND project_id = p_project_id;

  IF v_contractor_id IS NULL THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;

  -- Update the accepted bid status
  UPDATE bids
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_bid_id;

  -- Update project status and award
  UPDATE projects
  SET status = 'awarded', awarded_to = v_contractor_id, updated_at = NOW()
  WHERE id = p_project_id;

  -- Reject all other pending bids for this project
  UPDATE bids
  SET status = 'rejected', updated_at = NOW()
  WHERE project_id = p_project_id
    AND id != p_bid_id
    AND status = 'pending';

  -- Return success with details
  v_result := json_build_object(
    'success', true,
    'bid_id', p_bid_id,
    'project_id', p_project_id,
    'contractor_id', v_contractor_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error accepting bid: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_bid(UUID, UUID) TO authenticated;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraint fixed!';
  RAISE NOTICE '✅ awarded_to now correctly references profiles.id';
  RAISE NOTICE '✅ Helper function accept_bid created';
  RAISE NOTICE '✅ Performance indexes added';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now accept bids without errors!';
END $$;

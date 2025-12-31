-- ============================================================================
-- FIX: Create missing company_profile record
-- Date: 2025-12-31
-- Description: Inserts a default company_profile if it doesn't exist
-- ============================================================================

-- First, verify company_profile table structure
-- SELECT * FROM information_schema.columns WHERE table_name = 'company_profile';

-- Insert default profile for companies that don't have one
INSERT INTO company_profile (company_id, business_type, monthly_revenue_range, main_goal)
SELECT 
  c.id,
  'other',           -- default business type
  'up_to_5k',        -- default monthly revenue range
  'organize_cash_flow' -- default main goal
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_profile cp WHERE cp.company_id = c.id
);

-- Show created records
SELECT cp.*, c.name as company_name 
FROM company_profile cp 
JOIN companies c ON c.id = cp.company_id;

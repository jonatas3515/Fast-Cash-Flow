-- ============================================================================
-- FIX: financial_goals table - DROP and RECREATE with correct schema
-- Date: 2025-12-31
-- Description: Uses year (INTEGER) and month (INTEGER) columns as expected by code
-- ============================================================================

-- First, drop the table if it exists (with CASCADE to remove dependencies)
DROP TABLE IF EXISTS financial_goals CASCADE;

-- Create the table with correct structure (year and month as INTEGER)
CREATE TABLE financial_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_amount_cents BIGINT NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,  -- 1-12
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year, month)
);

-- Enable RLS
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Create simple permissive policy
CREATE POLICY "financial_goals_full_access" ON financial_goals
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON financial_goals TO authenticated;
GRANT ALL ON financial_goals TO anon;

-- Create function update_updated_at_column if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_financial_goals_updated_at ON financial_goals;
CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 'financial_goals table recreated with year/month INTEGER columns!' as status;

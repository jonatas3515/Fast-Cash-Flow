-- Fix RLS Policies for Fast Cash Flow
-- Execute this SQL in your Supabase SQL Editor

-- 1. Enable RLS on tables (if not already enabled)
ALTER TABLE IF EXISTS recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboard_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;

DROP POLICY IF EXISTS "Users can view their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can insert their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can update their own dashboard settings" ON dashboard_settings;

-- 3. Create recurring_expenses policies
CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own recurring expenses" ON recurring_expenses
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own recurring expenses" ON recurring_expenses
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own recurring expenses" ON recurring_expenses
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE owner_id = auth.uid()
        )
    );

-- 4. Create dashboard_settings policies
CREATE POLICY "Users can view their own dashboard settings" ON dashboard_settings
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own dashboard settings" ON dashboard_settings
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own dashboard settings" ON dashboard_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE owner_id = auth.uid()
        )
    );

-- 5. Grant necessary permissions
GRANT ALL ON recurring_expenses TO authenticated;
GRANT ALL ON dashboard_settings TO authenticated;

-- 6. Verify policies are active
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerlspolicy 
FROM pg_tables 
WHERE tablename IN ('recurring_expenses', 'dashboard_settings');

-- 7. Show created policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('recurring_expenses', 'dashboard_settings');

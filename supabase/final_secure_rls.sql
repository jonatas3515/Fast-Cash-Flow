-- FINAL SECURE RLS - Using the correct column name: "user"
-- Based on the image, the column is named "user" (not user_id)

-- Re-enable RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;

DROP POLICY IF EXISTS "Users can view their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can insert their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can update their own dashboard settings" ON dashboard_settings;

-- Create secure policies using the correct column name: "user"
CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE "user" = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own recurring expenses" ON recurring_expenses
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE "user" = auth.uid()
        )
    );

CREATE POLICY "Users can update their own recurring expenses" ON recurring_expenses
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE "user" = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own recurring expenses" ON recurring_expenses
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE "user" = auth.uid()
        )
    );

-- Dashboard settings policies
CREATE POLICY "Users can view their own dashboard settings" ON dashboard_settings
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE "user" = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own dashboard settings" ON dashboard_settings
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE "user" = auth.uid()
        )
    );

CREATE POLICY "Users can update their own dashboard settings" ON dashboard_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE "user" = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON recurring_expenses TO authenticated;
GRANT ALL ON dashboard_settings TO authenticated;

-- Show final status
SELECT '✅ Secure RLS enabled with correct column: "user"' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('recurring_expenses', 'dashboard_settings');

-- Show created policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('recurring_expenses', 'dashboard_settings');

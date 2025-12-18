-- FINAL CORRECT FIX - Using the correct column name from the image
-- Column name: user_id (not user_id as typed in the image)

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;

DROP POLICY IF EXISTS "Users can view their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can insert their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can update their own dashboard settings" ON dashboard_settings;

-- Create correct policies using user_id column
CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own recurring expenses" ON recurring_expenses
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own recurring expenses" ON recurring_expenses
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own recurring expenses" ON recurring_expenses
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
        )
    );

-- Dashboard settings policies
CREATE POLICY "Users can view their own dashboard settings" ON dashboard_settings
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own dashboard settings" ON dashboard_settings
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own dashboard settings" ON dashboard_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON recurring_expenses TO authenticated;
GRANT ALL ON dashboard_settings TO authenticated;

-- Show results
SELECT 'Final correct policies created using user_id column' as status;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('recurring_expenses', 'dashboard_settings');

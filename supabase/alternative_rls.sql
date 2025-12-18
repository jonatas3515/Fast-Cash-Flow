-- Alternative RLS policies - Different approaches
-- Try these if the direct column approach doesn't work

-- APPROACH 1: Using auth.uid() directly if there's a direct relationship
DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;

DROP POLICY IF EXISTS "Users can view their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can insert their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can update their own dashboard settings" ON dashboard_settings;

-- APPROACH 1A: If created_by is the user reference in companies
CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own recurring expenses" ON recurring_expenses
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own recurring expenses" ON recurring_expenses
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own recurring expenses" ON recurring_expenses
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE created_by = auth.uid()
        )
    );

-- Dashboard settings policies
CREATE POLICY "Users can view their own dashboard settings" ON dashboard_settings
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own dashboard settings" ON dashboard_settings
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own dashboard settings" ON dashboard_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE created_by = auth.uid()
        )
    );

-- APPROACH 1B: Alternative using session variable or company_users table
-- Uncomment if there's a company_users junction table
/*
CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );
*/

-- Grant permissions
GRANT ALL ON recurring_expenses TO authenticated;
GRANT ALL ON dashboard_settings TO authenticated;

-- Test query to see what happens
SELECT 'Alternative policies created' as status;

-- Complete fix for RLS issues - CORRECTED VERSION
-- Execute this entire script after checking companies table structure

-- 1. First, check if we need to add owner_id column or use user_id
-- (Run the check_companies_structure.sql first to verify)

-- 2. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT,
    amount_cents INTEGER NOT NULL,
    recurrence_type TEXT NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS dashboard_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    alert_negative_balance BOOLEAN DEFAULT false,
    alert_debt_threshold_cents INTEGER DEFAULT 500000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(company_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_company_id ON recurring_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_company_id ON dashboard_settings(company_id);

-- 4. Enable RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies
DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;

DROP POLICY IF EXISTS "Users can view their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can insert their own dashboard settings" ON dashboard_settings;
DROP POLICY IF EXISTS "Users can update their own dashboard settings" ON dashboard_settings;

-- 6. Create new policies for recurring_expenses
-- OPTION 1: If companies table has user_id column
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

-- 7. Create new policies for dashboard_settings
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

-- 8. Grant permissions
GRANT ALL ON recurring_expenses TO authenticated;
GRANT ALL ON dashboard_settings TO authenticated;

-- 9. Alternative: If the column name is different, uncomment and use these instead:
/*
-- If column is called 'admin_id':
CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE admin_id = auth.uid()
        )
    );

-- If column is called 'created_by':
CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE created_by = auth.uid()
        )
    );
*/

-- 10. Show results
SELECT 'Tables and policies created/updated successfully' as status;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('recurring_expenses', 'dashboard_settings');

-- Create missing tables if they don't exist

-- Create recurring_expenses table
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

-- Create dashboard_settings table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_company_id ON recurring_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_company_id ON dashboard_settings(company_id);

-- Enable RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;

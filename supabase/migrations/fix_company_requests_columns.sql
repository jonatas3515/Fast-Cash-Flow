-- Migration: Add missing approval columns to company_requests
-- Description: Ensures approved_by, approved_username, and approved_temp_password exist

DO $$ 
BEGIN
  -- Add approved_by if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'company_requests' 
                 AND column_name = 'approved_by') THEN
    ALTER TABLE public.company_requests ADD COLUMN approved_by TEXT;
  END IF;

  -- Add approved_username if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'company_requests' 
                 AND column_name = 'approved_username') THEN
    ALTER TABLE public.company_requests ADD COLUMN approved_username TEXT;
  END IF;

  -- Add approved_temp_password if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'company_requests' 
                 AND column_name = 'approved_temp_password') THEN
    ALTER TABLE public.company_requests ADD COLUMN approved_temp_password TEXT;
  END IF;

  -- Add approved_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'company_requests' 
                 AND column_name = 'approved_at') THEN
    ALTER TABLE public.company_requests ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

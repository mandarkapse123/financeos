-- FinanceOS v2 — Supabase Database Schema
-- Run this in Supabase Dashboard > SQL Editor (Click 'New query' -> Paste -> Run)

-- Enable UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create table with both state and full_state columns
CREATE TABLE IF NOT EXISTS financeos_state (
  id TEXT PRIMARY KEY DEFAULT 'primary_state',
  state JSONB DEFAULT '{}'::jsonb,
  full_state JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE financeos_state ADD COLUMN IF NOT EXISTS state JSONB DEFAULT '{}'::jsonb;
ALTER TABLE financeos_state ADD COLUMN IF NOT EXISTS full_state JSONB DEFAULT '{}'::jsonb;

-- 2. Safely add to Realtime publication only if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'financeos_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE financeos_state;
  END IF;
END $$;

-- 3. Set Public Access Policies (RLS)
ALTER TABLE financeos_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to financeos_state" ON financeos_state;
DROP POLICY IF EXISTS "Public access financeos_state" ON financeos_state;
CREATE POLICY "Allow all access to financeos_state" ON financeos_state FOR ALL USING (true) WITH CHECK (true);

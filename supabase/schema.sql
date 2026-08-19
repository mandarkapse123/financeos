-- FinanceOS v2 — Supabase Database Schema
-- Run this in Supabase Dashboard > SQL Editor (Click 'New query' -> Paste -> Run)

-- 1. Unified App State Sync Table (Realtime Synced across all devices)
CREATE TABLE IF NOT EXISTS financeos_state (
  id TEXT PRIMARY KEY DEFAULT 'current_state',
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for financeos_state
ALTER PUBLICATION supabase_realtime ADD TABLE financeos_state;

-- RLS: Allow full access with anon key for personal use
ALTER TABLE financeos_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access financeos_state" ON financeos_state;
CREATE POLICY "Public access financeos_state" ON financeos_state FOR ALL USING (true) WITH CHECK (true);

-- 2. Granular Expenses Table (for iPhone Quick-Add & Analytics)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Expenses',
  name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account TEXT DEFAULT 'HDFC Bank',
  km_reading NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access expenses" ON expenses;
CREATE POLICY "Public access expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- 3. Daily Log Table
CREATE TABLE IF NOT EXISTS daily_expenses (
  id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Expenses',
  payment_method TEXT DEFAULT 'UPI',
  note TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account TEXT DEFAULT 'HDFC Bank',
  km_reading NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE daily_expenses;
ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access daily_expenses" ON daily_expenses;
CREATE POLICY "Public access daily_expenses" ON daily_expenses FOR ALL USING (true) WITH CHECK (true);

-- 4. Income Table
CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Salary',
  frequency TEXT DEFAULT 'monthly',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account TEXT DEFAULT 'HDFC Bank',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE income;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access income" ON income;
CREATE POLICY "Public access income" ON income FOR ALL USING (true) WITH CHECK (true);

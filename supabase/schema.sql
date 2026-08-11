-- FinanceOS v2 — Supabase Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- PROFILES (extends Supabase Auth users)
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT '₹',
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================================
-- ACCOUNTS (multi-account / persona)
-- ========================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'business', 'joint', 'other')),
  is_default BOOLEAN DEFAULT FALSE,
  currency TEXT NOT NULL DEFAULT '₹',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

-- ========================================
-- INCOME
-- ========================================
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  date DATE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_income_account ON income(account_id);
CREATE INDEX idx_income_date ON income(date);

-- ========================================
-- EXPENSES
-- ========================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_account ON expenses(account_id);
CREATE INDEX idx_expenses_date ON expenses(date);

-- ========================================
-- SUBSCRIPTIONS
-- ========================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  cycle TEXT NOT NULL DEFAULT 'monthly',
  renewal_date DATE,
  category TEXT NOT NULL,
  icon TEXT DEFAULT '📱',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_account ON subscriptions(account_id);

-- ========================================
-- INVESTMENTS
-- ========================================
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  invested_amount DECIMAL(14,2) NOT NULL,
  current_value DECIMAL(14,2) NOT NULL,
  date DATE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  note TEXT DEFAULT '',
  ticker_symbol TEXT DEFAULT '',
  last_price_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_investments_account ON investments(account_id);

-- ========================================
-- GOALS
-- ========================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(14,2) NOT NULL,
  saved_amount DECIMAL(14,2) DEFAULT 0,
  monthly_contrib DECIMAL(12,2) DEFAULT 0,
  target_date DATE,
  color TEXT DEFAULT '#7c3aed',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_account ON goals(account_id);

-- ========================================
-- GOAL CONTRIBUTIONS
-- ========================================
CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contributions_goal ON goal_contributions(goal_id);

-- ========================================
-- DAILY EXPENSES
-- ========================================
CREATE TABLE IF NOT EXISTS daily_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT DEFAULT 'UPI',
  date DATE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_account ON daily_expenses(account_id);
CREATE INDEX idx_daily_date ON daily_expenses(date);

-- ========================================
-- RENT ENTRIES
-- ========================================
CREATE TABLE IF NOT EXISTS rent_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period TEXT NOT NULL,
  mode TEXT DEFAULT 'UPI',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rent_account ON rent_entries(account_id);

-- ========================================
-- RENT EXPENSES
-- ========================================
CREATE TABLE IF NOT EXISTS rent_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  paid_by TEXT DEFAULT 'Self',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rent_exp_account ON rent_expenses(account_id);

-- ========================================
-- RENT RECEIPTS (file metadata, actual files in Supabase Storage)
-- ========================================
CREATE TABLE IF NOT EXISTS rent_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rent_rec_account ON rent_receipts(account_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_receipts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Users can only access their own accounts
CREATE POLICY "Users can CRUD own accounts" ON accounts FOR ALL USING (user_id = auth.uid());

-- For all data tables, access is scoped through account ownership
CREATE OR REPLACE FUNCTION user_owns_account(acct_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM accounts WHERE id = acct_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Access own income" ON income FOR ALL USING (user_owns_account(account_id));
CREATE POLICY "Access own expenses" ON expenses FOR ALL USING (user_owns_account(account_id));
CREATE POLICY "Access own subscriptions" ON subscriptions FOR ALL USING (user_owns_account(account_id));
CREATE POLICY "Access own investments" ON investments FOR ALL USING (user_owns_account(account_id));
CREATE POLICY "Access own goals" ON goals FOR ALL USING (user_owns_account(account_id));
CREATE POLICY "Access own contributions" ON goal_contributions FOR ALL
  USING (EXISTS (SELECT 1 FROM goals g JOIN accounts a ON g.account_id = a.id WHERE g.id = goal_id AND a.user_id = auth.uid()));
CREATE POLICY "Access own daily" ON daily_expenses FOR ALL USING (user_owns_account(account_id));
CREATE POLICY "Access own rent" ON rent_entries FOR ALL USING (user_owns_account(account_id));
CREATE POLICY "Access own rent expenses" ON rent_expenses FOR ALL USING (user_owns_account(account_id));
CREATE POLICY "Access own receipts" ON rent_receipts FOR ALL USING (user_owns_account(account_id));

-- ========================================
-- STORAGE BUCKET for receipt uploads
-- ========================================
-- Run in Supabase Dashboard > Storage:
-- Create bucket: 'receipts' (public: false)
-- Policy: Users can upload/read/delete files in their own folder (user_id/)

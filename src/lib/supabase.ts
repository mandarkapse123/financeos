// FinanceOS v2 — Supabase Client & Sync Layer
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to check auth state
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// FinanceOS v2 — Supabase Client & Real-time Sync Layer
import { createClient } from '@supabase/supabase-js';
import type { AppState, ExpenseEntry } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vcuvteccdxvgxqokyytp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_N0xpfheWjNkafcoTfiytvA_cyF0XVEs';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Push entire AppState to Supabase financeos_state table
export async function pushStateToSupabase(state: AppState) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('financeos_state')
      .upsert({
        id: 'current_state',
        state: state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase pushState error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase pushState exception:', err);
    return false;
  }
}

// Pull latest AppState from Supabase financeos_state table
export async function pullStateFromSupabase(): Promise<AppState | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('financeos_state')
      .select('state, updated_at')
      .eq('id', 'current_state')
      .single();

    if (error || !data || !data.state) {
      return null;
    }
    return data.state as AppState;
  } catch (err) {
    console.error('Supabase pullState exception:', err);
    return null;
  }
}

// Real-time WebSocket Subscription for Multi-Device Instant Sync
export function subscribeToRealtimeState(onStateReceived: (remoteState: AppState) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('financeos_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'financeos_state',
        filter: 'id=eq.current_state',
      },
      (payload) => {
        if (payload.new && (payload.new as any).state) {
          onStateReceived((payload.new as any).state as AppState);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Direct Single Expense Insertion (Used by iPhone Shortcuts API)
export async function insertExpenseDirect(entry: {
  amount: number;
  category?: string;
  note?: string;
  date?: string;
  bankAccount?: string;
  kmReading?: number;
}) {
  if (!supabase) return null;
  try {
    const dateStr = entry.date || new Date().toISOString().substring(0, 10);
    const id = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newExpense = {
      id,
      amount: entry.amount,
      category: entry.category || 'Expenses',
      note: entry.note || '',
      name: entry.note || entry.category || 'Expense',
      date: dateStr,
      bank_account: entry.bankAccount || 'HDFC Bank',
      km_reading: entry.kmReading || null,
    };

    await supabase.from('expenses').insert(newExpense);
    return newExpense;
  } catch (err) {
    console.error('Supabase insertExpenseDirect error:', err);
    return null;
  }
}


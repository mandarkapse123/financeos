import { NextResponse } from 'next/server';
import { pullStateFromSupabase, pushStateToSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AppState, ExpenseEntry, DailyExpense } from '@/lib/types';

export const dynamic = 'force-dynamic';

function getNewId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get('amount') || searchParams.get('amt');
    if (!amountStr) {
      return NextResponse.json({ error: 'Missing amount parameter. Example: ?amount=250&category=Food&note=Lunch' }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
    }

    const category = searchParams.get('category') || searchParams.get('cat') || 'Expenses';
    const note = searchParams.get('note') || searchParams.get('description') || '';
    const bankAccount = searchParams.get('bank') || searchParams.get('bankAccount') || 'HDFC Bank';
    const dateStr = searchParams.get('date') || new Date().toISOString().substring(0, 10);
    const kmStr = searchParams.get('km') || searchParams.get('kmReading');
    const kmReading = kmStr ? parseFloat(kmStr) : undefined;

    return await handleQuickAdd({ amount, category, note, bankAccount, dateStr, kmReading });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const amount = parseFloat(body.amount || body.amt);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Missing or invalid amount' }, { status: 400 });
    }

    const category = body.category || body.cat || 'Expenses';
    const note = body.note || body.description || '';
    const bankAccount = body.bank || body.bankAccount || 'HDFC Bank';
    const dateStr = body.date || new Date().toISOString().substring(0, 10);
    const kmReading = body.kmReading || body.km ? parseFloat(body.kmReading || body.km) : undefined;

    return await handleQuickAdd({ amount, category, note, bankAccount, dateStr, kmReading });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

async function handleQuickAdd({
  amount,
  category,
  note,
  bankAccount,
  dateStr,
  kmReading,
}: {
  amount: number;
  category: string;
  note: string;
  bankAccount: string;
  dateStr: string;
  kmReading?: number;
}) {
  const id = getNewId('shortcut');
  const expenseEntry: ExpenseEntry = {
    id,
    accountId: 'default',
    bankAccount,
    name: category === 'Petrol' ? 'Petrol Fill' : (note || category),
    amount,
    category,
    date: dateStr,
    note,
    kmReading,
  };

  const dailyEntry: DailyExpense = {
    id,
    accountId: 'default',
    bankAccount,
    amount,
    category,
    paymentMethod: 'UPI',
    date: dateStr,
    note,
    kmReading,
  };

  if (isSupabaseConfigured) {
    const currentState = await pullStateFromSupabase();
    const stateToUpdate: AppState = currentState || {
      income: [],
      expenses: [],
      subscriptions: [],
      investments: [],
      goals: [],
      daily: [],
      rentEntries: [],
      rentExpenses: [],
      rentReceipts: [],
      accounts: [{ id: 'default', name: 'Personal', type: 'personal', isDefault: true, currency: '₹' }],
      currentAccountId: 'default',
      settings: { name: 'Mandar', currency: '₹', endpoint: '', openingBalances: {} },
    };

    stateToUpdate.expenses = [expenseEntry, ...(stateToUpdate.expenses || [])];
    stateToUpdate.daily = [dailyEntry, ...(stateToUpdate.daily || [])];

    await pushStateToSupabase(stateToUpdate);
  }

  return NextResponse.json({
    status: 'success',
    message: `✅ Logged ₹${amount.toLocaleString('en-IN')} for ${category} (${bankAccount})`,
    entry: expenseEntry,
  });
}
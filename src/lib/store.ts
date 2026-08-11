// FinanceOS v2 — localStorage Data Store with Supabase sync layer
'use client';

import { AppState, Account } from './types';

const STORAGE_KEY = 'financeos_v2';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

const DEFAULT_ACCOUNT: Account = {
  id: 'default',
  userId: 'local',
  name: 'Personal',
  type: 'personal',
  isDefault: true,
  currency: '₹',
  createdAt: new Date().toISOString(),
};

function getDefaultState(): AppState {
  return {
    settings: {
      name: 'Mandar',
      currency: '₹',
      endpoint: '',
      budgets: {},
    },
    accounts: [DEFAULT_ACCOUNT],
    currentAccountId: 'default',
    income: [],
    expenses: [],
    subscriptions: [],
    investments: [],
    goals: [],
    daily: [],
    rentEntries: [],
    rentExpenses: [],
    rentReceipts: [],
  };
}

// Try migrate from v1
function migrateV1(): Partial<AppState> | null {
  try {
    const v1 = localStorage.getItem('finos_v3');
    if (!v1) return null;
    const data = JSON.parse(v1);
    return {
      settings: data.settings || {},
      income: (data.income || []).map((i: Record<string, unknown>) => ({ ...i, accountId: 'default' })),
      expenses: (data.expenses || []).map((e: Record<string, unknown>) => ({ ...e, accountId: 'default' })),
      subscriptions: (data.subscriptions || []).map((s: Record<string, unknown>) => ({ ...s, accountId: 'default' })),
      investments: (data.investments || []).map((inv: Record<string, unknown>) => ({ ...inv, accountId: 'default' })),
      goals: (data.goals || []).map((g: Record<string, unknown>) => ({ ...g, accountId: 'default' })),
      daily: (data.daily || []).map((d: Record<string, unknown>) => ({ ...d, accountId: 'default' })),
    };
  } catch {
    return null;
  }
}

// Try migrate rent tracker v1
function migrateRentV1(): { rentEntries: AppState['rentEntries']; rentExpenses: AppState['rentExpenses']; rentReceipts: AppState['rentReceipts'] } | null {
  try {
    const rent = localStorage.getItem('rt_rent');
    const expenses = localStorage.getItem('rt_expense');
    const receipts = localStorage.getItem('rt_receipts');
    if (!rent && !expenses) return null;
    return {
      rentEntries: (rent ? JSON.parse(rent) : []).map((r: Record<string, unknown>) => ({ ...r, id: r.id || uid(), accountId: 'default' })),
      rentExpenses: (expenses ? JSON.parse(expenses) : []).map((e: Record<string, unknown>) => ({
        id: uid(),
        accountId: 'default',
        date: e.date,
        description: e.desc,
        amount: e.amount,
        category: e.cat || 'Other',
        paidBy: e.paidBy || 'Self',
      })),
      rentReceipts: (receipts ? JSON.parse(receipts) : []).map((r: Record<string, unknown>) => ({ ...r, id: r.id || uid(), accountId: 'default' })),
    };
  } catch {
    return null;
  }
}

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = getDefaultState();
    if (typeof window !== 'undefined') {
      this.load();
    }
  }

  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...getDefaultState(), ...parsed };
        
        // Auto deduplicate existing stored items by date + amount + category
        const cleanItems = <T extends { date?: string; amount: number; category?: string }>(arr: T[]): T[] => {
          const seen = new Set<string>();
          return (arr || []).filter(item => {
            const d = (item.date || '').substring(0, 10);
            const cat = (item.category || '').toLowerCase();
            const amt = item.amount;
            const key = `${d}_${amt}_${cat}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        if (this.state.expenses) this.state.expenses = cleanItems(this.state.expenses);
        if (this.state.daily) this.state.daily = cleanItems(this.state.daily);
      } else {
        // Try migrate from v1
        const v1 = migrateV1();
        if (v1) {
          this.state = { ...this.state, ...v1 };
        }
        const rentV1 = migrateRentV1();
        if (rentV1) {
          this.state = { ...this.state, ...rentV1 };
        }
        this.save();
      }
    } catch {
      // use defaults
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage full or unavailable
    }
    this.notify();
    this.pushToCloud();
  }

  private saveLocalStorageOnly() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {}
    this.notify();
  }

  pushToCloud() {
    if (typeof window === 'undefined') return;
    try {
      // 1. Push to server cloud endpoint /api/sync
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: this.state })
      }).catch(() => {});

      // 2. Also push to Google Apps Script endpoint if configured
      const endpoint = this.state.settings.endpoint;
      if (endpoint) {
        fetch(endpoint, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'syncFullState', fullState: this.state })
        }).catch(() => {});
      }
    } catch {
      // silent catch
    }
  }

  importFullState(remoteState: Partial<AppState>) {
    if (!remoteState || typeof remoteState !== 'object') return;
    try {
      let updated = false;

      if (Array.isArray(remoteState.investments) && remoteState.investments.length > 0) {
        this.state.investments = remoteState.investments;
        updated = true;
      }
      if (Array.isArray(remoteState.expenses) && remoteState.expenses.length > 0) {
        this.state.expenses = remoteState.expenses;
        updated = true;
      }
      if (Array.isArray(remoteState.daily) && remoteState.daily.length > 0) {
        this.state.daily = remoteState.daily;
        updated = true;
      }
      if (Array.isArray(remoteState.income) && remoteState.income.length > 0) {
        this.state.income = remoteState.income;
        updated = true;
      }
      if (Array.isArray(remoteState.goals) && remoteState.goals.length > 0) {
        this.state.goals = remoteState.goals;
        updated = true;
      }
      if (Array.isArray(remoteState.subscriptions) && remoteState.subscriptions.length > 0) {
        this.state.subscriptions = remoteState.subscriptions;
        updated = true;
      }
      if (Array.isArray(remoteState.rentEntries) && remoteState.rentEntries.length > 0) {
        this.state.rentEntries = remoteState.rentEntries;
        updated = true;
      }
      if (Array.isArray(remoteState.rentExpenses) && remoteState.rentExpenses.length > 0) {
        this.state.rentExpenses = remoteState.rentExpenses;
        updated = true;
      }
      if (Array.isArray(remoteState.rentReceipts) && remoteState.rentReceipts.length > 0) {
        this.state.rentReceipts = remoteState.rentReceipts;
        updated = true;
      }

      if (updated) {
        this.saveLocalStorageOnly();
      }
    } catch {
      // ignore
    }
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getState(): AppState {
    return this.state;
  }

  getCurrentAccountId(): string {
    return this.state.currentAccountId;
  }

  setCurrentAccount(accountId: string) {
    this.state.currentAccountId = accountId;
    this.save();
  }

  // Settings & Custom Categories
  updateSettings(partial: Partial<AppState['settings']>) {
    this.state.settings = { ...this.state.settings, ...partial };
    this.save();
  }

  addCustomCategory(category: string) {
    const trimmed = category.trim();
    if (!trimmed) return;
    const existing = this.state.settings.customCategories || [];
    if (!existing.includes(trimmed)) {
      this.state.settings.customCategories = [...existing, trimmed];
      this.save();
    }
  }

  toggleTheme() {
    const current = this.state.settings.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.state.settings.theme = next;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
      if (next === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    }
    this.save();
  }

  // Accounts
  getAccounts(): Account[] {
    return this.state.accounts;
  }

  addAccount(account: Omit<Account, 'id' | 'createdAt'>): Account {
    const newAcc: Account = { ...account, id: uid(), createdAt: new Date().toISOString() };
    this.state.accounts.push(newAcc);
    this.save();
    return newAcc;
  }

  deleteAccount(id: string) {
    if (id === 'default') return;
    this.state.accounts = this.state.accounts.filter(a => a.id !== id);
    // Remove all data for this account
    const filter = <T extends { accountId: string }>(arr: T[]) => arr.filter(i => i.accountId !== id);
    this.state.income = filter(this.state.income);
    this.state.expenses = filter(this.state.expenses);
    this.state.subscriptions = filter(this.state.subscriptions);
    this.state.investments = filter(this.state.investments);
    this.state.goals = filter(this.state.goals);
    this.state.daily = filter(this.state.daily);
    this.state.rentEntries = filter(this.state.rentEntries);
    this.state.rentExpenses = filter(this.state.rentExpenses);
    this.state.rentReceipts = filter(this.state.rentReceipts);
    if (this.state.currentAccountId === id) {
      this.state.currentAccountId = 'default';
    }
    this.save();
  }

  // Generic CRUD helpers scoped by current account
  private getForAccount<T extends { accountId: string }>(arr: T[]): T[] {
    return arr.filter(i => i.accountId === this.state.currentAccountId);
  }

  private upsert<T extends { id: string; accountId: string }>(arr: T[], item: T): T[] {
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) {
      arr[idx] = item;
    } else {
      arr.push({ ...item, accountId: this.state.currentAccountId });
    }
    return arr;
  }

  private remove<T extends { id: string }>(arr: T[], id: string): T[] {
    return arr.filter(x => x.id !== id);
  }

  // Income
  getIncome() { return this.getForAccount(this.state.income); }
  upsertIncome(item: AppState['income'][0]) { this.state.income = this.upsert(this.state.income, item); this.save(); }
  deleteIncome(id: string) { this.state.income = this.remove(this.state.income, id); this.save(); }

  // Cleanly Sync Google Sheet items (mirroring Google Sheet state, clearing removed rows, no duplicates)
  syncSheetItems(items: Array<{ id?: string; date: string; amount: number; category: string; note?: string; method?: string; kmReading?: number }>) {
    const accountId = this.state.currentAccountId;
    const deletedList = this.state.settings.deletedIds || [];

    const sheetDaily: AppState['daily'] = [];
    const sheetExpenses: AppState['expenses'] = [];

    (items || []).forEach((item, index) => {
      const amt = parseFloat(item.amount as any);
      if (isNaN(amt) || amt <= 0) return;

      const dateStr = item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const cat = item.category || 'Expenses';
      const note = item.note || '';
      const kmVal = item.kmReading ? parseFloat(item.kmReading as any) : undefined;
      const sheetId = `sheet_row_${index}_${dateStr}_${amt}_${cat}`;
      const signature = `${dateStr}_${amt}_${cat.toLowerCase()}`;

      // Skip if explicitly deleted by user in FinanceOS!
      if (deletedList.includes(sheetId) || deletedList.includes(signature)) {
        return;
      }

      sheetDaily.push({
        id: sheetId,
        accountId,
        amount: amt,
        category: cat,
        paymentMethod: item.method || 'UPI',
        date: dateStr,
        note: note,
        kmReading: kmVal,
      });

      sheetExpenses.push({
        id: sheetId,
        accountId,
        name: cat === 'Petrol' ? 'Petrol Fill' : (note || cat),
        amount: amt,
        category: cat,
        date: dateStr,
        note: note,
        kmReading: kmVal,
      });
    });

    // Replace sheet entries for this account with the exact new list from Google Sheet
    this.state.daily = [
      ...this.state.daily.filter(d => d.accountId !== accountId || !d.id.startsWith('sheet_')),
      ...sheetDaily
    ];

    this.state.expenses = [
      ...this.state.expenses.filter(e => e.accountId !== accountId || !e.id.startsWith('sheet_')),
      ...sheetExpenses
    ];

    this.save();
  }

  // Sync Investments from payload or sheet across devices
  syncInvestments(invList: AppState['investments']) {
    if (!Array.isArray(invList) || invList.length === 0) return;
    const accountId = this.state.currentAccountId;

    invList.forEach(inv => {
      const idx = this.state.investments.findIndex(i => i.id === inv.id || (i.name.toLowerCase() === inv.name.toLowerCase() && (i.isin || '') === (inv.isin || '')));
      if (idx >= 0) {
        this.state.investments[idx] = { ...this.state.investments[idx], ...inv, accountId };
      } else {
        this.state.investments.push({ ...inv, accountId });
      }
    });

    this.save();
  }

  // Expenses & Daily Unified Deletion
  getExpenses() { return this.getForAccount(this.state.expenses); }
  upsertExpense(item: AppState['expenses'][0]) { this.state.expenses = this.upsert(this.state.expenses, item); this.save(); }
  deleteExpense(id: string) {
    const target = this.state.expenses.find(e => e.id === id) || this.state.daily.find(d => d.id === id);
    if (target) {
      const dateStr = (target.date || '').substring(0, 10);
      const signature = `${dateStr}_${target.amount}_${(target.category || '').toLowerCase()}`;
      const deletedList = this.state.settings.deletedIds || [];
      if (!deletedList.includes(id)) deletedList.push(id);
      if (!deletedList.includes(signature)) deletedList.push(signature);
      this.state.settings.deletedIds = deletedList;
    }

    this.state.expenses = this.state.expenses.filter(x => x.id !== id);
    this.state.daily = this.state.daily.filter(x => x.id !== id);
    this.save();
  }

  // Subscriptions
  getSubscriptions() { return this.getForAccount(this.state.subscriptions); }
  upsertSubscription(item: AppState['subscriptions'][0]) { this.state.subscriptions = this.upsert(this.state.subscriptions, item); this.save(); }
  deleteSubscription(id: string) { this.state.subscriptions = this.remove(this.state.subscriptions, id); this.save(); }

  // Investments
  getInvestments() { return this.getForAccount(this.state.investments); }
  upsertInvestment(item: AppState['investments'][0]) { this.state.investments = this.upsert(this.state.investments, item); this.save(); }
  deleteInvestment(id: string) { this.state.investments = this.remove(this.state.investments, id); this.save(); }
  updateInvestmentPrices(updates: { id: string; currentValue: number }[]) {
    updates.forEach(u => {
      const inv = this.state.investments.find(i => i.id === u.id);
      if (inv) {
        inv.currentValue = u.currentValue;
        inv.lastPriceUpdate = new Date().toISOString();
      }
    });
    this.save();
  }

  // Goals
  getGoals() { return this.getForAccount(this.state.goals); }
  upsertGoal(item: AppState['goals'][0]) { this.state.goals = this.upsert(this.state.goals, item); this.save(); }
  deleteGoal(id: string) { this.state.goals = this.remove(this.state.goals, id); this.save(); }
  addContribution(goalId: string, contrib: { amount: number; date: string; note: string }) {
    const goal = this.state.goals.find(g => g.id === goalId);
    if (!goal) return;
    if (!goal.contributions) goal.contributions = [];
    goal.contributions.push({ id: uid(), ...contrib });
    goal.savedAmount = (goal.savedAmount || 0) + contrib.amount;
    this.save();
  }

  // Daily
  getDaily() { return this.getForAccount(this.state.daily); }
  upsertDaily(item: AppState['daily'][0]) { this.state.daily = this.upsert(this.state.daily, item); this.save(); }
  deleteDaily(id: string) { this.deleteExpense(id); }

  // Rent
  getRentEntries() { return this.getForAccount(this.state.rentEntries); }
  upsertRentEntry(item: AppState['rentEntries'][0]) { this.state.rentEntries = this.upsert(this.state.rentEntries, item); this.save(); }
  deleteRentEntry(id: string) { this.state.rentEntries = this.remove(this.state.rentEntries, id); this.save(); }

  getRentExpenses() { return this.getForAccount(this.state.rentExpenses); }
  upsertRentExpense(item: AppState['rentExpenses'][0]) { this.state.rentExpenses = this.upsert(this.state.rentExpenses, item); this.save(); }
  deleteRentExpense(id: string) { this.state.rentExpenses = this.remove(this.state.rentExpenses, id); this.save(); }

  getRentReceipts() { return this.getForAccount(this.state.rentReceipts); }
  addRentReceipt(receipt: Omit<AppState['rentReceipts'][0], 'id' | 'accountId'>) {
    this.state.rentReceipts.push({ ...receipt, id: uid(), accountId: this.state.currentAccountId });
    this.save();
  }
  deleteRentReceipt(id: string) { this.state.rentReceipts = this.remove(this.state.rentReceipts, id); this.save(); }

  // Export/Import
  exportJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(json: string) {
    try {
      const data = JSON.parse(json);
      this.state = { ...getDefaultState(), ...data };
      this.save();
      return true;
    } catch {
      return false;
    }
  }

  // Safe reset with auto-backup
  resetAllData(): string {
    const backup = this.exportJSON();
    this.state = getDefaultState();
    this.save();
    return backup;
  }

  // Load sample data
  loadSampleData() {
    const accId = this.state.currentAccountId;
    const month = () => {
      const n = new Date();
      return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
    };
    const m = month();

    this.state.income.push(
      { id: uid(), accountId: accId, name: 'Monthly Salary', amount: 120000, category: 'Salary', frequency: 'monthly', date: m + '-01', note: 'After tax' },
      { id: uid(), accountId: accId, name: 'Freelance Design', amount: 22000, category: 'Freelance', frequency: 'monthly', date: m + '-10', note: '' },
      { id: uid(), accountId: accId, name: 'Dividend Income', amount: 9500, category: 'Dividends', frequency: 'quarterly', date: m + '-01', note: 'MF dividends' },
    );

    this.state.expenses.push(
      { id: uid(), accountId: accId, name: 'Big Basket', amount: 11500, category: 'Food & Dining', date: m + '-03', note: '' },
      { id: uid(), accountId: accId, name: 'Protein + Vitamins', amount: 3800, category: 'Health Supplements', date: m + '-02', note: 'Optimum Nutrition' },
      { id: uid(), accountId: accId, name: 'Doctor Consult', amount: 1800, category: 'Medical', date: m + '-08', note: '' },
      { id: uid(), accountId: accId, name: 'Running Shoes', amount: 5500, category: 'Clothing & Shopping', date: m + '-12', note: 'Nike' },
      { id: uid(), accountId: accId, name: 'Electricity', amount: 2600, category: 'Utilities', date: m + '-05', note: '' },
      { id: uid(), accountId: accId, name: 'Petrol', amount: 3200, category: 'Transport', date: m + '-01', note: '' },
    );

    this.state.subscriptions.push(
      { id: uid(), accountId: accId, name: 'Netflix', amount: 649, cycle: 'monthly', renewalDate: m + '-22', category: 'Streaming', icon: '🎬', note: '4K UHD' },
      { id: uid(), accountId: accId, name: 'Spotify', amount: 119, cycle: 'monthly', renewalDate: m + '-15', category: 'Music', icon: '🎵', note: '' },
      { id: uid(), accountId: accId, name: 'iCloud 200GB', amount: 75, cycle: 'monthly', renewalDate: m + '-01', category: 'Cloud Storage', icon: '☁️', note: '' },
      { id: uid(), accountId: accId, name: 'YouTube Premium', amount: 189, cycle: 'monthly', renewalDate: m + '-27', category: 'Streaming', icon: '▶️', note: '' },
      { id: uid(), accountId: accId, name: 'Notion Pro', amount: 320, cycle: 'monthly', renewalDate: m + '-18', category: 'Productivity', icon: '📝', note: '' },
    );

    this.state.investments.push(
      { id: uid(), accountId: accId, name: 'HDFC Flexi Cap Fund', investedAmount: 360000, currentValue: 447000, type: 'Mutual Funds', date: '2023-04-01', goalId: '', note: 'SIP ₹10k/mo', tickerSymbol: '119551' },
      { id: uid(), accountId: accId, name: 'Zerodha Portfolio', investedAmount: 180000, currentValue: 238000, type: 'Stocks / Equity', date: '2022-09-01', goalId: '', note: '', tickerSymbol: '' },
      { id: uid(), accountId: accId, name: 'Bitcoin', investedAmount: 60000, currentValue: 82000, type: 'Crypto', date: '2023-02-01', goalId: '', note: '0.028 BTC', tickerSymbol: 'bitcoin' },
      { id: uid(), accountId: accId, name: 'SBI FD 7.1%', investedAmount: 200000, currentValue: 214200, type: 'Fixed Deposit', date: '2023-08-01', goalId: '', note: '' },
      { id: uid(), accountId: accId, name: 'PPF Account', investedAmount: 150000, currentValue: 162000, type: 'PPF / EPF', date: '2022-04-01', goalId: '', note: '15yr maturity' },
    );

    this.state.goals.push(
      { id: uid(), accountId: accId, name: 'New Car Fund 🚗', targetAmount: 800000, targetDate: '2027-06-01', monthlyContrib: 15000, savedAmount: 195000, color: '#7c3aed', note: 'Toyota / Tata', contributions: [] },
      { id: uid(), accountId: accId, name: 'Emergency Fund 🛡️', targetAmount: 600000, targetDate: '', monthlyContrib: 8000, savedAmount: 342000, color: '#10b981', note: '6 months expenses', contributions: [] },
      { id: uid(), accountId: accId, name: 'Europe Trip ✈️', targetAmount: 250000, targetDate: '2026-10-01', monthlyContrib: 12000, savedAmount: 55000, color: '#f59e0b', note: 'Paris · Rome · Amsterdam', contributions: [] },
    );

    // Daily expenses for last 30 days
    const cats = ['Food & Dining', 'Transport', 'Food & Dining', 'Personal Care', 'Entertainment'];
    const notes = ['Lunch', 'Uber', 'Dinner', 'Haircut', 'Movie'];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const n = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < n; j++) {
        const ri = Math.floor(Math.random() * cats.length);
        this.state.daily.push({
          id: uid(), accountId: accId, amount: Math.floor(Math.random() * 900) + 80,
          category: cats[ri], note: notes[ri],
          paymentMethod: ['UPI', 'Cash', 'Credit Card'][Math.floor(Math.random() * 3)],
          date: ds,
        });
      }
    }

    // Rent data from rent-tracker defaults
    this.state.rentEntries.push(
      { id: uid(), accountId: accId, date: '2025-08-05', amount: 24500, period: 'Aug 2025', mode: 'Bank Transfer', notes: '' },
      { id: uid(), accountId: accId, date: '2025-09-05', amount: 24500, period: 'Sep 2025', mode: 'UPI', notes: '' },
      { id: uid(), accountId: accId, date: '2025-10-05', amount: 24500, period: 'Oct 2025', mode: 'UPI', notes: '' },
      { id: uid(), accountId: accId, date: '2025-11-05', amount: 24500, period: 'Nov 2025', mode: 'Bank Transfer', notes: '' },
      { id: uid(), accountId: accId, date: '2025-12-05', amount: 24500, period: 'Dec 2025', mode: 'UPI', notes: '' },
      { id: uid(), accountId: accId, date: '2026-01-05', amount: 24500, period: 'Jan 2026', mode: 'UPI', notes: '' },
      { id: uid(), accountId: accId, date: '2026-02-05', amount: 24500, period: 'Feb 2026', mode: 'UPI', notes: '' },
      { id: uid(), accountId: accId, date: '2026-03-05', amount: 24500, period: 'Mar 2026', mode: 'UPI', notes: '' },
      { id: uid(), accountId: accId, date: '2026-04-05', amount: 24500, period: 'Apr 2026', mode: 'UPI', notes: '' },
      { id: uid(), accountId: accId, date: '2026-05-05', amount: 24500, period: 'May 2026', mode: 'Bank Transfer', notes: '' },
      { id: uid(), accountId: accId, date: '2026-06-05', amount: 24500, period: 'Jun 2026', mode: 'UPI', notes: '' },
      { id: uid(), accountId: accId, date: '2026-07-05', amount: 27000, period: 'Jul 2026', mode: 'UPI', notes: 'Rate revised to ₹27k' },
    );

    this.state.rentExpenses.push(
      { id: uid(), accountId: accId, date: '2025-09-14', description: 'Tap Repair', amount: 850, category: 'Plumbing', paidBy: 'Self' },
      { id: uid(), accountId: accId, date: '2025-11-20', description: 'Painting – Living room', amount: 5200, category: 'Painting', paidBy: 'Self' },
      { id: uid(), accountId: accId, date: '2026-02-10', description: 'Geyser repair', amount: 1400, category: 'Electrical', paidBy: 'Self' },
    );

    this.save();
  }
}

// Singleton
let storeInstance: Store | null = null;
export function getStore(): Store {
  if (!storeInstance) {
    storeInstance = new Store();
  }
  return storeInstance;
}

export function generateId(): string {
  return uid();
}

'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, sumAmounts, CATEGORY_COLORS, CATEGORY_ICONS, EXPENSE_CATEGORIES, formatDate } from '@/lib/utils';
import { ExpenseEntry } from '@/lib/types';
import { generateId } from '@/lib/store';
import { Edit3, Trash2, Plus, SlidersHorizontal, Fuel, X } from 'lucide-react';

export default function ExpensesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store, refresh } = useStore();
  const expenses = store.getExpenses();
  const daily = store.getDaily();
  const currency = state.settings.currency;
  const budgets = state.settings.budgets || {};

  const [modalOpen, setModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [customCatModalOpen, setCustomCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [selectedBank, setSelectedBank] = useState<'All' | 'HDFC Bank' | 'ICICI Bank' | 'SBI Bank'>('All');
  const [formCategory, setFormCategory] = useState<string>('Petrol');

  if (!mounted) return null;

  // All categories (default + custom)
  const allCategories = [
    ...EXPENSE_CATEGORIES,
    ...(state.settings.customCategories || [])
  ];

  // Combined expenses with STRICT DEDUPLICATION and deletion filtering
  const deletedList = state.settings.deletedIds || [];
  const seenKeys = new Set<string>();
  const rawCombined: ExpenseEntry[] = [
    ...expenses,
    ...daily.map(d => ({
      id: d.id,
      accountId: d.accountId,
      bankAccount: d.bankAccount,
      paidBy: d.paidBy,
      name: d.note || d.category,
      amount: d.amount,
      category: d.category,
      date: d.date,
      note: d.note,
      kmReading: d.kmReading,
    }))
  ];

  const allCombinedExpenses = rawCombined.filter(e => {
    if (!e || !e.amount) return false;
    if (e.id && deletedList.includes(e.id)) return false;
    if (e.id && e.id.startsWith('sheet_row_')) {
      const dateStr = (e.date || '').substring(0, 10);
      const catLower = (e.category || '').toLowerCase();
      const noteLower = (e.note || e.name || '').toLowerCase().trim();
      const sig = `${dateStr}_${e.amount}_${catLower}_${noteLower}`;
      if (deletedList.includes(sig)) return false;
    }

    if (e.id && seenKeys.has(e.id)) return false;
    if (e.id) seenKeys.add(e.id);
    return true;
  }).sort((a, b) => {
    const dComp = (b.date || '').localeCompare(a.date || '');
    if (dComp !== 0) return dComp;
    return (b.id || '').localeCompare(a.id || '');
  });

  const showKmColumn = selectedCat === 'Petrol' || selectedCat === 'Transport';

  // Petrol Specific Stats & Fuel Mileage Calculation
  const petrolLogs = allCombinedExpenses
    .filter(e => e.category === 'Petrol' || e.category === 'Transport')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const lastPetrol = petrolLogs[0];
  const prevPetrol = petrolLogs[1];

  const kmDifference = (lastPetrol?.kmReading && prevPetrol?.kmReading)
    ? (lastPetrol.kmReading - prevPetrol.kmReading)
    : null;

  // Fuel Mileage Calculation (assuming ~₹104 per liter reference price in INR, or amount / 1.2 in USD)
  const refFuelPrice = currency === '₹' ? 104 : 3.8;
  const estLitersFilled = lastPetrol ? (lastPetrol.amount / refFuelPrice) : 0;
  const estMileage = (kmDifference && kmDifference > 0 && estLitersFilled > 0)
    ? (kmDifference / estLitersFilled).toFixed(1)
    : null;

  const totalExpenses = allCombinedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCount = allCombinedExpenses.length;

  // Blinkit Specific Stats
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const thisMonthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const blinkitLogs = allCombinedExpenses.filter(e => {
    const isCat = e.category === 'Blinkit';
    const isNote = (e.name || e.note || '').toLowerCase().includes('blinkit');
    const isThisMonth = (e.date || '').substring(0, 7) === currentMonthStr;
    return (isCat || isNote) && isThisMonth;
  });

  const blinkitOrdersCount = blinkitLogs.length;
  const blinkitTotalSpend = blinkitLogs.reduce((sum, e) => sum + e.amount, 0);
  const blinkitBudget = budgets['Blinkit'] || 3000; // Default ₹3,000 budget
  const blinkitOverBudget = blinkitTotalSpend > blinkitBudget;
  const blinkitDiff = Math.abs(blinkitTotalSpend - blinkitBudget);

  const expenseByCategory = allCombinedExpenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  // Filtered view based on tab
  const filteredExpenses = allCombinedExpenses.filter(e => {
    const matchCat = selectedCat === 'All' || e.category === selectedCat;
    const matchBank = selectedBank === 'All' || (e.bankAccount || 'HDFC Bank') === selectedBank;
    return matchCat && matchBank;
  });

  const handleSaveExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cat = formData.get('category') as string;
    const km = formData.get('kmReading') as string;

    const item: ExpenseEntry = {
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
      bankAccount: (formData.get('bankAccount') as string) || 'HDFC Bank',
      paidBy: (formData.get('paidBy') as string) || state.settings.name || 'Mandar',
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      category: cat,
      date: formData.get('date') as string,
      note: formData.get('note') as string,
      kmReading: km ? parseFloat(km) : undefined,
    };
    store.upsertExpense(item);
    refresh();
    setModalOpen(false);
    setEditing(null);
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    store.addCustomCategory(newCatName.trim());
    refresh();
    setNewCatName('');
    setCustomCatModalOpen(false);
  };

  const handleSaveBudget = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBudgets = { ...budgets };
    allCategories.forEach(cat => {
      const val = formData.get(cat) as string;
      if (val) newBudgets[cat] = parseFloat(val);
    });
    store.updateSettings({ budgets: newBudgets });
    refresh();
    setBudgetModalOpen(false);
  };

  return (
    <div className="w-full space-y-6 text-white min-h-screen">
      {/* Top Bar Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expenses & Category Tracker</h1>
          <p className="text-gray-400 text-sm">Track category budgets, daily petrol fills & category tabs</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCustomCatModalOpen(true)}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            + Add Category
          </button>
          <button
            onClick={() => setBudgetModalOpen(true)}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            Set Budgets
          </button>
          <button
            onClick={() => { setEditing(null); setFormCategory('Petrol'); setModalOpen(true); }}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.25)]"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {/* DEDICATED PETROL TRACKER & MILEAGE GRID BOX */}
      <div className="bg-gradient-to-r from-rose-950/40 via-[#0e0e1c] to-purple-950/40 border border-rose-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⛽</span>
            <div>
              <h2 className="text-lg font-bold text-rose-300">Petrol Tracker & Fuel Mileage Stats</h2>
              <p className="text-xs text-rose-200/60">Monitored from your daily & expense logs</p>
            </div>
          </div>
          {lastPetrol && (
            <span className="bg-rose-500/20 text-rose-300 text-xs font-semibold px-3 py-1 rounded-full border border-rose-500/30">
              Last Fill: {formatDate(lastPetrol.date)}
            </span>
          )}
        </div>

        {lastPetrol ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">LAST FILL AMOUNT</span>
              <span className="text-xl font-bold text-rose-400 mt-1 block">
                {formatCurrency(lastPetrol.amount, currency)}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">{lastPetrol.note || 'Petrol Fill'}</span>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">DATE OF LAST FILL</span>
              <span className="text-base font-bold text-white mt-1 block">
                {formatDate(lastPetrol.date)}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">Log date</span>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">KM READING (ODOMETER)</span>
              <span className="text-xl font-bold text-purple-400 mt-1 block">
                {lastPetrol.kmReading ? `${lastPetrol.kmReading.toLocaleString()} km` : 'Not recorded'}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">Last logged reading</span>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">DISTANCE DRIVEN</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                {kmDifference !== null ? `+${kmDifference.toLocaleString()} km` : '—'}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">Since prior fill</span>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">EST. FUEL MILEAGE</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">
                {estMileage ? `${estMileage} km/L` : '—'}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">
                {estMileage ? `~${estLitersFilled.toFixed(1)}L filled` : 'Needs 2 fills'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            ⛽ No petrol fills recorded yet. Log an expense under category <strong>Petrol</strong> to see stats here!
          </div>
        )}
      </div>

      {/* DEDICATED BLINKIT TRACKER GRID BOX */}
      <div className="bg-gradient-to-r from-amber-950/30 via-[#0e0e1c] to-purple-950/30 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛍️</span>
            <div>
              <h2 className="text-lg font-bold text-amber-300">Blinkit & Quick Commerce Tracker</h2>
              <p className="text-xs text-amber-200/60">Monthly order count, total spending & budget alerts</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            blinkitOverBudget
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}>
            {blinkitOverBudget ? `⚠️ OVER BUDGET BY ${formatCurrency(blinkitDiff, currency)}` : `Within Monthly Budget (${formatCurrency(blinkitBudget, currency)})`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <span className="text-xs text-gray-400 font-medium block">ORDERS THIS MONTH</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              {blinkitOrdersCount} {blinkitOrdersCount === 1 ? 'Order' : 'Orders'}
            </span>
            <span className="text-[11px] text-gray-500 mt-1 block">Instant deliveries in {thisMonthLabel}</span>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <span className="text-xs text-gray-400 font-medium block">TOTAL BLINKIT SPEND</span>
            <span className="text-2xl font-bold text-rose-400 mt-1 block">
              {formatCurrency(blinkitTotalSpend, currency)}
            </span>
            <span className="text-[11px] text-gray-500 mt-1 block">Spent this month</span>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <span className="text-xs text-gray-400 font-medium block">MONTHLY BUDGET</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {formatCurrency(blinkitBudget, currency)}
            </span>
            <span className="text-[11px] text-gray-500 mt-1 block">Configurable in Set Budgets</span>
          </div>

          <div className={`border rounded-xl p-4 ${
            blinkitOverBudget ? 'bg-rose-950/40 border-rose-500/40' : 'bg-black/40 border-white/10'
          }`}>
            <span className="text-xs text-gray-400 font-medium block">BUDGET STATUS</span>
            <span className={`text-xl font-bold mt-1 block ${
              blinkitOverBudget ? 'text-rose-400 font-extrabold' : 'text-emerald-400'
            }`}>
              {blinkitOverBudget ? `Over by ${formatCurrency(blinkitDiff, currency)}` : `${formatCurrency(blinkitDiff, currency)} Left`}
            </span>
            <span className="text-[11px] text-gray-500 mt-1 block">
              {blinkitOverBudget ? '⚠️ Spending limit exceeded!' : 'Good standing'}
            </span>
          </div>
        </div>
      </div>

      {/* Clean 3 Metric Cards (Removed redundant duplicate Petrol Spend card) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total Expenses Logged</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(totalExpenses, currency)}</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total Entries Count</span>
          <p className="text-2xl font-bold text-white mt-1">{totalCount} items</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 uppercase font-semibold">Active Categories</span>
          <p className="text-2xl font-bold text-purple-400 mt-1">{Object.keys(expenseByCategory).length}</p>
        </div>
      </div>

      {/* CATEGORY TABS (SEPARATE TAB FOR EACH CATEGORY) */}
      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-semibold">Expenses List by Category & Bank</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Filter Bank:</span>
            {(['All', 'HDFC Bank', 'ICICI Bank', 'SBI Bank'] as const).map(b => (
              <button
                key={b}
                onClick={() => setSelectedBank(b)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedBank === b
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {b === 'All' ? 'All Banks' : b}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
          <button
            onClick={() => setSelectedCat('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCat === 'All'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All Expenses ({allCombinedExpenses.length})
          </button>

          {allCategories.map(cat => {
            const count = allCombinedExpenses.filter(e => e.category === cat).length;
            const icon = CATEGORY_ICONS[cat] || '📦';
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  selectedCat === cat
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{icon}</span>
                <span>{cat}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Expenses List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#141426] text-gray-400 text-[11px] uppercase font-semibold border-b border-white/10">
              <tr>
                <th className="p-3.5 pl-5 w-12 text-center text-gray-500 font-mono">Sr.</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Account</th>
                <th className="p-3.5">Name / Note</th>
                <th className="p-3.5">Category</th>
                {showKmColumn && <th className="p-3.5">KM Reading</th>}
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredExpenses.map((exp, idx) => {
                const isFuel = exp.category === 'Petrol' || exp.category === 'Transport';
                const kmDisplay = isFuel && exp.kmReading ? `⛽ ${exp.kmReading.toLocaleString()} km` : '—';

                return (
                  <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 pl-5 text-center text-xs font-mono text-gray-500 font-bold">{idx + 1}</td>
                    <td className="p-3.5 text-gray-400 text-xs">{formatDate(exp.date)}</td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          🏦 {exp.bankAccount || 'HDFC Bank'}
                        </span>
                        {exp.paidBy && (
                          <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            👤 {exp.paidBy}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-white text-xs">{exp.name || exp.note || '-'}</td>
                    <td className="p-3.5">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 border"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[exp.category] || '#94a3b8'}15`,
                          borderColor: `${CATEGORY_COLORS[exp.category] || '#94a3b8'}30`,
                          color: CATEGORY_COLORS[exp.category] || '#94a3b8',
                        }}
                      >
                        {CATEGORY_ICONS[exp.category] || '📦'} {exp.category}
                      </span>
                    </td>
                    {showKmColumn && (
                      <td className="p-3.5 text-xs font-mono text-purple-300 font-medium">
                        {kmDisplay}
                      </td>
                    )}
                    <td className="p-3.5 text-right font-bold text-rose-400 text-xs">
                      -{formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setEditing(exp); setFormCategory(exp.category); setModalOpen(true); }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-600/20 text-gray-400 hover:text-purple-300 border border-white/5 transition-colors"
                          title="Edit Expense"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => { store.deleteExpense(exp.id); store.deleteDaily(exp.id); refresh(); }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-gray-400 hover:text-rose-300 border border-white/5 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={showKmColumn ? 8 : 7} className="text-center py-8 text-gray-500 text-xs">
                    No expenses found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT EXPENSE */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">{editing ? 'Edit Expense' : 'Add Expense'}</h3>
            <form key={editing?.id || 'new_exp'} onSubmit={handleSaveExpense} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Expense Name / Note</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editing?.name || ''}
                  placeholder="e.g. Petrol fill, Grocery run"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Bank Account</label>
                  <select
                    name="bankAccount"
                    defaultValue={editing?.bankAccount || 'HDFC Bank'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    <option value="HDFC Bank">🏦 HDFC Bank</option>
                    <option value="ICICI Bank">🏦 ICICI Bank</option>
                    <option value="SBI Bank">🏦 SBI Bank</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Logged By (Member)</label>
                  <input
                    type="text"
                    name="paidBy"
                    defaultValue={editing?.paidBy || state.settings.name || 'Mandar'}
                    placeholder="e.g. Mandar, Pooja"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    name="amount"
                    required
                    defaultValue={editing?.amount || ''}
                    placeholder="2500"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <select
                    name="category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    {allCategories.map(c => (
                      <option key={c} value={c} className="bg-[#141426]">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(formCategory === 'Petrol' || formCategory === 'Transport') && (
                <div>
                  <label className="text-xs text-purple-300 font-semibold block mb-1">⛽ Odometer KM Reading (For Petrol)</label>
                  <input
                    type="number"
                    name="kmReading"
                    defaultValue={editing?.kmReading || ''}
                    placeholder="e.g. 79000"
                    className="w-full bg-purple-950/30 border border-purple-500/40 rounded-xl p-3 text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={(editing?.date || new Date().toISOString()).split('T')[0].split(' ')[0]}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  name="note"
                  defaultValue={editing?.note || ''}
                  placeholder="Additional notes..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SET BUDGETS */}
      {budgetModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold">Set Monthly Category Budgets</h3>
            <form onSubmit={handleSaveBudget} className="space-y-3 text-sm">
              {allCategories.map(cat => (
                <div key={cat} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold flex items-center gap-1 text-gray-300">
                    {CATEGORY_ICONS[cat] || '📦'} {cat}
                  </span>
                  <input
                    type="number"
                    name={cat}
                    defaultValue={budgets[cat] || ''}
                    placeholder="No limit"
                    className="w-36 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white text-right font-bold"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-purple-600 text-white text-xs"
                >
                  Save Budgets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM CATEGORY */}
      {customCatModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">Add Custom Expense Category</h3>
            <form onSubmit={handleAddCustomCategory} className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Gaming, Maintenance"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-purple-600 text-white"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

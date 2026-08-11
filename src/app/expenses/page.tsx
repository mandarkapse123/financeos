'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, sumAmounts, CATEGORY_COLORS, CATEGORY_ICONS, EXPENSE_CATEGORIES, formatDate } from '@/lib/utils';
import { ExpenseEntry, DailyExpense } from '@/lib/types';
import { generateId } from '@/lib/store';

export default function ExpensesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store, refresh } = useStore();
  const expenses = store.getExpenses();
  const daily = store.getDaily();
  const currency = state.settings.currency;
  const budgets = state.settings.budgets || {};

  if (!mounted) return null;

  const [modalOpen, setModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [customCatModalOpen, setCustomCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [formCategory, setFormCategory] = useState<string>('Petrol');

  // All categories (default + custom)
  const allCategories = [
    ...EXPENSE_CATEGORIES,
    ...(state.settings.customCategories || [])
  ];

  // Combined expenses (fixed + daily)
  const allCombinedExpenses = [
    ...expenses,
    ...daily.map(d => ({
      id: d.id,
      accountId: d.accountId,
      name: d.note || d.category,
      amount: d.amount,
      category: d.category,
      date: d.date,
      note: d.note,
      kmReading: d.kmReading,
    }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Petrol Specific Stats
  const petrolLogs = allCombinedExpenses
    .filter(e => e.category === 'Petrol' || e.category === 'Transport')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const lastPetrol = petrolLogs[0];
  const prevPetrol = petrolLogs[1];
  const kmDifference = (lastPetrol?.kmReading && prevPetrol?.kmReading)
    ? (lastPetrol.kmReading - prevPetrol.kmReading)
    : null;

  const totalExpenses = sumAmounts(expenses);
  const totalCount = expenses.length;

  const expenseByCategory = allCombinedExpenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  // Filtered view based on tab
  const filteredExpenses = selectedCat === 'All'
    ? allCombinedExpenses
    : allCombinedExpenses.filter(e => e.category === selectedCat);

  const handleSaveExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cat = formData.get('category') as string;
    const km = formData.get('kmReading') as string;

    const item: ExpenseEntry = {
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
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

      {/* DEDICATED PETROL TRACKER GRID BOX */}
      <div className="bg-gradient-to-r from-rose-950/40 via-[#0e0e1c] to-purple-950/40 border border-rose-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⛽</span>
            <div>
              <h2 className="text-lg font-bold text-rose-300">Petrol Tracker & Last Fill Stats</h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">LAST FILL AMOUNT</span>
              <span className="text-2xl font-bold text-rose-400 mt-1 block">
                {formatCurrency(lastPetrol.amount, currency)}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">{lastPetrol.note || 'Petrol Fill'}</span>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">DATE OF LAST FILL</span>
              <span className="text-lg font-bold text-white mt-1 block">
                {formatDate(lastPetrol.date)}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">{lastPetrol.name || 'Station'}</span>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">KM READING (ODOMETER)</span>
              <span className="text-2xl font-bold text-purple-400 mt-1 block">
                {lastPetrol.kmReading ? `${lastPetrol.kmReading.toLocaleString()} km` : 'Not recorded'}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">Last logged reading</span>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-gray-400 font-medium block">DISTANCED DRIVEN SINCE PREV</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                {kmDifference !== null ? `+${kmDifference.toLocaleString()} km` : '—'}
              </span>
              <span className="text-[11px] text-gray-500 mt-1 block">Calculated from prior reading</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            ⛽ No petrol fills recorded yet. Log an expense under category <strong>Petrol</strong> to see stats here!
          </div>
        )}
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total Expenses Logged</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(totalExpenses, currency)}</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 uppercase font-semibold">Entries Count</span>
          <p className="text-2xl font-bold text-white mt-1">{totalCount} items</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 uppercase font-semibold">Petrol Spend</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">
            {formatCurrency(expenseByCategory['Petrol'] || 0, currency)}
          </p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 uppercase font-semibold">Categories Active</span>
          <p className="text-2xl font-bold text-purple-400 mt-1">{Object.keys(expenseByCategory).length}</p>
        </div>
      </div>

      {/* CATEGORY TABS (SEPARATE TAB FOR EACH CATEGORY) */}
      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-semibold">Expenses List by Category</h3>
          <span className="text-xs text-gray-400">Select a category tab below to isolate views</span>
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
            <thead className="bg-[#141426] text-gray-400 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Name / Note</th>
                <th className="p-4">Category</th>
                <th className="p-4">KM Reading</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-gray-400 text-xs">{formatDate(exp.date)}</td>
                  <td className="p-4 font-medium">
                    {exp.name}
                    {exp.note && <span className="text-xs text-gray-500 block">{exp.note}</span>}
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[exp.category] || '#94a3b8'}20`,
                        color: CATEGORY_COLORS[exp.category] || '#94a3b8',
                      }}
                    >
                      {CATEGORY_ICONS[exp.category] || '📦'} {exp.category}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono text-purple-300">
                    {exp.kmReading ? `⛽ ${exp.kmReading.toLocaleString()} km` : '—'}
                  </td>
                  <td className="p-4 text-right font-bold text-rose-400">
                    -{formatCurrency(exp.amount, currency)}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        store.deleteExpense(exp.id);
                        store.deleteDaily(exp.id);
                        refresh();
                      }}
                      className="text-gray-500 hover:text-rose-400 p-1"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No expenses found in category "{selectedCat}".
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
            <h3 className="text-lg font-bold">
              {editing ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Expense Description / Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editing?.name || ''}
                  placeholder="e.g. Petrol fill, Dinner, Medicine"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <select
                    name="category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c} className="bg-[#141426]">
                        {CATEGORY_ICONS[c] || '📦'} {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    name="amount"
                    required
                    defaultValue={editing?.amount || ''}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white"
                  />
                </div>
              </div>

              {(formCategory === 'Petrol' || formCategory === 'Transport') && (
                <div className="bg-purple-950/30 border border-purple-500/30 p-3 rounded-xl">
                  <label className="text-xs text-purple-300 font-semibold block mb-1">
                    ⛽ Odometer / KM Reading
                  </label>
                  <input
                    type="number"
                    name="kmReading"
                    defaultValue={editing?.kmReading || ''}
                    placeholder="e.g. 45280"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={editing?.date || new Date().toISOString().split('T')[0]}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  name="note"
                  defaultValue={editing?.note || ''}
                  placeholder="Notes..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Save Expense
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
            <h3 className="text-lg font-bold">➕ Add Custom Category</h3>
            <form onSubmit={handleAddCustomCategory} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gym & Fitness, Subscriptions"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Add Category
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
            <form onSubmit={handleSaveBudget} className="space-y-3">
              {allCategories.map((c) => (
                <div key={c} className="flex items-center justify-between gap-4">
                  <span className="text-sm">{CATEGORY_ICONS[c] || '📦'} {c}</span>
                  <input
                    type="number"
                    name={c}
                    defaultValue={budgets[c] || ''}
                    placeholder="No limit"
                    className="w-32 bg-black/40 border border-white/10 rounded-xl p-2 text-sm text-white text-right"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Save Budgets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

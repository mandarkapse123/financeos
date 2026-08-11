'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, sumAmounts, CATEGORY_COLORS, EXPENSE_CATEGORIES } from '@/lib/utils';
import { ExpenseEntry } from '@/lib/types';
import { generateId } from '@/lib/store';

export default function ExpensesPage() {
  const { state, store, refresh } = useStore();
  const expenses = store.getExpenses();
  const currency = state.settings.currency;
  const budgets = state.settings.budgets || {};
  
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [filterCat, setFilterCat] = useState<string>('All');
  
  const totalExpenses = sumAmounts(expenses);
  const topCategory = expenses.length > 0 ? 
    Object.entries(expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0][0] : 'None';
  const totalCount = expenses.length;

  const expenseByCategory = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleSaveExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item = {
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      note: formData.get('note') as string,
    };
    store.upsertExpense(item);
    refresh();
    setModalOpen(false);
  };

  const handleSaveBudget = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBudgets = { ...budgets };
    EXPENSE_CATEGORIES.forEach(cat => {
      const val = formData.get(cat) as string;
      if (val) newBudgets[cat] = parseFloat(val);
    });
    store.updateSettings({ budgets: newBudgets });
    refresh();
    setBudgetModalOpen(false);
  };

  const filteredExpenses = filterCat === 'All' ? expenses : expenses.filter(e => e.category === filterCat);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      <div className="flex justify-between items-center bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold">Expenses & Budgets</h1>
          <p className="text-gray-400">Track your spending and manage budgets</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setBudgetModalOpen(true)} className="px-4 py-2 bg-[#1c1c30] rounded-lg font-medium border border-white/[0.07]">
            Set Budgets
          </button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg font-medium">
            + Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Expenses', val: formatCurrency(totalExpenses, currency) },
          { label: 'Top Spending Category', val: topCategory },
          { label: 'Total Transactions', val: totalCount },
        ].map(m => (
          <div key={m.label} className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-sm text-gray-400">{m.label}</h3>
            <p className="text-2xl font-semibold mt-1 text-rose-400">{m.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {EXPENSE_CATEGORIES.map(cat => {
            const spent = expenseByCategory[cat] || 0;
            const budget = budgets[cat] || 0;
            const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            if (spent === 0 && budget === 0) return null;
            return (
              <div key={cat} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm" style={{ color: CATEGORY_COLORS[cat] || '#fff' }}>{cat}</span>
                  <span className="text-xs text-gray-400">{formatCurrency(spent, currency)} {budget > 0 && `/ ${formatCurrency(budget, currency)}`}</span>
                </div>
                {budget > 0 && (
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: pct > 90 ? '#ef4444' : CATEGORY_COLORS[cat] || '#3b82f6' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Expense History</h3>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="bg-[#1c1c30] border border-white/[0.07] rounded-lg p-2 text-sm text-white">
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🛍️</div>
            <p className="text-gray-400">No expenses found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-white/[0.07]">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-medium">
                      {e.name}
                      {e.note && <p className="text-xs text-gray-500">{e.note}</p>}
                    </td>
                    <td className="py-3 text-rose-400 font-semibold">{formatCurrency(e.amount, currency)}</td>
                    <td className="py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10" style={{ color: CATEGORY_COLORS[e.category] || '#fff' }}>
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-400">{e.date}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => { setEditing(e); setModalOpen(true); }} className="text-sm text-purple-400 hover:text-purple-300">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Expense</h2>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input required name="name" defaultValue={editing?.name || ''} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount</label>
                  <input required type="number" step="0.01" name="amount" defaultValue={editing?.amount || ''} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select name="category" defaultValue={editing?.category || EXPENSE_CATEGORIES[0]} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date</label>
                  <input required type="date" name="date" defaultValue={editing?.date || new Date().toISOString().split('T')[0]} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Note (Optional)</label>
                  <input name="note" defaultValue={editing?.note || ''} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-[#1c1c30] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {budgetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Set Monthly Budgets</h2>
            <form onSubmit={handleSaveBudget} className="space-y-3">
              {EXPENSE_CATEGORIES.map(cat => (
                <div key={cat} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                  <span className="text-sm font-medium" style={{ color: CATEGORY_COLORS[cat] || '#fff' }}>{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{currency}</span>
                    <input type="number" step="100" name={cat} defaultValue={budgets[cat] || ''} placeholder="No limit" className="w-24 bg-[#0e0e1c] border border-white/10 rounded-md p-1.5 text-right text-white text-sm" />
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-3 mt-6 sticky bottom-0 bg-[#0e0e1c] pt-4">
                <button type="button" onClick={() => setBudgetModalOpen(false)} className="px-4 py-2 bg-[#1c1c30] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg font-medium">Save Budgets</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

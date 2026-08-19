'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, formatDate, CATEGORY_ICONS, CATEGORY_COLORS, EXPENSE_CATEGORIES } from '@/lib/utils';
import { DailyExpense } from '@/lib/types';
import { generateId } from '@/lib/store';

export default function DailyPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store, refresh } = useStore();
  const rawDaily = store.getDaily();
  const rawExpenses = store.getExpenses();
  const currency = state.settings.currency || '₹';
  const deletedList = state.settings.deletedIds || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DailyExpense | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>('All');

  if (!mounted) return null;

  // Single Master Source of Truth: Combine rawDaily + rawExpenses with STRICT UNIQUE DEDUPLICATION & DELETION BLACKLIST
  const seenIds = new Set<string>();
  const seenSigs = new Set<string>();
  const rawCombined = [
    ...rawDaily,
    ...rawExpenses.map(e => ({
      id: e.id,
      accountId: e.accountId,
      bankAccount: e.bankAccount,
      amount: e.amount,
      category: e.category,
      paymentMethod: 'UPI',
      date: e.date,
      note: e.name || e.note,
      kmReading: e.kmReading,
    }))
  ];

  const masterDailyLogs = rawCombined.filter(d => {
    if (!d || !d.amount) return false;
    const dateStr = (d.date || '').substring(0, 10);
    const catLower = (d.category || '').toLowerCase();
    const noteLower = (d.note || '').toLowerCase().trim();
    const signature = `${dateStr}_${d.amount}_${catLower}_${noteLower}`;

    // Skip if explicitly deleted by user in FinanceOS!
    if (deletedList.includes(d.id) || deletedList.includes(signature)) {
      return false;
    }

    if (d.id && seenIds.has(d.id)) return false;
    if (d.id) seenIds.add(d.id);

    if (seenSigs.has(signature)) return false;
    seenSigs.add(signature);
    return true;
  }).sort((a, b) => {
    const dComp = (b.date || '').localeCompare(a.date || '');
    if (dComp !== 0) return dComp;
    return (b.id || '').localeCompare(a.id || '');
  });

  const todayStr = new Date().toISOString().substring(0, 10);
  const todaysLog = masterDailyLogs.filter(d => (d.date || '').startsWith(todayStr));
  const todaysTotal = todaysLog.reduce((sum, d) => sum + d.amount, 0);

  const totalSpend = masterDailyLogs.reduce((sum, d) => sum + d.amount, 0);
  const avgSpend = masterDailyLogs.length ? (totalSpend / masterDailyLogs.length) : 0;

  // Filtered view based on tab
  const filteredLogs = selectedCat === 'All'
    ? masterDailyLogs
    : masterDailyLogs.filter(d => d.category === selectedCat);

  // Heatmap generation
  const heatData: Record<string, number> = {};
  masterDailyLogs.forEach(d => {
    const dt = (d.date || '').split('T')[0];
    if (dt) heatData[dt] = (heatData[dt] || 0) + d.amount;
  });

  const maxDaily = Math.max(1, ...Object.values(heatData));
  const weeks = 27;
  const days = 7;
  const heatmapCells = [];
  const start = new Date();
  start.setDate(start.getDate() - (weeks * days - 1));

  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < days; d++) {
      const dateStr = new Date(start.getTime() + (w * days + d) * 86400000).toISOString().split('T')[0];
      const val = heatData[dateStr] || 0;
      let level = 0;
      if (val > 0) {
        const ratio = val / maxDaily;
        if (ratio < 0.25) level = 1;
        else if (ratio < 0.5) level = 2;
        else if (ratio < 0.75) level = 3;
        else level = 4;
      }
      col.push({ date: dateStr, level, val });
    }
    heatmapCells.push(col);
  }

  const getLevelColor = (level: number) => {
    if (level === 0) return '#1c1c30';
    if (level === 1) return 'rgba(124,58,237,0.22)';
    if (level === 2) return 'rgba(124,58,237,0.45)';
    if (level === 3) return 'rgba(124,58,237,0.68)';
    return 'rgba(124,58,237,0.9)';
  };

  const handleSaveDaily = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amt = parseFloat(formData.get('amount') as string);
    const cat = formData.get('category') as string;
    const km = formData.get('kmReading') as string;

    const bankAcc = (formData.get('bankAccount') as string) || 'HDFC Bank';

    const item: DailyExpense = {
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
      bankAccount: bankAcc,
      amount: parseFloat(formData.get('amount') as string),
      category: cat,
      paymentMethod: formData.get('paymentMethod') as string || 'UPI',
      date: formData.get('date') as string,
      note: formData.get('note') as string || '',
      kmReading: km ? parseFloat(km) : undefined,
    };

    store.upsertDaily(item);
    store.upsertExpense({
      id: item.id,
      accountId: item.accountId,
      bankAccount: bankAcc,
      name: item.note || item.category,
      amount: item.amount,
      category: item.category,
      date: item.date,
      note: item.note,
      kmReading: item.kmReading,
    });

    refresh();
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    store.deleteDaily(id);
    refresh();
  };

  const allCategories = [
    ...EXPENSE_CATEGORIES,
    ...(state.settings.customCategories || [])
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Expense Logs & iPhone Sync</h1>
          <p className="text-gray-400 text-sm">All entries logged via iPhone Back Tap, Shortcuts, or Web</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
        >
          + Log Expense
        </button>
      </div>

      {/* 4 Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl">
          <span className="text-xs text-gray-400 font-semibold uppercase">Today's Spend</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(todaysTotal, currency)}</p>
          <span className="text-[11px] text-gray-500 mt-1 block">{todaysLog.length} items logged today</span>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl">
          <span className="text-xs text-gray-400 font-semibold uppercase">Avg Daily Spend</span>
          <p className="text-2xl font-bold text-purple-400 mt-1">{formatCurrency(avgSpend, currency)}</p>
          <span className="text-[11px] text-gray-500 mt-1 block">Across active log days</span>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl">
          <span className="text-xs text-gray-400 font-semibold uppercase">Total Logs Count</span>
          <p className="text-2xl font-bold text-white mt-1">{masterDailyLogs.length} items</p>
          <span className="text-[11px] text-gray-500 mt-1 block">Deduplicated active logs</span>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl">
          <span className="text-xs text-gray-400 font-semibold uppercase">Total Logged Spend</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(totalSpend, currency)}</p>
          <span className="text-[11px] text-gray-500 mt-1 block">Lifetime daily logs</span>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-[#0e0e1c] border border-white/[0.07] p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Activity Heatmap (Last 27 Weeks)</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-[#1c1c30]" />
              <div className="w-3 h-3 rounded-sm bg-purple-900/40" />
              <div className="w-3 h-3 rounded-sm bg-purple-700/60" />
              <div className="w-3 h-3 rounded-sm bg-purple-500" />
            </div>
            <span>More</span>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
          {heatmapCells.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((cell, cIdx) => (
                <div
                  key={cIdx}
                  title={`${cell.date}: ${cell.val ? formatCurrency(cell.val, currency) : 'No spend'}`}
                  className="w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 cursor-pointer"
                  style={{ backgroundColor: getLevelColor(cell.level) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Combined Log Table with Category Tabs */}
      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-lg">Full Transaction Log (iPhone + Web)</h3>
          <span className="text-xs text-gray-400">Filtered & deduplicated logs</span>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
          <button
            onClick={() => setSelectedCat('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCat === 'All'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All Logs ({masterDailyLogs.length})
          </button>

          {allCategories.map(cat => {
            const count = masterDailyLogs.filter(d => d.category === cat).length;
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

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#141426] text-gray-400 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4 w-12 text-center text-white/40">#</th>
                <th className="p-4">Date</th>
                <th className="p-4">Account</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description / Note</th>
                <th className="p-4">Payment Method</th>
                {(selectedCat === 'Petrol' || selectedCat === 'Transport') && <th className="p-4">KM Reading</th>}
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredLogs.map((d, idx) => {
                const isFuel = d.category === 'Petrol' || d.category === 'Transport';
                const kmDisplay = isFuel && d.kmReading ? `⛽ ${d.kmReading.toLocaleString()} km` : '—';

                return (
                  <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-center text-xs font-mono text-white/40 font-bold">#{idx + 1}</td>
                    <td className="p-4 text-gray-400 text-xs">{formatDate(d.date)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => { setEditing(d); setModalOpen(true); }}
                        className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
                        title="Click to edit bank account"
                      >
                        🏦 {d.bankAccount || 'HDFC Bank'}
                      </button>
                    </td>
                    <td className="p-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[d.category] || '#94a3b8'}20`,
                          color: CATEGORY_COLORS[d.category] || '#94a3b8',
                        }}
                      >
                        {CATEGORY_ICONS[d.category] || '📦'} {d.category}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{d.note || '-'}</td>
                    <td className="p-4 text-xs font-semibold text-purple-300">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">
                        {d.paymentMethod || 'UPI'}
                      </span>
                    </td>
                    {(selectedCat === 'Petrol' || selectedCat === 'Transport') && (
                      <td className="p-4 text-xs font-mono text-purple-300">
                        {kmDisplay}
                      </td>
                    )}
                    <td className="p-4 text-right font-bold text-rose-400">
                      -{formatCurrency(d.amount, currency)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setEditing(d); setModalOpen(true); }}
                          className="text-gray-400 hover:text-purple-300 p-1.5 transition-colors"
                          title="Edit log & bank account"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="text-gray-400 hover:text-rose-400 p-1.5 transition-colors"
                          title="Delete permanently"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No daily expenses logged in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LOG DAILY EXPENSE */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">{editing ? 'Edit Daily Log' : 'Log Daily Expense'}</h3>
            <form key={editing?.id || 'new_daily'} onSubmit={handleSaveDaily} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-purple-300 font-semibold block mb-1">🏦 Bank Account</label>
                <select
                  name="bankAccount"
                  defaultValue={editing?.bankAccount || 'HDFC Bank'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-medium"
                >
                  <option value="HDFC Bank" className="bg-[#141426]">🏦 HDFC Bank</option>
                  <option value="ICICI Bank" className="bg-[#141426]">🏦 ICICI Bank</option>
                  <option value="SBI Bank" className="bg-[#141426]">🏦 SBI Bank</option>
                </select>
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
                    placeholder="250"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editing?.category || 'Blinkit'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    {allCategories.map(c => (
                      <option key={c} value={c} className="bg-[#141426]">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Payment Method</label>
                <select
                  name="paymentMethod"
                  defaultValue={editing?.paymentMethod || 'UPI'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                >
                  <option value="UPI" className="bg-[#141426]">UPI</option>
                  <option value="Cash" className="bg-[#141426]">Cash</option>
                  <option value="Credit Card" className="bg-[#141426]">Credit Card</option>
                  <option value="Debit Card" className="bg-[#141426]">Debit Card</option>
                </select>
              </div>

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
                <label className="text-xs text-gray-400 block mb-1">Description / Note</label>
                <input
                  type="text"
                  name="note"
                  defaultValue={editing?.note || ''}
                  placeholder="e.g. Grocery order, Lunch"
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
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

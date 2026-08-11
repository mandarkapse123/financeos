'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, formatDate, CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/utils';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { DailyExpense } from '@/lib/types';
import { generateId } from '@/lib/store';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function DailyPage() {
  const { state, store, refresh } = useStore();
  const rawDaily = store.getDaily();
  const rawExpenses = store.getExpenses();
  const currency = state.settings.currency;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DailyExpense | null>(null);

  // Combine Daily entries + Expense entries so iPhone Shortcut & Expense logs are 100% synced!
  const combinedDaily = [
    ...rawDaily,
    ...rawExpenses.map(e => ({
      id: e.id,
      accountId: e.accountId,
      amount: e.amount,
      category: e.category,
      paymentMethod: 'UPI',
      date: e.date,
      note: e.name || e.note,
      kmReading: e.kmReading,
    }))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysLog = combinedDaily.filter(d => (d.date || '').startsWith(todayStr));
  const todaysTotal = todaysLog.reduce((sum, d) => sum + d.amount, 0);

  const totalSpend = combinedDaily.reduce((sum, d) => sum + d.amount, 0);
  const avgSpend = combinedDaily.length ? totalSpend / combinedDaily.length : 0;

  // Heatmap generation
  const heatData: Record<string, number> = {};
  combinedDaily.forEach(d => {
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

    store.upsertDaily({
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
      amount: amt,
      category: cat,
      paymentMethod: formData.get('paymentMethod') as string || 'UPI',
      date: formData.get('date') as string,
      note: formData.get('note') as string || '',
      kmReading: km ? parseFloat(km) : undefined,
    });

    refresh();
    setModalOpen(false);
    setEditing(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Expense Logs & iPhone Sync</h1>
          <p className="text-gray-400 text-sm">All entries logged via iPhone Back Tap, Shortcuts, or Quick Add</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
        >
          + Log Expense
        </button>
      </div>

      {/* 4 Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl">
          <span className="text-xs text-gray-400 font-semibold uppercase">Today's Spend</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(todaysTotal, currency)}</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl">
          <span className="text-xs text-gray-400 font-semibold uppercase">Avg Daily Spend</span>
          <p className="text-2xl font-bold text-purple-400 mt-1">{formatCurrency(avgSpend, currency)}</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl">
          <span className="text-xs text-gray-400 font-semibold uppercase">Total Logs Count</span>
          <p className="text-2xl font-bold text-white mt-1">{combinedDaily.length} items</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl">
          <span className="text-xs text-gray-400 font-semibold uppercase">Total Logged</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(totalSpend, currency)}</p>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-[#0e0e1c] border border-white/[0.07] p-6 rounded-2xl space-y-4">
        <h3 className="font-semibold text-lg">Activity Heatmap (Last 27 Weeks)</h3>
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
          {heatmapCells.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((cell, cIdx) => (
                <div
                  key={cIdx}
                  title={`${cell.date}: ${cell.val ? formatCurrency(cell.val, currency) : 'No spend'}`}
                  className="w-3 h-3 rounded-sm transition-transform hover:scale-125 cursor-pointer"
                  style={{ backgroundColor: getLevelColor(cell.level) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Combined Log Table */}
      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-lg">Full Transaction Log (iPhone + Web)</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#141426] text-gray-400 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description / Note</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">KM Reading</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {combinedDaily.map((d) => (
                <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-gray-400 text-xs">{formatDate(d.date)}</td>
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
                  <td className="p-4 text-xs font-mono text-purple-300">
                    {d.kmReading ? `⛽ ${d.kmReading.toLocaleString()} km` : '—'}
                  </td>
                  <td className="p-4 text-right font-bold text-rose-400">
                    -{formatCurrency(d.amount, currency)}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        store.deleteDaily(d.id);
                        store.deleteExpense(d.id);
                        refresh();
                      }}
                      className="text-gray-500 hover:text-rose-400 p-1"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {combinedDaily.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No daily expenses logged yet.
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
            <h3 className="text-lg font-bold">Log Daily Expense</h3>
            <form onSubmit={handleSaveDaily} className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount ({currency})</label>
                <input
                  type="number"
                  step="any"
                  name="amount"
                  required
                  autoFocus
                  placeholder="0.00"
                  defaultValue={editing?.amount || ''}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-lg font-bold text-white text-center"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editing?.category || 'Food & Dining'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    {Object.keys(CATEGORY_ICONS).map((c) => (
                      <option key={c} value={c} className="bg-[#141426]">
                        {CATEGORY_ICONS[c]} {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Payment Method</label>
                  <select
                    name="paymentMethod"
                    defaultValue={editing?.paymentMethod || 'UPI'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    {['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking'].map((pm) => (
                      <option key={pm} value={pm} className="bg-[#141426]">
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Odometer KM Reading (For Petrol/Transport)</label>
                <input
                  type="number"
                  name="kmReading"
                  placeholder="e.g. 45280"
                  defaultValue={editing?.kmReading || ''}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={editing?.date || new Date().toISOString().split('T')[0]}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  name="note"
                  placeholder="Notes..."
                  defaultValue={editing?.note || ''}
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
                  className="px-5 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white"
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

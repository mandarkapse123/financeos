'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, sumAmounts, monthlyAmount, CATEGORY_COLORS, INCOME_CATEGORIES } from '@/lib/utils';
import { IncomeEntry } from '@/lib/types';
import { generateId } from '@/lib/store';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip);

export default function IncomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store, refresh } = useStore();
  const income = store.getIncome();
  const currency = state.settings.currency;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);

  if (!mounted) return null;
  
  const totalMonthly = sumAmounts(income.map(i => ({ amount: monthlyAmount(i) })));
  const highestSource = income.length > 0 ? income.reduce((a, b) => monthlyAmount(a) > monthlyAmount(b) ? a : b).name : 'None';
  const totalCount = income.length;

  const incomeByCategory = income.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + monthlyAmount(curr);
    return acc;
  }, {} as Record<string, number>);

  const donutData = {
    labels: Object.keys(incomeByCategory),
    datasets: [{
      data: Object.values(incomeByCategory),
      backgroundColor: Object.keys(incomeByCategory).map(c => CATEGORY_COLORS[c] || '#94a3b8'),
      borderWidth: 0,
    }]
  };

  const trendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Income Trend',
      data: [totalMonthly*0.8, totalMonthly*0.9, totalMonthly*1.1, totalMonthly*1, totalMonthly*1.05, totalMonthly],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item = {
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category') as string,
      frequency: formData.get('frequency') as any,
      date: formData.get('date') as string,
      note: formData.get('note') as string,
    };
    store.upsertIncome(item);
    refresh();
    setModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      <div className="flex justify-between items-center bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold">Income Streams</h1>
          <p className="text-gray-400">Manage your multiple sources of income</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg font-medium">
          + Add Income
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Monthly Income', val: formatCurrency(totalMonthly, currency) },
          { label: 'Highest Source', val: highestSource },
          { label: 'Income Streams', val: totalCount },
        ].map(m => (
          <div key={m.label} className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-sm text-gray-400">{m.label}</h3>
            <p className="text-2xl font-semibold mt-1">{m.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">Income Breakdown</h3>
          <div className="w-2/3 mx-auto">
            <Doughnut data={donutData} options={{ plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }} />
          </div>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">6-Month Trend</h3>
          <Line data={trendData} options={chartOptions} />
        </div>
      </div>

      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
        <h3 className="text-lg font-semibold mb-4">All Income Streams</h3>
        {income.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💸</div>
            <p className="text-gray-400">No income streams found.</p>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg">Add First Income</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-white/[0.07]">
                  <th className="pb-3 w-10 text-center font-medium text-white/40">#</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Frequency</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {income.map((i, idx) => (
                  <tr key={i.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-center text-xs font-mono text-white/40 font-bold">#{idx + 1}</td>
                    <td className="py-3 font-medium">{i.name}</td>
                    <td className="py-3 text-emerald-400 font-semibold">{formatCurrency(i.amount, currency)}</td>
                    <td className="py-3 text-sm capitalize">{i.frequency}</td>
                    <td className="py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10" style={{ color: CATEGORY_COLORS[i.category] || '#fff' }}>
                        {i.category}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-400">{i.date}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => { setEditing(i); setModalOpen(true); }} className="text-sm text-purple-400 hover:text-purple-300">Edit</button>
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
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Income</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input required name="name" defaultValue={editing?.name || ''} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount</label>
                <input required type="number" step="0.01" name="amount" defaultValue={editing?.amount || ''} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select name="category" defaultValue={editing?.category || INCOME_CATEGORIES[0]} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                    {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Frequency</label>
                  <select name="frequency" defaultValue={editing?.frequency || 'monthly'} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="one-time">One-time</option>
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
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, downloadFile } from '@/lib/utils';

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store } = useStore();
  const [tab, setTab] = useState('Overview');
  const tabs = ['Overview', 'Income', 'Expenses', 'Portfolio'];

  if (!mounted) return null;

  const currency = state.settings.currency;
  const income = store.getIncome();
  const expenses = store.getExpenses();
  const daily = store.getDaily();
  const investments = store.getInvestments();

  const handleExportCSV = () => {
    let csv = 'Type,Category/Name,Amount,Date/Cycle\n';
    income.forEach(i => csv += `Income,${i.name},${i.amount},${i.frequency || 'monthly'}\n`);
    expenses.forEach(e => csv += `Expense,${e.name},${e.amount},${e.date}\n`);
    daily.forEach(d => csv += `Daily,${d.category},${d.amount},${d.date}\n`);
    investments.forEach(inv => csv += `Investment,${inv.name},${inv.investedAmount},Portfolio\n`);

    downloadFile('financeos_full_report.csv', csv, 'text/csv');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">Financial Analytics & Reports</h1>
          <p className="text-gray-400 text-sm">Deep insights across income streams, expense categories, and portfolio performance</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:-translate-y-0.5"
        >
          📥 Export Complete CSV Report
        </button>
      </div>

      <div className="flex border-b border-white/10 gap-2">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              tab === t
                ? 'border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-xl'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6 space-y-6 shadow-xl">
        <h2 className="text-xl font-bold">{tab} Executive Summary</h2>
        {tab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/30 border border-white/10 p-5 rounded-xl">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Income Streams</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{income.length} Sources</p>
            </div>
            <div className="bg-black/30 border border-white/10 p-5 rounded-xl">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Expense Records</span>
              <p className="text-2xl font-bold text-rose-400 mt-1">{expenses.length + daily.length} Entries</p>
            </div>
            <div className="bg-black/30 border border-white/10 p-5 rounded-xl">
              <span className="text-xs text-gray-400 uppercase font-semibold">Portfolio Assets</span>
              <p className="text-2xl font-bold text-purple-400 mt-1">{investments.length} Holdings</p>
            </div>
          </div>
        )}

        {tab === 'Income' && (
          <div className="space-y-3">
            {income.map(i => (
              <div key={i.id} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/10">
                <div>
                  <h4 className="font-bold text-white">{i.name}</h4>
                  <p className="text-xs text-gray-400 capitalize">{i.category} • {i.frequency || 'monthly'}</p>
                </div>
                <span className="font-bold text-emerald-400">{formatCurrency(i.amount, currency)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Expenses' && (
          <div className="space-y-3">
            {[...expenses, ...daily.map(d => ({ id: d.id, name: d.note || d.category, amount: d.amount, date: d.date, category: d.category }))].map(e => (
              <div key={e.id} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/10">
                <div>
                  <h4 className="font-bold text-white">{e.name}</h4>
                  <p className="text-xs text-gray-400 capitalize">{e.category} • {e.date}</p>
                </div>
                <span className="font-bold text-rose-400">-{formatCurrency(e.amount, currency)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Portfolio' && (
          <div className="space-y-3">
            {investments.map(inv => (
              <div key={inv.id} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/10">
                <div>
                  <h4 className="font-bold text-white">{inv.name} ({inv.tickerSymbol || inv.type})</h4>
                  <p className="text-xs text-gray-400 font-mono">Invested: {formatCurrency(inv.investedAmount, currency)}</p>
                </div>
                <span className="font-bold text-purple-400">{formatCurrency(inv.currentValue || inv.investedAmount, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

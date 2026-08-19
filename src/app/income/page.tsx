'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, sumAmounts, monthlyAmount, CATEGORY_COLORS, INCOME_CATEGORIES } from '@/lib/utils';
import { IncomeEntry } from '@/lib/types';
import { generateId } from '@/lib/store';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { Wallet, ArrowUpRight, ArrowDownRight, Building2, Trash2, Pencil } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip);

export default function IncomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store, refresh } = useStore();
  const allIncome = store.getIncome();
  const allExpenses = store.getExpenses();
  const allDaily = store.getDaily();
  const allRentEntries = store.getRentEntries();
  const allRentExpenses = store.getRentExpenses();
  const currency = state.settings.currency || '₹';

  const [selectedBank, setSelectedBank] = useState<'All' | 'HDFC Bank' | 'ICICI Bank' | 'SBI Bank'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);

  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Dynamic Month Options (Current Month + past months)
  const monthOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);

    const now = new Date();
    for (let i = 1; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(d.toISOString().substring(0, 7));
    }

    [...allIncome, ...allExpenses, ...allDaily, ...allRentEntries].forEach(item => {
      if (item.date) {
        const mKey = item.date.substring(0, 7);
        if (mKey.length === 7 && mKey.includes('-')) monthsSet.add(mKey);
      }
    });

    return Array.from(monthsSet).sort().reverse().map(key => {
      const [y, m] = key.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      return { key, label };
    });
  }, [allIncome, allExpenses, allDaily, allRentEntries, currentMonthKey]);

  const selectedMonthLabel = useMemo(() => {
    const found = monthOptions.find(m => m.key === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [selectedMonth, monthOptions]);

  // Bank Balances & Cashflow Calculation per Bank
  const bankStats = useMemo(() => {
    const banks = ['HDFC Bank', 'ICICI Bank', 'SBI Bank'] as const;
    const result: Record<string, { income: number; expenses: number; net: number; monthIncome: number; monthExpenses: number; monthBalance: number }> = {};

    banks.forEach(b => {
      // Income logged to this bank
      const bankInc = allIncome
        .filter(i => (i.bankAccount || 'HDFC Bank') === b)
        .reduce((sum, i) => sum + i.amount, 0);

      const rentInc = allRentEntries
        .filter(r => (r.bankAccount || 'HDFC Bank') === b)
        .reduce((sum, r) => sum + r.amount, 0);

      const totalInc = bankInc + rentInc;

      // Expenses logged to this bank
      const genExp = allExpenses
        .filter(e => (e.bankAccount || 'HDFC Bank') === b)
        .reduce((sum, e) => sum + e.amount, 0);

      const dailyExp = allDaily
        .filter(d => (d.bankAccount || 'HDFC Bank') === b)
        .reduce((sum, d) => sum + d.amount, 0);

      const totalExp = genExp + dailyExp;

      // Selected Month Specific Stats
      const monthInc = allIncome
        .filter(i => (i.bankAccount || 'HDFC Bank') === b && (i.date || '').substring(0, 7) === selectedMonth)
        .reduce((sum, i) => sum + i.amount, 0) +
        allRentEntries
        .filter(r => (r.bankAccount || 'HDFC Bank') === b && (r.date || '').substring(0, 7) === selectedMonth)
        .reduce((sum, r) => sum + r.amount, 0);

      const monthExp = allExpenses
        .filter(e => (e.bankAccount || 'HDFC Bank') === b && (e.date || '').substring(0, 7) === selectedMonth)
        .reduce((sum, e) => sum + e.amount, 0) +
        allDaily
        .filter(d => (d.bankAccount || 'HDFC Bank') === b && (d.date || '').substring(0, 7) === selectedMonth)
        .reduce((sum, d) => sum + d.amount, 0);

      result[b] = {
        income: totalInc,
        expenses: totalExp,
        net: totalInc - totalExp,
        monthIncome: monthInc,
        monthExpenses: monthExp,
        monthBalance: monthInc - monthExp
      };
    });

    return result;
  }, [allIncome, allExpenses, allDaily, allRentEntries, allRentExpenses, selectedMonth]);

  // Filtered Income List based on selectedBank filter with Date & Time sorting
  const income = useMemo(() => {
    const list = selectedBank === 'All' ? allIncome : allIncome.filter(i => (i.bankAccount || 'HDFC Bank') === selectedBank);
    return [...list].sort((a, b) => {
      const dComp = (b.date || '').localeCompare(a.date || '');
      if (dComp !== 0) return dComp;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [allIncome, selectedBank]);

  if (!mounted) return null;

  const totalMonthly = sumAmounts(income.map(i => ({ amount: monthlyAmount(i) })));
  const highestSource = income.length > 0 ? income.reduce((a, b) => monthlyAmount(a) > monthlyAmount(b) ? a : b).name : 'None';
  const totalCount = income.length;

  const incomeByCategory = income.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + monthlyAmount(curr);
    return acc;
  }, {} as Record<string, number>);

  const donutData = {
    labels: Object.keys(incomeByCategory).length > 0 ? Object.keys(incomeByCategory) : ['No Data'],
    datasets: [{
      data: Object.values(incomeByCategory).length > 0 ? Object.values(incomeByCategory) : [1],
      backgroundColor: Object.keys(incomeByCategory).length > 0
        ? Object.keys(incomeByCategory).map(c => CATEGORY_COLORS[c] || '#94a3b8')
        : ['#334155'],
      borderWidth: 0,
    }]
  };

  const trendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Income Trend',
      data: [totalMonthly * 0.8, totalMonthly * 0.9, totalMonthly * 1.1, totalMonthly * 1, totalMonthly * 1.05, totalMonthly],
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

  const handleSaveIncome = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item: IncomeEntry = {
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
      bankAccount: (formData.get('bankAccount') as string) || 'HDFC Bank',
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string) || 0,
      category: formData.get('category') as string,
      frequency: formData.get('frequency') as any,
      date: formData.get('date') as string,
      note: formData.get('note') as string,
    };
    store.upsertIncome(item);
    refresh();
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    store.deleteIncome(id);
    refresh();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      {/* Header & Add Income */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-purple-400" size={24} /> Income & Bank Balances
          </h1>
          <p className="text-gray-400 text-sm mt-1">Track earnings and manage separate balances for HDFC, ICICI & SBI</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl font-semibold shadow-lg shadow-purple-600/30 transition-all"
        >
          + Add Income
        </button>
      </div>

      {/* 3 SEPARATE BANK BALANCE & CASHFLOW CARDS */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
            🏦 Separate Bank Balances & Net Position
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-300 font-semibold">📅 Select Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#141426] border border-purple-500/40 text-purple-300 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
            >
              {monthOptions.map(m => (
                <option key={m.key} value={m.key} className="bg-[#141426] text-white">
                  {m.label} {m.key === currentMonthKey ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'HDFC Bank', color: 'from-blue-900/40 to-indigo-950/60', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
            { name: 'ICICI Bank', color: 'from-amber-950/40 to-orange-950/60', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
            { name: 'SBI Bank', color: 'from-emerald-950/40 to-teal-950/60', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' }
          ].map(bank => {
            const stats = bankStats[bank.name] || { income: 0, expenses: 0, net: 0, monthIncome: 0, monthExpenses: 0, monthBalance: 0 };
            const isSelected = selectedBank === bank.name;

            return (
              <div
                key={bank.name}
                onClick={() => setSelectedBank(isSelected ? 'All' : bank.name as any)}
                className={`bg-gradient-to-br ${bank.color} border ${bank.border} rounded-2xl p-5 cursor-pointer transition-all shadow-xl hover:scale-[1.02] relative overflow-hidden ${
                  isSelected ? 'ring-2 ring-purple-500 shadow-purple-500/20' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${bank.badge}`}>
                    🏦 {bank.name}
                  </span>
                  {isSelected && <span className="text-xs bg-purple-500 text-white font-bold px-2 py-0.5 rounded-full">Active Filter</span>}
                </div>

                <div className="space-y-3 mt-3">
                  {/* Top: Total Bank Income */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">Bank Income (Total)</span>
                    <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight size={14} /> +{formatCurrency(stats.income, currency)}
                    </span>
                  </div>

                  {/* Middle: Selected Month Balance (Salary/Income Added - Expenses) */}
                  <div className="bg-black/30 border border-white/10 p-3 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                        ⚡ {selectedMonthLabel} Balance
                      </span>
                      <span className={`text-sm font-bold ${stats.monthBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.monthBalance >= 0 ? '+' : ''}{formatCurrency(stats.monthBalance, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>Salary/Inc: +{formatCurrency(stats.monthIncome, currency)}</span>
                      <span>Exp: -{formatCurrency(stats.monthExpenses, currency)}</span>
                    </div>
                  </div>

                  {/* Bottom-Middle: Total Bank Expenses */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">Bank Expenses (Total)</span>
                    <span className="text-sm font-semibold text-rose-400 flex items-center gap-1">
                      <ArrowDownRight size={14} /> -{formatCurrency(stats.expenses, currency)}
                    </span>
                  </div>

                  {/* Footer: Net Position */}
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-300 uppercase">Net Position</span>
                    <span className={`text-lg font-bold ${stats.net >= 0 ? bank.text : 'text-rose-400'}`}>
                      {formatCurrency(stats.net, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BANK FILTER TOGGLE BUTTONS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs font-bold uppercase tracking-wider text-white/40 mr-2">Filter View:</span>
        {(['All', 'HDFC Bank', 'ICICI Bank', 'SBI Bank'] as const).map(b => (
          <button
            key={b}
            onClick={() => setSelectedBank(b)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedBank === b
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-[#0e0e1c] text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            {b === 'All' ? '🌐 All Bank Accounts' : `🏦 ${b}`}
          </button>
        ))}
      </div>

      {/* OVERVIEW METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Monthly Income', value: formatCurrency(totalMonthly, currency), sub: `Across ${totalCount} stream(s)` },
          { label: 'Highest Source', value: highestSource, sub: 'Top earning category' },
          { label: 'Income Streams', value: totalCount.toString(), sub: 'Active revenue sources' },
        ].map((m, i) => (
          <div key={i} className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-600 to-purple-400" />
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{m.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
            <p className="text-xs text-purple-400 mt-1 font-medium">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Income Category Breakdown</h3>
          <div className="h-[220px] flex items-center justify-center">
            <Doughnut data={donutData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">6-Month Trend</h3>
          <div className="h-[220px]">
            <Line data={trendData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* INCOME TABLE */}
      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">All Income Streams</h3>
          <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full font-semibold">
            {income.length} Streams Logged
          </span>
        </div>

        {income.length === 0 ? (
          <div className="text-center py-12 text-gray-400 space-y-3">
            <Wallet className="mx-auto text-purple-400/50" size={48} />
            <p className="text-base font-semibold">No income streams found for {selectedBank}</p>
            <p className="text-xs text-gray-500">Click &quot;Add Income&quot; above to log salary, freelance earnings or dividends.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="text-gray-400 text-xs uppercase font-bold border-b border-white/[0.07] bg-[#141426]">
                  <th className="p-3 w-10 text-center text-white/40">#</th>
                  <th className="p-3">Bank Account</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {income.map((i, idx) => (
                  <tr key={i.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 text-center text-xs font-mono text-white/40 font-bold">#{idx + 1}</td>
                    <td className="p-3">
                      <select
                        value={i.bankAccount || 'HDFC Bank'}
                        onChange={(e) => {
                          store.upsertIncome({ ...i, bankAccount: e.target.value });
                          refresh();
                        }}
                        className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold px-2.5 py-1 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400"
                        title="Click to change Bank Account"
                      >
                        <option value="HDFC Bank" className="bg-[#141426] text-white">🏦 HDFC Bank</option>
                        <option value="ICICI Bank" className="bg-[#141426] text-white">🏦 ICICI Bank</option>
                        <option value="SBI Bank" className="bg-[#141426] text-white">🏦 SBI Bank</option>
                      </select>
                    </td>
                    <td className="p-3 font-semibold text-white">{i.name}</td>
                    <td className="p-3 text-emerald-400 font-bold">{formatCurrency(i.amount, currency)}</td>
                    <td className="p-3 text-xs capitalize text-purple-300 font-medium">{i.frequency}</td>
                    <td className="p-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 font-semibold" style={{ color: CATEGORY_COLORS[i.category] || '#fff' }}>
                        {i.category}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-400">{i.date}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditing(i); setModalOpen(true); }}
                          className="text-gray-400 hover:text-purple-300 p-1.5 transition-colors"
                          title="Edit income"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
                          className="text-gray-400 hover:text-rose-400 p-1.5 transition-colors"
                          title="Delete income"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT INCOME WITH BANK ACCOUNT SELECTOR */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Income' : 'Add Income Stream'}</h2>
            <form key={editing?.id || 'new_inc'} onSubmit={handleSaveIncome} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1">🏦 Bank Account</label>
                <select
                  name="bankAccount"
                  defaultValue={editing?.bankAccount || 'HDFC Bank'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 font-medium"
                >
                  <option value="HDFC Bank" className="bg-[#141426]">🏦 HDFC Bank</option>
                  <option value="ICICI Bank" className="bg-[#141426]">🏦 ICICI Bank</option>
                  <option value="SBI Bank" className="bg-[#141426]">🏦 SBI Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Income Stream Name</label>
                <input
                  required
                  name="name"
                  defaultValue={editing?.name || ''}
                  placeholder="e.g. Monthly Salary, Freelance Work"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Amount ({currency})</label>
                <input
                  required
                  type="number"
                  step="any"
                  name="amount"
                  defaultValue={editing?.amount || ''}
                  placeholder="0.00"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editing?.category || INCOME_CATEGORIES[0]}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    {INCOME_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#141426]">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Frequency</label>
                  <select
                    name="frequency"
                    defaultValue={editing?.frequency || 'monthly'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="monthly" className="bg-[#141426]">Monthly</option>
                    <option value="yearly" className="bg-[#141426]">Yearly</option>
                    <option value="weekly" className="bg-[#141426]">Weekly</option>
                    <option value="quarterly" className="bg-[#141426]">Quarterly</option>
                    <option value="one-time" className="bg-[#141426]">One-time</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Date</label>
                  <input
                    required
                    type="date"
                    name="date"
                    defaultValue={editing?.date || new Date().toISOString().split('T')[0]}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white [color-scheme:dark] focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Note (Optional)</label>
                  <input
                    name="note"
                    defaultValue={editing?.note || ''}
                    placeholder="Optional notes"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
                >
                  Save Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, sumAmounts, monthlyAmount, CATEGORY_COLORS, INCOME_CATEGORIES, formatDate } from '@/lib/utils';
import { IncomeEntry } from '@/lib/types';
import { generateId } from '@/lib/store';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { Wallet, ArrowUpRight, ArrowDownRight, Building2, Trash2, Edit3, Plus, X, Calendar, Filter } from 'lucide-react';

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
  const [editingOpeningBank, setEditingOpeningBank] = useState<{ name: string; balance: number } | null>(null);

  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [filterByMonthOnly, setFilterByMonthOnly] = useState<boolean>(false);

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
      const bankInc = allIncome
        .filter(i => (i.bankAccount || 'HDFC Bank') === b)
        .reduce((sum, i) => sum + i.amount, 0);

      const rentInc = allRentEntries
        .filter(r => (r.bankAccount || 'HDFC Bank') === b)
        .reduce((sum, r) => sum + r.amount, 0);

      const totalInc = bankInc + rentInc;

      const genExp = allExpenses
        .filter(e => (e.bankAccount || 'HDFC Bank') === b)
        .reduce((sum, e) => sum + e.amount, 0);

      const dailyExp = allDaily
        .filter(d => (d.bankAccount || 'HDFC Bank') === b)
        .reduce((sum, d) => sum + d.amount, 0);

      const totalExp = genExp + dailyExp;

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

  // Filtered Income List based on selectedBank and selectedMonth (if toggled)
  const income = useMemo(() => {
    let list = selectedBank === 'All' ? allIncome : allIncome.filter(i => (i.bankAccount || 'HDFC Bank') === selectedBank);
    if (filterByMonthOnly) {
      list = list.filter(i => (i.date || '').substring(0, 7) === selectedMonth);
    }
    return [...list].sort((a, b) => {
      const dComp = (b.date || '').localeCompare(a.date || '');
      if (dComp !== 0) return dComp;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [allIncome, selectedBank, selectedMonth, filterByMonthOnly]);

  if (!mounted) return null;

  const totalMonthly = sumAmounts(income.map(i => ({ amount: monthlyAmount(i) })));
  const highestSource = income.length > 0 ? income.reduce((a, b) => monthlyAmount(a) > monthlyAmount(b) ? a : b).name : 'None';
  const totalCount = income.length;

  const incomeByCategory = income.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + monthlyAmount(curr);
    return acc;
  }, {} as Record<string, number>);

  const donutLabels = Object.keys(incomeByCategory);
  const donutValues = Object.values(incomeByCategory);

  const donutData = {
    labels: donutLabels.length > 0 ? donutLabels : ['No Income'],
    datasets: [{
      data: donutValues.length > 0 ? donutValues : [1],
      backgroundColor: donutLabels.length > 0
        ? donutLabels.map(cat => CATEGORY_COLORS[cat] || '#7c3aed')
        : ['#1c1c30'],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  const trendData = {
    labels: monthOptions.slice(0, 6).reverse().map(m => m.label),
    datasets: [{
      label: 'Monthly Income',
      data: monthOptions.slice(0, 6).reverse().map(m => {
        return allIncome
          .filter(i => (i.date || '').substring(0, 7) === m.key)
          .reduce((s, i) => s + i.amount, 0);
      }),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointBackgroundColor: '#10b981',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' }, boxWidth: 10, padding: 10 },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
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
    <div className="w-full space-y-6 text-white min-h-screen">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0a14] border border-white/[0.08] rounded-2xl p-5 shadow-lg">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="text-purple-400" size={22} /> Income &amp; Cash Flow
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Track earnings, separate bank accounts, and monthly trends</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Calendar size={13} className="text-purple-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-purple-300 font-bold focus:outline-none cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m.key} value={m.key} className="bg-[#141426] text-white">
                  {m.label} {m.key === currentMonthKey ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Income
          </button>
        </div>
      </div>

      {/* 3 CLEAN BANK BALANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { name: 'HDFC Bank', border: 'border-blue-500/20', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
          { name: 'ICICI Bank', border: 'border-amber-500/20', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
          { name: 'SBI Bank', border: 'border-emerald-500/20', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
        ].map(bank => {
          const stats = bankStats[bank.name] || { income: 0, expenses: 0, net: 0, monthIncome: 0, monthExpenses: 0, monthBalance: 0 };
          const isSelected = selectedBank === bank.name;
          const openingBal = state.settings.openingBalances?.[bank.name] || 0;
          const currentBankBalance = openingBal + stats.net;

          return (
            <div
              key={bank.name}
              onClick={() => setSelectedBank(isSelected ? 'All' : bank.name as any)}
              className={`bg-[#0a0a14] border ${bank.border} rounded-2xl p-4 cursor-pointer transition-all shadow-md hover:border-purple-500/40 relative ${
                isSelected ? 'ring-2 ring-purple-500 bg-purple-950/20' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${bank.badge}`}>
                  🏦 {bank.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingOpeningBank({ name: bank.name, balance: openingBal });
                  }}
                  className="text-[10px] text-gray-400 hover:text-purple-300 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1 transition-all border border-white/5"
                  title="Set Opening Balance"
                >
                  <Edit3 size={10} /> Set Opening
                </button>
              </div>

              {/* Main Balance */}
              <div className="mb-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Balance</span>
                <p className="text-xl font-black text-white mt-0.5">{formatCurrency(currentBankBalance, currency)}</p>
              </div>

              {/* Month Activity Pill */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">{selectedMonthLabel} Net</span>
                  <span className={`font-bold ${stats.monthBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.monthBalance >= 0 ? '+' : ''}{formatCurrency(stats.monthBalance, currency)}
                  </span>
                </div>
                <div className="text-right text-[10px] text-gray-400">
                  <span className="text-emerald-400/90 block">+{formatCurrency(stats.monthIncome, currency)}</span>
                  <span className="text-rose-400/90 block">-{formatCurrency(stats.monthExpenses, currency)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FILTER BUTTONS & MONTH TOGGLE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['All', 'HDFC Bank', 'ICICI Bank', 'SBI Bank'] as const).map(b => (
            <button
              key={b}
              onClick={() => setSelectedBank(b)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedBank === b
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-[#0a0a14] text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              {b === 'All' ? '🌐 All Accounts' : `🏦 ${b}`}
            </button>
          ))}
        </div>

        <button
          onClick={() => setFilterByMonthOnly(!filterByMonthOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            filterByMonthOnly
              ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
              : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
          }`}
        >
          <Filter size={12} />
          <span>{filterByMonthOnly ? `Filtering by ${selectedMonthLabel}` : 'Show All Months'}</span>
        </button>
      </div>

      {/* 3 OVERVIEW METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-[#0a0a14] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Monthly Income</p>
          <p className="text-xl font-black text-white mt-1">{formatCurrency(totalMonthly, currency)}</p>
          <p className="text-[11px] text-purple-400 mt-0.5">Across {totalCount} stream(s)</p>
        </div>
        <div className="bg-[#0a0a14] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Highest Source</p>
          <p className="text-xl font-black text-white mt-1 truncate">{highestSource}</p>
          <p className="text-[11px] text-emerald-400 mt-0.5">Top revenue generator</p>
        </div>
        <div className="bg-[#0a0a14] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Active Streams</p>
          <p className="text-xl font-black text-white mt-1">{totalCount}</p>
          <p className="text-[11px] text-indigo-300 mt-0.5">Tracked sources</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-[#0a0a14] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Income Category Breakdown</h3>
          <div className="h-[200px] flex items-center justify-center">
            <Doughnut data={donutData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-[#0a0a14] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">6-Month Trend</h3>
          <div className="h-[200px]">
            <Line data={trendData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* INCOME TABLE */}
      <div className="bg-[#0a0a14] border border-white/[0.08] rounded-2xl p-4 md:p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">All Income Streams</h3>
          <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-full font-semibold border border-white/5">
            {income.length} Streams
          </span>
        </div>

        {income.length === 0 ? (
          <div className="text-center py-10 text-gray-400 space-y-2">
            <Wallet className="mx-auto text-purple-400/50" size={36} />
            <p className="text-sm font-semibold">No income streams found for {selectedBank}</p>
            <p className="text-xs text-gray-500">Click &quot;Add Income&quot; above to log salary or freelance revenue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 text-[11px] uppercase font-semibold border-b border-white/10 bg-[#141426]">
                <tr>
                  <th className="p-3 pl-4 w-12 text-center text-gray-500 font-mono">Sr.</th>
                  <th className="p-3">Bank Account</th>
                  <th className="p-3">Source Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {income.map((i, idx) => (
                  <tr key={i.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 pl-4 text-center font-mono text-gray-500 font-bold">{idx + 1}</td>
                    <td className="p-3">
                      <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        🏦 {i.bankAccount || 'HDFC Bank'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">{i.name}</td>
                    <td className="p-3 text-emerald-400 font-bold">{formatCurrency(i.amount, currency)}</td>
                    <td className="p-3 capitalize text-gray-400">{i.frequency}</td>
                    <td className="p-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-semibold" style={{ color: CATEGORY_COLORS[i.category] || '#fff' }}>
                        {i.category}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400">{formatDate(i.date)}</td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setEditing(i); setModalOpen(true); }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-600/20 text-gray-400 hover:text-purple-300 border border-white/5 transition-colors"
                          title="Edit income"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 text-gray-400 hover:text-rose-300 border border-white/5 transition-colors"
                          title="Delete income"
                        >
                          <Trash2 size={13} />
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

      {/* MODAL: ADD / EDIT INCOME */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">{editing ? 'Edit Income Stream' : 'Add New Income Stream'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Bank Account</label>
                <select
                  name="bankAccount"
                  defaultValue={editing?.bankAccount || (selectedBank !== 'All' ? selectedBank : 'HDFC Bank')}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value="HDFC Bank">🏦 HDFC Bank</option>
                  <option value="ICICI Bank">🏦 ICICI Bank</option>
                  <option value="SBI Bank">🏦 SBI Bank</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Income Source Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editing?.name || ''}
                  placeholder="e.g. Monthly Salary, Freelance Client, Dividend"
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Amount ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    name="amount"
                    required
                    defaultValue={editing?.amount || ''}
                    placeholder="75000"
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Category</label>
                  <select
                    name="category"
                    defaultValue={editing?.category || 'Salary'}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    {INCOME_CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-[#141426]">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Frequency</label>
                  <select
                    name="frequency"
                    defaultValue={editing?.frequency || 'monthly'}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={editing?.date || new Date().toISOString().split('T')[0]}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Notes (Optional)</label>
                <input
                  type="text"
                  name="note"
                  defaultValue={editing?.note || ''}
                  placeholder="Additional remarks..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold shadow-lg"
                >
                  Save Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT OPENING BALANCE */}
      {editingOpeningBank && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Set Opening Balance ({editingOpeningBank.name})</h3>
            <p className="text-xs text-gray-400">
              Enter the starting baseline balance in your {editingOpeningBank.name} account.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const val = parseFloat(formData.get('balance') as string) || 0;
                const newOpenings = { ...(state.settings.openingBalances || {}), [editingOpeningBank.name]: val };
                store.updateSettings({ openingBalances: newOpenings });
                refresh();
                setEditingOpeningBank(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Opening Amount ({currency})</label>
                <input
                  type="number"
                  step="any"
                  name="balance"
                  required
                  defaultValue={editingOpeningBank.balance}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white font-bold text-base"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingOpeningBank(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg"
                >
                  Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

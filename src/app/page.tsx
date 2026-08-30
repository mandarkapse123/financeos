'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, formatFull, sumAmounts, monthlyAmount, getGreeting, CATEGORY_COLORS, daysBetween, today } from '@/lib/utils';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip);

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store } = useStore();
  const income = store.getIncome();
  const expenses = store.getExpenses();
  const subs = store.getSubscriptions();
  const goals = store.getGoals();

  if (!mounted) return null;

  const totalIncome = sumAmounts(income.map(i => ({ amount: monthlyAmount(i) })));
  const totalExpenses = sumAmounts(expenses);
  const totalSubs = sumAmounts(subs.map(s => ({ amount: monthlyAmount(s) })));
  const netWorth = totalIncome - totalExpenses - totalSubs;

  // Upcoming subscriptions within 2 days (or overdue)
  const todayStr = today();
  const upcoming2Days = subs.filter(s => {
    if (!s.renewalDate) return false;
    const d = daysBetween(todayStr, s.renewalDate);
    return d >= 0 && d <= 2;
  });

  const barData = {
    labels: ['Income', 'Expenses', 'Subscriptions'],
    datasets: [
      {
        label: 'Amount',
        data: [totalIncome, totalExpenses, totalSubs],
        backgroundColor: ['#10b981', '#f43f5e', '#a855f7'],
        borderRadius: 4,
      }
    ]
  };

  const expenseByCategory = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const donutData = {
    labels: Object.keys(expenseByCategory),
    datasets: [
      {
        data: Object.values(expenseByCategory),
        backgroundColor: Object.keys(expenseByCategory).map(c => CATEGORY_COLORS[c] || '#94a3b8'),
        borderWidth: 0,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter' } } },
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter' } } }
    }
  };

  const hdfcExpenses = expenses.filter(e => (e.bankAccount || 'HDFC Bank') === 'HDFC Bank').reduce((s, e) => s + e.amount, 0);
  const iciciExpenses = expenses.filter(e => e.bankAccount === 'ICICI Bank').reduce((s, e) => s + e.amount, 0);
  const sbiExpenses = expenses.filter(e => e.bankAccount === 'SBI Bank').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="w-full space-y-6 text-white min-h-screen">
      {/* Upcoming Subscription Renewal Alert (2 Days Prior) */}
      {upcoming2Days.length > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
              ⚠️
            </div>
            <div>
              <h3 className="font-bold text-amber-300 text-sm sm:text-base">
                Upcoming Subscription Renewal ({upcoming2Days.length} due in ≤ 2 days)
              </h3>
              <p className="text-xs text-amber-200/70">
                {upcoming2Days.map(s => `${s.icon || '📱'} ${s.name} (${formatCurrency(s.amount, state.settings.currency)}) on ${s.renewalDate}`).join(' • ')}
              </p>
            </div>
          </div>
          <a
            href="/subscriptions"
            className="px-4 py-1.5 text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 rounded-xl transition-colors whitespace-nowrap self-end sm:self-center"
          >
            Manage Subs
          </a>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex justify-between items-center bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}, {state.settings.name}</h1>
          <p className="text-gray-400">Here's your financial overview</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Net Worth Focus</p>
          <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">
            {formatFull(netWorth, state.settings.currency)}
          </p>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Income', val: totalIncome, color: 'text-emerald-400' },
          { label: '🏦 HDFC Bank Spend', val: hdfcExpenses, color: 'text-purple-400' },
          { label: '🏦 ICICI Bank Spend', val: iciciExpenses, color: 'text-amber-400' },
          { label: '🏦 SBI Bank Spend', val: sbiExpenses, color: 'text-blue-400' },
        ].map(m => (
          <div key={m.label} className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-sm text-gray-400">{m.label}</h3>
            <p className={`text-2xl font-semibold mt-1 ${m.color}`}>
              {formatCurrency(m.val, state.settings.currency)}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">Cash Flow</h3>
          <Bar data={barData} options={chartOptions} />
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
          <div className="w-2/3 mx-auto">
            <Doughnut data={donutData} options={{ plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }} />
          </div>
        </div>
      </div>

      {/* Goals & Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">Goal Progress</h3>
          {goals.length === 0 ? (
            <div className="text-center py-6 text-gray-400">🎯 No goals set yet.</div>
          ) : (
            <div className="space-y-4">
              {goals.map(g => (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{g.name}</span>
                    <span>{formatCurrency(g.savedAmount, state.settings.currency)} / {formatCurrency(g.targetAmount, state.settings.currency)}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min((g.savedAmount / g.targetAmount) * 100, 100)}%`, backgroundColor: g.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
          {expenses.length === 0 ? (
            <div className="text-center py-6 text-gray-400">💸 No recent expenses.</div>
          ) : (
            <div className="space-y-3">
              {expenses.slice(0, 5).map(e => (
                <div key={e.id} className="flex justify-between items-center p-2 hover:bg-white/[0.02] rounded-lg">
                  <div>
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-gray-400">{e.date} • <span style={{color: CATEGORY_COLORS[e.category] || '#94a3b8'}}>{e.category}</span></p>
                  </div>
                  <div className="font-semibold">{formatCurrency(e.amount, state.settings.currency)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, formatFull } from '@/lib/utils';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { INVESTMENT_TYPES, CHART_PALETTE } from '@/lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip);

export default function InvestmentsPage() {
  const { state, refresh, store } = useStore();
  const { investments } = state;
  const [loading, setLoading] = useState(false);

  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.investedAmount), 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnsPercentage = totalInvested ? (totalReturns / totalInvested) * 100 : 0;

  const handleRefresh = async () => {
    setLoading(true);
    const tickers = investments.map(inv => ({ id: inv.id, symbol: inv.tickerSymbol || '', type: inv.type, currentPrice: inv.currentValue }));
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });
      const data = await res.json();
      if (data.prices) {
        store.updateInvestmentPrices(data.prices);
        refresh();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const allocationData = {
    labels: investments.map(i => i.name),
    datasets: [{
      data: investments.map(i => i.currentValue || i.investedAmount),
      backgroundColor: CHART_PALETTE.slice(0, investments.length),
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: investments.map(i => i.name),
    datasets: [
      { label: 'Invested', data: investments.map(i => i.investedAmount), backgroundColor: '#4f46e5' },
      { label: 'Current', data: investments.map(i => i.currentValue || i.investedAmount), backgroundColor: '#10b981' },
    ]
  };

  return (
    <div className="p-6 space-y-6 text-white min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <button onClick={handleRefresh} disabled={loading} className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
          {loading ? 'Refreshing...' : 'Refresh Prices'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Total Invested</p>
          <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Current Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalCurrent)}</p>
        </div>
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Total Returns</p>
          <p className={`text-2xl font-bold ${totalReturns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)}
          </p>
        </div>
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Returns %</p>
          <p className={`text-2xl font-bold ${returnsPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {returnsPercentage >= 0 ? '+' : ''}{returnsPercentage.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800 h-80 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Allocation</h2>
          <div className="flex-1 relative">
            <Doughnut data={allocationData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#ccc' } } } }} />
          </div>
        </div>
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800 h-80 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Invested vs Current</h2>
          <div className="flex-1 relative">
            <Bar data={barData} options={{ maintainAspectRatio: false, scales: { y: { grid: { color: '#333' }, ticks: { color: '#ccc' } }, x: { grid: { display: false }, ticks: { color: '#ccc' } } }, plugins: { legend: { labels: { color: '#ccc' } } } }} />
          </div>
        </div>
      </div>

      <div className="bg-[#0e0e1c] rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="p-4 text-gray-400 font-medium">Name</th>
              <th className="p-4 text-gray-400 font-medium">Type</th>
              <th className="p-4 text-gray-400 font-medium">Invested</th>
              <th className="p-4 text-gray-400 font-medium">Current</th>
              <th className="p-4 text-gray-400 font-medium">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {investments.map(inv => {
              const ret = (inv.currentValue || inv.investedAmount) - inv.investedAmount;
              const retPct = inv.investedAmount ? (ret / inv.investedAmount) * 100 : 0;
              return (
                <tr key={inv.id} className="hover:bg-gray-800/30">
                  <td className="p-4 font-medium">{inv.name} <span className="text-xs text-gray-500 ml-2">{inv.tickerSymbol}</span></td>
                  <td className="p-4 capitalize">{inv.type.replace('_', ' ')}</td>
                  <td className="p-4">{formatCurrency(inv.investedAmount)}</td>
                  <td className="p-4">{formatCurrency(inv.currentValue || inv.investedAmount)}</td>
                  <td className={`p-4 ${ret >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {ret >= 0 ? '+' : ''}{formatCurrency(ret)} ({retPct.toFixed(2)}%)
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

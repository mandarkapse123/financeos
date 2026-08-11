'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency } from '@/lib/utils';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function DailyPage() {
  const { state } = useStore();
  const { daily } = state;
  
  const today = new Date().toISOString().split('T')[0];
  const todaysLog = daily.filter(d => d.date.startsWith(today));
  const todaysTotal = todaysLog.reduce((sum, d) => sum + d.amount, 0);
  
  const totalSpend = daily.reduce((sum, d) => sum + d.amount, 0);
  const avgSpend = daily.length ? totalSpend / daily.length : 0;
  
  // Heatmap generation
  const heatData: Record<string, number> = {};
  daily.forEach(d => {
    const dt = d.date.split('T')[0];
    heatData[dt] = (heatData[dt] || 0) + d.amount;
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

  return (
    <div className="p-6 space-y-6 text-white min-h-screen">
      <h1 className="text-3xl font-bold">Daily Log</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Today's Spend</p>
          <p className="text-2xl font-bold">{formatCurrency(todaysTotal)}</p>
        </div>
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Avg Daily Spend</p>
          <p className="text-2xl font-bold">{formatCurrency(avgSpend)}</p>
        </div>
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Logs Count</p>
          <p className="text-2xl font-bold">{daily.length}</p>
        </div>
        <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Total Logged</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
        </div>
      </div>

      <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Activity Heatmap</h2>
        <div className="flex gap-[3px]">
          {heatmapCells.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div 
                  key={di} 
                  title={`${day.date}: ${formatCurrency(day.val)}`}
                  style={{ backgroundColor: getLevelColor(day.level) }}
                  className="w-[11px] h-[11px] rounded-[2px]"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-[#0e0e1c] rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="p-4 text-gray-400 font-medium">Date</th>
              <th className="p-4 text-gray-400 font-medium">Category</th>
              <th className="p-4 text-gray-400 font-medium">Description</th>
              <th className="p-4 text-gray-400 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {daily.slice(0, 50).map(d => (
              <tr key={d.id} className="hover:bg-gray-800/30">
                <td className="p-4">{new Date(d.date).toLocaleDateString()}</td>
                <td className="p-4">{d.category}</td>
                <td className="p-4">{d.note || '-'}</td>
                <td className="p-4 text-right font-medium">{formatCurrency(d.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

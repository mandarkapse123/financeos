'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, cn } from '@/lib/utils';
import { CHART_PALETTE } from '@/lib/types';

export default function GoalsPage() {
  const { state, refresh, store } = useStore();
  const { goals } = state;

  return (
    <div className="p-6 space-y-6 text-white min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Goal Tracker</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal, idx) => {
          const color = CHART_PALETTE[idx % CHART_PALETTE.length];
          const progress = Math.min(100, Math.max(0, (goal.savedAmount / goal.targetAmount) * 100));
          const circumference = 2 * Math.PI * 44;
          const dashLen = (progress / 100) * circumference;
          
          const remaining = goal.targetAmount - goal.savedAmount;
          const monthlyContrib = goal.monthlyContrib || 1; 
          const months = remaining / monthlyContrib;
          const days = Math.ceil(months * 30.44);
          
          const yearsStr = Math.floor(days/365);
          const monthsStr = Math.floor(months);
          const weeksStr = Math.floor(days/7);
          const daysStr = days;

          return (
            <div key={goal.id} className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-semibold text-lg">{goal.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}</p>
                </div>
                <div className="relative w-[104px] h-[104px]">
                  <svg width="104" height="104" viewBox="0 0 104 104">
                    <circle cx="52" cy="52" r="44" stroke="#1c1c30" fill="none" strokeWidth="9" />
                    <circle cx="52" cy="52" r="44" stroke={color} fill="none" strokeWidth="9" strokeDasharray={`${dashLen} ${circumference}`} strokeLinecap="round" transform="rotate(-90 52 52)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold">
                    {Math.round(progress)}%
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-2 uppercase font-semibold tracking-wider">Estimated Time Remaining</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-900 rounded p-2 text-center">
                  <div className="text-lg font-bold">{yearsStr > 0 ? yearsStr : '-'}</div>
                  <div className="text-[10px] text-gray-400">Years</div>
                </div>
                <div className="bg-gray-900 rounded p-2 text-center">
                  <div className="text-lg font-bold">{monthsStr > 0 ? monthsStr : '-'}</div>
                  <div className="text-[10px] text-gray-400">Months</div>
                </div>
                <div className="bg-gray-900 rounded p-2 text-center">
                  <div className="text-lg font-bold">{weeksStr > 0 ? weeksStr : '-'}</div>
                  <div className="text-[10px] text-gray-400">Weeks</div>
                </div>
                <div className="bg-gray-900 rounded p-2 text-center">
                  <div className="text-lg font-bold">{daysStr > 0 ? daysStr : '-'}</div>
                  <div className="text-[10px] text-gray-400">Days</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

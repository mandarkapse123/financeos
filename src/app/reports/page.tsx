'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';

export default function ReportsPage() {
  const [tab, setTab] = useState('Overview');
  const tabs = ['Overview', 'Income', 'Expenses', 'Portfolio'];

  return (
    <div className="p-6 space-y-6 text-white min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
        <button className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">Export CSV</button>
      </div>

      <div className="flex border-b border-gray-800">
        {tabs.map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            {t}
          </button>
        ))}
      </div>
      
      <div className="bg-[#0e0e1c] p-6 rounded-xl border border-gray-800 min-h-[400px] flex items-center justify-center">
        <p className="text-gray-500">{tab} charts and analytics will appear here.</p>
      </div>
    </div>
  );
}

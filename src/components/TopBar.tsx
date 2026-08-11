'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function TopBar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();
  
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return { title: 'Dashboard', subtitle: 'Overview of your finances' };
      case '/income': return { title: 'Income', subtitle: 'Track your earnings' };
      case '/expenses': return { title: 'Expenses', subtitle: 'Manage your spending' };
      case '/subscriptions': return { title: 'Subscriptions', subtitle: 'Recurring payments' };
      case '/investments': return { title: 'Investments', subtitle: 'Portfolio tracking' };
      case '/goals': return { title: 'Goals', subtitle: 'Financial targets' };
      case '/daily': return { title: 'Daily Log', subtitle: 'Day-to-day tracking' };
      case '/reports': return { title: 'Reports', subtitle: 'Analytics and insights' };
      case '/rent': return { title: 'Rent Portal', subtitle: 'Property management' };
      case '/settings': return { title: 'Settings', subtitle: 'System configuration' };
      default: return { title: 'FinanceOS', subtitle: 'Personal Finance Hub' };
    }
  };

  const { title, subtitle } = getPageTitle(pathname || '/');
  
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <header className="h-[72px] bg-[#0e0e1c]/80 backdrop-blur-md border-b border-white/[0.07] sticky top-0 z-40 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="flex flex-col">
          <h1 className="text-white text-lg md:text-xl font-semibold leading-tight tracking-tight">{title}</h1>
          <span className="text-white/40 text-xs hidden md:inline-block font-medium">{subtitle}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:block text-white/40 text-sm font-medium">
          {dateStr}
        </div>
        <button className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_25px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Quick Add
        </button>
      </div>
    </header>
  );
}

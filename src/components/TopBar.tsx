'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { formatCurrency, formatFull, today } from '@/lib/utils';
import { 
  Menu, Plus, Sun, Moon, Sparkles, TrendingUp, 
  Fuel, ShieldCheck, DollarSign, Package, PanelLeft, PanelLeftClose, Bot
} from 'lucide-react';

interface TopBarProps {
  onMenuToggle?: () => void;
  onQuickAdd?: () => void;
  onOpenCopilot?: () => void;
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (val: boolean) => void;
}

export default function TopBar({ 
  onMenuToggle, 
  onQuickAdd,
  onOpenCopilot,
  sidebarCollapsed = false,
  setSidebarCollapsed 
}: TopBarProps) {
  const pathname = usePathname();
  const { state, store, refresh } = useStore();
  const currentTheme = state.settings.theme || 'dark';

  const [dateTimeStr, setDateTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateTimeStr(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }) + ' · ' + now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    store.toggleTheme();
    refresh();
  };

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return { title: 'Dashboard', subtitle: 'Overview & Net Worth' };
      case '/income': return { title: 'Income', subtitle: 'Earnings & Cash Flow' };
      case '/expenses': return { title: 'Expenses', subtitle: 'Category Budgets & Fuel' };
      case '/subscriptions': return { title: 'Subscriptions', subtitle: 'Recurring Memberships' };
      case '/investments': return { title: 'Investments', subtitle: 'Portfolio Holdings & Allocation' };
      case '/goals': return { title: 'Goals', subtitle: 'Financial Target Progress' };
      case '/daily': return { title: 'Daily Log', subtitle: 'Daily Expenses & Activity' };
      case '/inventory': return { title: 'Pantry & Inventory', subtitle: 'Blinkit Invoices & Grocery Stock' };
      case '/reports': return { title: 'Reports', subtitle: 'Financial Analytics' };
      case '/rent': return { title: 'Rent Portal', subtitle: 'Property Ledger & Expenses' };
      case '/settings': return { title: 'Settings', subtitle: 'Configuration & Sync' };
      default: return { title: 'FinanceOS', subtitle: 'Personal Finance Hub' };
    }
  };

  const { title, subtitle } = getPageTitle(pathname || '/');

  // Compute live metrics for ticker
  const currentMonth = today().substring(0, 7);
  const monthlyExpenses = (state.daily || [])
    .filter(e => (e.date || '').substring(0, 7) === currentMonth)
    .reduce((sum, e) => sum + e.amount, 0);

  const portfolioValue = (state.investments || []).reduce((sum, i) => sum + (i.currentValue || i.investedAmount || 0), 0);
  const inStockItems = (store.getInventory() || []).filter(i => i.status === 'in_stock');
  const inventoryValue = inStockItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const allPossibleTickerItems: Record<string, { label: string; val: string; icon: string; color: string }> = {
    nifty: { label: 'NIFTY 50', val: '24,823.15 (+0.42%)', icon: '📈', color: 'text-emerald-400' },
    petrol: { label: 'PUNE PETROL', val: '₹104.20/L', icon: '⛽', color: 'text-rose-400' },
    spend: { label: 'MONTHLY SPEND', val: `₹${monthlyExpenses.toLocaleString('en-IN')}`, icon: '💸', color: 'text-amber-400' },
    portfolio: { label: 'PORTFOLIO', val: `₹${portfolioValue.toLocaleString('en-IN')}`, icon: '💎', color: 'text-purple-300' },
    pantry: { label: 'PANTRY STOCK', val: `${inStockItems.length} items (₹${inventoryValue.toLocaleString('en-IN')})`, icon: '📦', color: 'text-cyan-400' },
    bitcoin: { label: 'BITCOIN', val: '₹52,48,200 (+1.8%)', icon: '🪙', color: 'text-yellow-400' },
    sync: { label: 'CLOUD SYNC', val: 'Supabase Live', icon: '⚡', color: 'text-emerald-400' },
    user: { label: 'ACTIVE USER', val: state.settings.name || 'Mandar', icon: '👤', color: 'text-indigo-300' },
  };

  const userTickerPrefs = state.settings.tickerPreferences || Object.keys(allPossibleTickerItems);
  const activeTickerItems = userTickerPrefs
    .map(key => allPossibleTickerItems[key])
    .filter(Boolean);

  const finalTickerItems = activeTickerItems.length > 0 
    ? activeTickerItems 
    : Object.values(allPossibleTickerItems);

  return (
    <div className="sticky top-0 z-40 w-full flex flex-col">
      {/* Main TopBar Header */}
      <header className="h-[58px] bg-[#050508]/90 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between px-4 md:px-6">
        {/* Left Side: Mobile toggle + Desktop collapse toggle + Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <Menu size={20} />
          </button>

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={() => setSidebarCollapsed?.(!sidebarCollapsed)}
            className="hidden md:flex p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <div className="flex items-baseline gap-2.5">
            <h1 className="text-white text-base md:text-lg font-bold leading-none tracking-tight">{title}</h1>
            <span className="text-gray-500 text-xs hidden sm:inline-block font-medium">· {subtitle}</span>
          </div>
        </div>

        {/* Right Side: Clock + Theme Switcher + AI Copilot Button + Quick Add Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* High-Contrast Live Date/Time Badge */}
          <div className="hidden lg:flex items-center gap-2 text-white bg-white/10 dark:bg-white/5 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-mono font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-200">{dateTimeStr || 'Loading...'}</span>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center justify-center"
            title="Toggle light/dark theme"
          >
            {currentTheme === 'light' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-purple-300" />}
          </button>

          {/* AI Copilot Side Panel Trigger Button */}
          <button
            onClick={onOpenCopilot}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-purple-600/10 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            title="Open Agent-Native Copilot Side Panel (⌘K)"
          >
            <Sparkles size={13} className="text-purple-400" />
            <span className="hidden sm:inline">AI Copilot</span>
            <kbd className="hidden md:inline-block text-[9px] bg-black/40 px-1.5 py-0.2 rounded border border-purple-500/20 text-purple-300 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Quick Add Button */}
          <button
            onClick={onQuickAdd}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg shadow-purple-600/25 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 border border-purple-500/30"
          >
            <Plus size={14} className="stroke-[3]" />
            <span className="hidden sm:inline">Quick Add</span>
          </button>
        </div>
      </header>

      {/* Live Financial Horizontal Ticker Bar */}
      <div className="h-[28px] bg-[#090912] border-b border-white/[0.06] overflow-hidden flex items-center relative select-none">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#090912] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#090912] to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee flex items-center gap-6 text-[11px] font-medium whitespace-nowrap">
          {[...finalTickerItems, ...finalTickerItems].map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-2">
              <span className="text-xs">{item.icon}</span>
              <span className="text-gray-400 font-semibold">{item.label}:</span>
              <span className={`font-mono font-bold ${item.color}`}>{item.val}</span>
              <span className="text-gray-700 ml-4 font-thin">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

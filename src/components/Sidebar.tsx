'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { APP_VERSION, BUILD_NUMBER } from '@/lib/version';
import { 
  LayoutDashboard, TrendingUp, Receipt, Repeat, 
  Briefcase, Target, CalendarDays, Package, 
  Home, BarChart3, Settings, ChevronLeft, ChevronRight, 
  Sparkles, Check, ChevronDown
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (val: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (val: boolean) => void;
}

export default function Sidebar({ 
  mobileOpen, 
  setMobileOpen,
  collapsed = false,
  setCollapsed
}: SidebarProps) {
  const pathname = usePathname();
  const { state, store, refresh } = useStore();

  const accounts = store.getAccounts();
  const currentAccountId = state.currentAccountId;
  const currentAccount = accounts.find(a => a.id === currentAccountId) || accounts[0] || { id: 'default', name: 'Personal' };

  const userName = state.settings.name || 'Mandar';
  const userInitials = userName.charAt(0).toUpperCase();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSwitchAccount = (accountId: string) => {
    store.setCurrentAccount(accountId);
    refresh();
    setDropdownOpen(false);
  };

  const navSections = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Money',
      items: [
        { label: 'Income', href: '/income', icon: TrendingUp },
        { label: 'Expenses', href: '/expenses', icon: Receipt },
        { label: 'Subscriptions', href: '/subscriptions', icon: Repeat }
      ]
    },
    {
      title: 'Wealth',
      items: [
        { label: 'Investments', href: '/investments', icon: Briefcase },
        { label: 'Goals', href: '/goals', icon: Target }
      ]
    },
    {
      title: 'Daily & Pantry',
      items: [
        { label: 'Daily Log', href: '/daily', icon: CalendarDays },
        { label: 'Inventory', href: '/inventory', icon: Package }
      ]
    },
    {
      title: 'Property',
      items: [
        { label: 'Rent Portal', href: '/rent', icon: Home }
      ]
    },
    {
      title: 'System',
      items: [
        { label: 'Reports', href: '/reports', icon: BarChart3 },
        { label: 'Settings', href: '/settings', icon: Settings }
      ]
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-[#050509]/95 backdrop-blur-xl border-r border-white/[0.08] z-50 flex flex-col transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[248px]'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b border-white/[0.06] flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
              <span className="text-lg">💎</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-white font-bold tracking-tight text-sm flex items-center gap-1.5">
                  FinanceOS
                  <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 font-semibold rounded-full border border-purple-500/30">v2</span>
                </span>
                <span className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Personal Hub</span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle Button */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed?.(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!collapsed ? (
                <h3 className="text-[10px] font-bold text-gray-500 px-3 uppercase tracking-wider mb-1.5">
                  {section.title}
                </h3>
              ) : (
                <div className="h-px bg-white/[0.06] my-2 mx-2" />
              )}

              {section.items.map((item, itemIdx) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    onClick={() => setMobileOpen?.(false)}
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-xs font-semibold ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(124,58,237,0.12)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Icon size={17} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-white'}`} />
                    
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}

                    {/* Floating Tooltip in Collapsed Mode */}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#141426] border border-white/10 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapsed Expand Trigger at Bottom */}
        {collapsed && (
          <div className="p-3 border-t border-white/[0.06] flex justify-center hidden md:flex">
            <button
              onClick={() => setCollapsed?.(false)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* User / Account Footer */}
        <div className="p-3 border-t border-white/[0.06] bg-black/30">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors ${collapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
                  {userInitials}
                </div>
                {!collapsed && (
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-bold text-white truncate">{userName}</span>
                    <span className="text-[10px] text-gray-400 truncate">Account: {currentAccount.name}</span>
                  </div>
                )}
              </div>
              {!collapsed && (
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Account Switcher Dropdown */}
            {dropdownOpen && (
              <div className={`absolute bottom-full mb-2 bg-[#121220] border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 ${collapsed ? 'left-full ml-2 w-48' : 'left-0 right-0'}`}>
                <div className="text-[10px] font-bold text-gray-400 uppercase px-2 py-1">Switch Account</div>
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => handleSwitchAccount(acc.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      acc.id === currentAccountId
                        ? 'bg-purple-600/20 text-purple-300'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{acc.name}</span>
                    {acc.id === currentAccountId && <Check size={12} className="text-purple-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-gray-500 px-1">
              <span>{APP_VERSION}</span>
              <span className="text-emerald-400/80">{BUILD_NUMBER}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

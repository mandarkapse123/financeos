'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store-context';

export default function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen?: boolean, setMobileOpen?: (val: boolean) => void }) {
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
      items: [{ label: '📊 Dashboard', href: '/' }]
    },
    {
      title: 'Money',
      items: [
        { label: '💰 Income', href: '/income' },
        { label: '🧾 Expenses', href: '/expenses' },
        { label: '🔄 Subscriptions', href: '/subscriptions' }
      ]
    },
    {
      title: 'Wealth',
      items: [
        { label: '📈 Investments', href: '/investments' },
        { label: '🎯 Goals', href: '/goals' }
      ]
    },
    {
      title: 'Daily',
      items: [
        { label: '📅 Daily Log', href: '/daily' }
      ]
    },
    {
      title: 'Property',
      items: [
        { label: '🏠 Rent Portal', href: '/rent' }
      ]
    },
    {
      title: 'System',
      items: [
        { label: '📉 Reports', href: '/reports' },
        { label: '⚙️ Settings', href: '/settings' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[248px] bg-[#0e0e1c] border-r border-white/[0.07] z-50 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]">💎</span>
            <div className="flex flex-col">
              <span className="text-white font-semibold tracking-tight text-lg">FinanceOS</span>
              <span className="text-white/40 text-[10px] uppercase tracking-wider font-medium">Personal Hub</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="sidebar-section-title text-[10px] font-extrabold mb-3 px-3 uppercase tracking-wider">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item, itemIdx) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      onClick={() => setMobileOpen?.(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                        isActive
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(124,58,237,0.05)]'
                          : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Account / Persona Switcher Dropdown */}
        {dropdownOpen && (
          <div className="absolute bottom-20 left-4 right-4 bg-[#141426] border border-white/[0.13] rounded-xl shadow-2xl p-2 z-50 animate-fade-in space-y-1">
            <div className="text-[10px] font-bold text-white/40 uppercase px-2 py-1 tracking-wider">
              Select Account / Persona
            </div>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => handleSwitchAccount(acc.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  currentAccountId === acc.id
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span>{acc.name}</span>
                <span className="text-xs opacity-60 capitalize">({acc.type})</span>
              </button>
            ))}
            <Link
              href="/settings"
              onClick={() => setDropdownOpen(false)}
              className="block w-full text-center text-xs text-purple-400 hover:text-purple-300 py-1.5 border-t border-white/10 mt-1 font-semibold"
            >
              + Manage Accounts in Settings
            </Link>
          </div>
        )}

        {/* Footer Profile */}
        <div className="p-4 border-t border-white/[0.07] bg-[#0e0e1c] relative z-40">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                {userInitials}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-white text-sm font-medium truncate group-hover:text-purple-300 transition-colors">{userName}</span>
                <span className="text-white/40 text-xs truncate">Account: {currentAccount.name}</span>
              </div>
            </div>
            <svg className={`w-4 h-4 text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

      </aside>
    </>
  );
}

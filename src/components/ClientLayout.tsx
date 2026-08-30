'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import QuickAddModal from './QuickAddModal';
import { ToastProvider } from './Toast';
import { StoreProvider } from '@/lib/store-context';
import { Agentation } from 'agentation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <StoreProvider>
      <ToastProvider>
        <div className="flex min-h-screen w-full bg-[#070710] text-slate-100">
          <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
          <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:ml-[248px]">
            <TopBar
              onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
              onQuickAdd={() => setQuickAddOpen(true)}
            />
            <main className="flex-1 p-4 md:p-8 animate-fade-in">
              {children}
            </main>
          </div>
        </div>

        <QuickAddModal
          isOpen={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
        />

        {typeof window !== 'undefined' && <Agentation />}
      </ToastProvider>
    </StoreProvider>
  );
}

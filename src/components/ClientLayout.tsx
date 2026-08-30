'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import QuickAddModal from './QuickAddModal';
import { ToastProvider } from './Toast';
import { StoreProvider } from '@/lib/store-context';
import { Agentation } from 'agentation';
import AgentCopilot from './AgentCopilot';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Read saved collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('financeos_sidebar_collapsed');
      if (saved === 'true') setSidebarCollapsed(true);
    } catch {}
  }, []);

  const handleToggleCollapse = (val: boolean) => {
    setSidebarCollapsed(val);
    try {
      localStorage.setItem('financeos_sidebar_collapsed', val ? 'true' : 'false');
    } catch {}
  };

  return (
    <StoreProvider>
      <ToastProvider>
        <div className="flex min-h-screen w-full bg-[#000000] text-slate-100 selection:bg-purple-500/30">
          <Sidebar 
            mobileOpen={mobileMenuOpen} 
            setMobileOpen={setMobileMenuOpen} 
            collapsed={sidebarCollapsed}
            setCollapsed={handleToggleCollapse}
          />
          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[248px]'
          }`}>
            <TopBar
              onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
              onQuickAdd={() => setQuickAddOpen(true)}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={handleToggleCollapse}
            />
            <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        </div>

        <QuickAddModal
          isOpen={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
        />

        <AgentCopilot />

        {typeof window !== 'undefined' && <Agentation />}
      </ToastProvider>
    </StoreProvider>
  );
}

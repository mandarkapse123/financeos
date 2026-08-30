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
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Read saved collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('financeos_sidebar_collapsed');
      if (saved === 'true') setSidebarCollapsed(true);
    } catch {}
  }, []);

  // Global Cmd+K / Ctrl+K shortcut to toggle Copilot side panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCopilotOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        <div className="flex min-h-screen w-full bg-[var(--background)] text-[var(--foreground)] selection:bg-purple-500/30 overflow-x-hidden">
          {/* Left Sidebar */}
          <Sidebar 
            mobileOpen={mobileMenuOpen} 
            setMobileOpen={setMobileMenuOpen} 
            collapsed={sidebarCollapsed}
            setCollapsed={handleToggleCollapse}
          />

          {/* Main Content Area that dynamically squeezes for both Left Sidebar and Right Copilot */}
          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[248px]'
          } ${
            copilotOpen ? 'xl:mr-[400px]' : ''
          }`}>
            <TopBar
              onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
              onQuickAdd={() => setQuickAddOpen(true)}
              onOpenCopilot={() => setCopilotOpen(prev => !prev)}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={handleToggleCollapse}
            />
            <main className="flex-1 p-4 md:p-6 lg:p-7 animate-fade-in w-full">
              {children}
            </main>
          </div>

          {/* Docked Right Agent Copilot Panel */}
          <AgentCopilot 
            isOpen={copilotOpen}
            setIsOpen={setCopilotOpen}
          />
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

'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { ToastProvider } from './Toast';
// Ensure that '@/lib/store-context' is defined by the user
import { StoreProvider } from '@/lib/store-context';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <StoreProvider>
      <ToastProvider>
        <div className="flex min-h-screen w-full bg-[#070710]">
          <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
          <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:ml-[248px]">
            <TopBar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
            <main className="flex-1 p-4 md:p-8 animate-fade-in">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </StoreProvider>
  );
}

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      
      <div className="fixed bottom-6 right-6 z-[1050] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id}
            className={`
              pointer-events-auto animate-fade-in flex items-center p-4 bg-[#141426] border border-white/[0.13] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] min-w-[300px] max-w-md
              ${t.type === 'success' ? 'border-l-4 border-l-green-500' : ''}
              ${t.type === 'error' ? 'border-l-4 border-l-red-500' : ''}
              ${t.type === 'info' ? 'border-l-4 border-l-blue-500' : ''}
            `}
          >
            <div className="flex-1 text-white text-sm font-medium">{t.message}</div>
            <button 
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="ml-4 text-white/40 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

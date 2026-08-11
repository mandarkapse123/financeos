'use client';

import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-[#0e0e1c] border border-white/[0.13] rounded-2xl max-w-[510px] w-full shadow-2xl flex flex-col animate-fade-in scale-100 opacity-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/[0.07]">
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 md:p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="p-5 md:p-6 border-t border-white/[0.07] bg-[#141426] rounded-b-2xl">
            {footer}
          </div>
        )}
        
      </div>
    </div>
  );
}

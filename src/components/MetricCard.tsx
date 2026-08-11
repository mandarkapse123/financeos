'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trendDirection?: 'up' | 'down' | 'neutral';
  trendColor?: string;
}

export default function MetricCard({ 
  label, 
  value, 
  subtitle, 
  icon, 
  trendDirection, 
  trendColor 
}: MetricCardProps) {
  return (
    <div className="relative bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
      {/* Top 2px gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500/80 via-purple-400/50 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">{label}</span>
          <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
          
          {subtitle && (
            <div className="mt-3 flex items-center gap-2">
              {trendDirection === 'up' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={trendColor || "#22c55e"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              )}
              {trendDirection === 'down' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={trendColor || "#ef4444"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                  <polyline points="17 18 23 18 23 12"></polyline>
                </svg>
              )}
              <span className={`text-xs font-medium ${trendColor ? '' : 'text-white/40'}`} style={trendColor ? { color: trendColor } : {}}>
                {subtitle}
              </span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="text-white opacity-25 p-3 bg-white/5 rounded-xl group-hover:opacity-40 group-hover:scale-110 transition-all duration-300">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getStore, generateId } from './store';
import type { AppState } from './types';

interface StoreContextValue {
  state: AppState;
  store: ReturnType<typeof getStore>;
  refresh: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => getStore());
  const [state, setState] = useState<AppState>(() => store.getState());

  const refresh = useCallback(() => {
    setState({ ...store.getState() });
  }, [store]);

  useEffect(() => {
    const unsub = store.subscribe(refresh);

    // Automatic Cloud Sync across all devices (PC ↔ iPad ↔ Phone)
    const autoSync = async () => {
      // 1. Fetch from server cloud endpoint /api/sync
      try {
        const res = await fetch('/api/sync', { cache: 'no-store' });
        const json = await res.json();
        if (json && json.state) {
          store.importFullState(json.state);
        }
      } catch (err) {}

      refresh();
    };

    // Initial sync on app load
    autoSync();

    // Occasional fallback sync every 15 seconds (WebSockets handle instant real-time updates)
    const intervalId = setInterval(autoSync, 15000);

    return () => {
      unsub();
      clearInterval(intervalId);
    };
  }, [store, refresh]);

  return (
    <StoreContext.Provider value={{ state, store, refresh }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

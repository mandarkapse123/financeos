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

      // 2. Also fetch Google Apps Script backend if configured
      const endpoint = store.getState().settings.endpoint;
      if (endpoint) {
        try {
          const res = await fetch(endpoint, { method: 'GET', mode: 'cors' });
          const json = await res.json();
          if (json && json.fullState) {
            store.importFullState(json.fullState);
          }

          let items: any[] = [];
          if (Array.isArray(json)) items = json;
          else if (json && Array.isArray(json.rows)) items = json.rows;
          else if (json && Array.isArray(json.data)) items = json.data;

          store.syncSheetItems(items);
        } catch (err) {}
      }

      refresh();
    };

    // Initial sync on app load
    autoSync();

    // Polling sync every 4 seconds for instant real-time multi-device sync
    const intervalId = setInterval(autoSync, 4000);

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

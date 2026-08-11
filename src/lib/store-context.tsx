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

    // Automatic Background Google Sheet Sync
    const autoSync = async () => {
      const endpoint = store.getState().settings.endpoint;
      if (!endpoint) return;

      try {
        const res = await fetch(endpoint, { method: 'GET', mode: 'cors' });
        const json = await res.json();
        let items: any[] = [];
        if (Array.isArray(json)) items = json;
        else if (json && Array.isArray(json.rows)) items = json.rows;
        else if (json && Array.isArray(json.data)) items = json.data;

        store.syncSheetItems(items);
        refresh();
      } catch (err) {
        // Silent catch for background auto sync
      }
    };

    // Initial sync on app load
    autoSync();

    // Polling sync every 30 seconds
    const intervalId = setInterval(autoSync, 30000);

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

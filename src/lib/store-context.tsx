'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getStore } from './store';
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
    return unsub;
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

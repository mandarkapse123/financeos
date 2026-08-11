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

        if (items.length > 0) {
          let updated = false;
          items.forEach(item => {
            const amt = parseFloat(item.amount || item.amt);
            if (!isNaN(amt) && amt > 0) {
              const cat = item.category || item.cat || 'Expenses';
              const km = item.kmReading || item.km || item.odometer;
              const kmVal = km ? parseFloat(km) : undefined;
              const entryDate = item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
              const entryNote = item.note || item.description || item.method || '';
              const entryId = item.id || `sheet_${entryDate}_${amt}_${cat}_${entryNote}`;

              store.upsertDaily({
                id: entryId,
                accountId: store.getState().currentAccountId,
                amount: amt,
                category: cat,
                paymentMethod: item.method || 'UPI',
                date: entryDate,
                note: entryNote,
                kmReading: kmVal,
              });

              store.upsertExpense({
                id: entryId,
                accountId: store.getState().currentAccountId,
                name: cat === 'Petrol' ? 'Petrol Fill' : (entryNote || cat),
                amount: amt,
                category: cat,
                date: entryDate,
                note: entryNote,
                kmReading: kmVal,
              });

              updated = true;
            }
          });
          if (updated) refresh();
        }
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

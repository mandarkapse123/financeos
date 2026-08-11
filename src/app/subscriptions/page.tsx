'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, sumAmounts, monthlyAmount, CATEGORY_COLORS, SUBSCRIPTION_CATEGORIES } from '@/lib/utils';
import { Subscription } from '@/lib/types';
import { generateId } from '@/lib/store';

export default function SubscriptionsPage() {
  const { state, store, refresh } = useStore();
  const subs = store.getSubscriptions();
  const currency = state.settings.currency;
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  
  const totalMonthly = sumAmounts(subs.map(s => ({ amount: monthlyAmount(s) })));
  const totalYearly = totalMonthly * 12;
  const activeSubs = subs.length;

  const today = new Date().toISOString().split('T')[0];
  const upcomingRenewals = subs.filter(s => {
    if (!s.renewalDate) return false;
    const diff = (new Date(s.renewalDate).getTime() - new Date(today).getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item = {
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      cycle: formData.get('cycle') as any,
      renewalDate: formData.get('renewalDate') as string,
      category: formData.get('category') as string,
      icon: formData.get('icon') as string || '✨',
      note: formData.get('note') as string,
    };
    store.upsertSubscription(item);
    refresh();
    setModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      <div className="flex justify-between items-center bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-gray-400">Manage your recurring payments and services</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg font-medium">
          + Add Subscription
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Monthly Cost', val: formatCurrency(totalMonthly, currency) },
          { label: 'Annual Projection', val: formatCurrency(totalYearly, currency) },
          { label: 'Active Subscriptions', val: activeSubs },
        ].map(m => (
          <div key={m.label} className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-sm text-gray-400">{m.label}</h3>
            <p className="text-2xl font-semibold mt-1 text-purple-400">{m.val}</p>
          </div>
        ))}
      </div>

      {upcomingRenewals.length > 0 && (
        <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/20 rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-rose-400 mb-3 flex items-center gap-2">
            <span>⚠️</span> Upcoming Renewals (Next 7 Days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingRenewals.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{s.icon}</div>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-rose-300">Renews on {s.renewalDate}</p>
                  </div>
                </div>
                <div className="font-semibold text-rose-400">{formatCurrency(s.amount, currency)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subs.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-[#0e0e1c] border border-white/[0.07] rounded-2xl">
            <div className="text-4xl mb-3">🔄</div>
            <p className="text-gray-400">No subscriptions tracked yet.</p>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="mt-4 px-4 py-2 bg-[#1c1c30] border border-white/10 rounded-lg hover:bg-white/5 transition">
              Add First Subscription
            </button>
          </div>
        ) : (
          subs.map(s => (
            <div key={s.id} className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 hover:border-purple-500/30 transition-colors group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditing(s); setModalOpen(true); }} className="text-purple-400 bg-purple-400/10 p-1.5 rounded-md hover:bg-purple-400/20">Edit</button>
              </div>
              <div className="text-4xl mb-4 bg-white/5 w-16 h-16 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                {s.icon}
              </div>
              <h3 className="font-semibold text-lg">{s.name}</h3>
              <p className="text-xs text-gray-400 mb-4 capitalize">{s.category} • {s.cycle}</p>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Next billing</p>
                  <p className="text-sm font-medium">{s.renewalDate || 'Unknown'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl text-emerald-400">{formatCurrency(s.amount, currency)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Subscription</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex gap-4">
                <div className="w-16">
                  <label className="block text-sm text-gray-400 mb-1">Icon</label>
                  <input name="icon" defaultValue={editing?.icon || '✨'} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-center text-xl" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input required name="name" defaultValue={editing?.name || ''} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount</label>
                  <input required type="number" step="0.01" name="amount" defaultValue={editing?.amount || ''} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Billing Cycle</label>
                  <select name="cycle" defaultValue={editing?.cycle || 'monthly'} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Next Renewal</label>
                  <input required type="date" name="renewalDate" defaultValue={editing?.renewalDate || new Date().toISOString().split('T')[0]} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select name="category" defaultValue={editing?.category || SUBSCRIPTION_CATEGORIES[0]} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                    {SUBSCRIPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Note (Optional)</label>
                <input name="note" defaultValue={editing?.note || ''} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-[#1c1c30] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

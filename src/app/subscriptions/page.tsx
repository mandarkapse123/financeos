'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, sumAmounts, monthlyAmount, CATEGORY_COLORS, SUBSCRIPTION_CATEGORIES, formatDate } from '@/lib/utils';
import { Subscription } from '@/lib/types';
import { generateId } from '@/lib/store';

export default function SubscriptionsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store, refresh } = useStore();
  const subs = store.getSubscriptions();
  const currency = state.settings.currency;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  if (!mounted) return null;

  const totalMonthly = sumAmounts(subs.map(s => ({ amount: monthlyAmount(s) })));
  const totalYearly = totalMonthly * 12;
  const activeSubs = subs.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingRenewals = subs.filter(s => {
    if (!s.renewalDate) return false;
    const diff = (new Date(s.renewalDate).getTime() - new Date(todayStr).getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item: Subscription = {
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
    <div className="w-full space-y-6 text-white min-h-screen">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions & Recurring Services</h1>
          <p className="text-gray-400 text-sm">Manage recurring payments, renewal reminders, and monthly projections</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:-translate-y-0.5"
        >
          + Add Subscription
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Monthly Cost', val: formatCurrency(totalMonthly, currency), color: 'text-purple-400' },
          { label: 'Annual Projection', val: formatCurrency(totalYearly, currency), color: 'text-purple-400' },
          { label: 'Active Subscriptions', val: `${activeSubs}`, color: 'text-emerald-400' },
        ].map((m) => (
          <div key={m.label} className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 shadow-md">
            <h3 className="text-xs text-gray-400 font-semibold uppercase">{m.label}</h3>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Renewals Warning Card */}
      {upcomingRenewals.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
            <span>⚠️</span> Upcoming Renewals (Next 7 Days)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {upcomingRenewals.map((sub) => (
              <div key={sub.id} className="bg-black/30 border border-white/10 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sub.icon || '✨'}</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">{sub.name}</h4>
                    <p className="text-xs text-amber-300 font-medium">Renews: {formatDate(sub.renewalDate)}</p>
                  </div>
                </div>
                <span className="font-bold text-purple-300 text-sm">{formatCurrency(sub.amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {subs.map((sub) => (
          <div key={sub.id} className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 space-y-4 hover:border-purple-500/30 transition-all shadow-lg">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl">
                {sub.icon || '✨'}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditing(sub); setModalOpen(true); }}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => { store.deleteSubscription(sub.id); refresh(); }}
                  className="p-1.5 text-gray-400 hover:text-rose-400 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg text-white">{sub.name}</h3>
              <p className="text-xs text-gray-400 capitalize">{sub.category} • {sub.cycle}</p>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">NEXT BILLING</span>
                <span className="text-xs text-purple-300 font-medium">{sub.renewalDate ? formatDate(sub.renewalDate) : 'Not set'}</span>
              </div>
              <span className="text-xl font-bold text-purple-400">{formatCurrency(sub.amount, currency)}</span>
            </div>
          </div>
        ))}
      </div>

      {subs.length === 0 && (
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-12 text-center space-y-4">
          <span className="text-5xl block">🔄</span>
          <h2 className="text-xl font-bold">No Subscriptions Added</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Track Netflix, Spotify, iCloud, Gym memberships and get automatic renewal reminders 2 days prior!
          </p>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-lg"
          >
            + Add First Subscription
          </button>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUBSCRIPTION */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">{editing ? 'Edit Subscription' : 'Add Subscription'}</h3>
            <form onSubmit={handleSave} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Service Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editing?.name || ''}
                  placeholder="e.g. Netflix, Spotify, iCloud"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    name="amount"
                    required
                    defaultValue={editing?.amount || ''}
                    placeholder="649"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Billing Cycle</label>
                  <select
                    name="cycle"
                    defaultValue={editing?.cycle || 'monthly'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    <option value="monthly" className="bg-[#141426]">Monthly</option>
                    <option value="yearly" className="bg-[#141426]">Yearly</option>
                    <option value="quarterly" className="bg-[#141426]">Quarterly</option>
                    <option value="weekly" className="bg-[#141426]">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editing?.category || 'Streaming'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    {SUBSCRIPTION_CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-[#141426]">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Icon Emoji</label>
                  <input
                    type="text"
                    name="icon"
                    defaultValue={editing?.icon || '🎬'}
                    placeholder="🎬"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Next Renewal Date</label>
                <input
                  type="date"
                  name="renewalDate"
                  defaultValue={editing?.renewalDate || new Date().toISOString().split('T')[0]}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  name="note"
                  defaultValue={editing?.note || ''}
                  placeholder="e.g. 4K UHD family plan"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

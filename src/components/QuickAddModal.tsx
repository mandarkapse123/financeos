'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { useStore } from '@/lib/store-context';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, CATEGORY_ICONS } from '@/lib/types';
import { useToast } from './Toast';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { state, store, refresh } = useStore();
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('HDFC Bank');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0] || 'Petrol');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [kmReading, setKmReading] = useState('');

  const allCategories = [
    ...EXPENSE_CATEGORIES,
    ...(state.settings.customCategories || [])
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || isNaN(numAmt)) {
      toast('Please enter a valid amount', 'error');
      return;
    }

    store.upsertDaily({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      accountId: state.currentAccountId,
      bankAccount,
      amount: numAmt,
      category,
      paymentMethod,
      date,
      note,
      kmReading: kmReading ? parseFloat(kmReading) : undefined,
    });

    refresh();
    toast('Expense logged successfully!', 'success');
    setAmount('');
    setNote('');
    setKmReading('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Quick Add Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">
            Amount ({state.settings.currency || '₹'})
          </label>
          <input
            type="number"
            step="any"
            required
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-2xl font-bold text-center bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block mb-1">
            🏦 Bank Account
          </label>
          <select
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
          >
            <option value="HDFC Bank" className="bg-[#141426]">🏦 HDFC Bank</option>
            <option value="ICICI Bank" className="bg-[#141426]">🏦 ICICI Bank</option>
            <option value="SBI Bank" className="bg-[#141426]">🏦 SBI Bank</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#141426] text-white">
                  {CATEGORY_ICONS[cat] || '📦'} {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm} className="bg-[#141426] text-white">
                  {pm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(category === 'Petrol' || category === 'Transport') && (
          <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-xl">
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block mb-1">
              ⛽ Odometer / KM Reading
            </label>
            <input
              type="number"
              placeholder="e.g. 45280"
              value={kmReading}
              onChange={(e) => setKmReading(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Lunch, Coffee, Petrol"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/30"
          >
            Save Expense
          </button>
        </div>
      </form>
    </Modal>
  );
}

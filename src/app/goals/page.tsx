'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CHART_PALETTE, Goal } from '@/lib/types';
import { generateId } from '@/lib/store';

export default function GoalsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, refresh, store } = useStore();
  const goals = store.getGoals();
  const currency = state.settings.currency;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyContrib, setMonthlyContrib] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#7c3aed');
  const [note, setNote] = useState('');

  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');

  if (!mounted) return null;

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    if (!name || !target || isNaN(target)) return;

    store.upsertGoal({
      id: generateId(),
      accountId: state.currentAccountId,
      name,
      targetAmount: target,
      savedAmount: parseFloat(savedAmount) || 0,
      monthlyContrib: parseFloat(monthlyContrib) || 0,
      targetDate: targetDate || '',
      color,
      note,
      contributions: [],
    });

    refresh();
    setAddModalOpen(false);
    resetForm();
  };

  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amt = parseFloat(contribAmount);
    if (!amt || isNaN(amt)) return;

    store.addContribution(selectedGoal.id, {
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      note: contribNote,
    });

    refresh();
    setContribModalOpen(false);
    setContribAmount('');
    setContribNote('');
    setSelectedGoal(null);
  };

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setMonthlyContrib('');
    setSavedAmount('');
    setTargetDate('');
    setColor('#7c3aed');
    setNote('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financial Goal Tracker</h1>
          <p className="text-gray-400 text-sm">Set savings targets and track years/months/weeks/days to completion</p>
        </div>
        <button
          onClick={() => { resetForm(); setAddModalOpen(true); }}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> New Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal, idx) => {
          const goalColor = goal.color || CHART_PALETTE[idx % CHART_PALETTE.length];
          const saved = goal.savedAmount || 0;
          const target = goal.targetAmount || 1;
          const progress = Math.min(100, Math.max(0, (saved / target) * 100));

          const circumference = 2 * Math.PI * 44;
          const dashLen = (progress / 100) * circumference;

          const remaining = Math.max(0, target - saved);
          const contrib = goal.monthlyContrib || 0;
          const months = contrib > 0 ? remaining / contrib : 0;
          const days = Math.ceil(months * 30.44);

          const yearsVal = Math.floor(days / 365);
          const monthsVal = Math.floor(months);
          const weeksVal = Math.floor(days / 7);
          const daysVal = days;

          return (
            <div
              key={goal.id}
              className="bg-[#0e0e1c] p-6 rounded-2xl border border-white/[0.07] space-y-6 relative overflow-hidden transition-all hover:border-white/20 hover:-translate-y-1 shadow-xl"
              style={{ borderTop: `3px solid ${goalColor}` }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-white">{goal.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{goal.note || 'Target Goal'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setSelectedGoal(goal); setContribModalOpen(true); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                  >
                    + Add
                  </button>
                  <button
                    onClick={() => { store.deleteGoal(goal.id); refresh(); }}
                    className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress Ring & Numbers */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-[104px] h-[104px] flex-shrink-0">
                  <svg width="104" height="104" viewBox="0 0 104 104">
                    <circle cx="52" cy="52" r="44" stroke="#1c1c30" fill="none" strokeWidth="9" />
                    <circle
                      cx="52"
                      cy="52"
                      r="44"
                      stroke={goalColor}
                      fill="none"
                      strokeWidth="9"
                      strokeDasharray={`${dashLen} ${circumference}`}
                      strokeLinecap="round"
                      transform="rotate(-90 52 52)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold" style={{ color: goalColor }}>
                      {Math.round(progress)}%
                    </span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Saved</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">SAVED AMOUNT</span>
                    <span className="text-base font-bold" style={{ color: goalColor }}>
                      {formatCurrency(saved, currency)}
                    </span>
                  </div>
                  <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">TARGET</span>
                    <span className="text-base font-bold text-white">
                      {formatCurrency(target, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Time Breakdown Cards */}
              <div>
                <p className="text-xs text-gray-400 mb-2 uppercase font-semibold tracking-wider">
                  Estimated Time Remaining
                </p>
                {contrib > 0 && remaining > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 text-center">
                      <div className="text-base font-bold text-purple-400">{yearsVal}</div>
                      <div className="text-[9px] text-gray-500 uppercase font-semibold">Years</div>
                    </div>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 text-center">
                      <div className="text-base font-bold text-purple-400">{monthsVal}</div>
                      <div className="text-[9px] text-gray-500 uppercase font-semibold">Months</div>
                    </div>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 text-center">
                      <div className="text-base font-bold text-purple-400">{weeksVal}</div>
                      <div className="text-[9px] text-gray-500 uppercase font-semibold">Weeks</div>
                    </div>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 text-center">
                      <div className="text-base font-bold text-purple-400">{daysVal}</div>
                      <div className="text-[9px] text-gray-500 uppercase font-semibold">Days</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-400 text-center">
                    {saved >= target ? '🎉 Goal Completed!' : 'Set monthly contribution to see time estimates'}
                  </div>
                )}
              </div>

              {goal.targetDate && (
                <div className="text-xs text-gray-400 pt-2 border-t border-white/10 flex justify-between">
                  <span>Target Date:</span>
                  <span className="font-semibold text-white">{formatDate(goal.targetDate)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-12 text-center space-y-4">
          <span className="text-5xl block">🎯</span>
          <h2 className="text-xl font-bold">No Financial Goals Set Yet</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Create your first goal (e.g. New Car, Emergency Fund, House Deposit) to track exact completion time in years, months, weeks, and days!
          </p>
          <button
            onClick={() => { resetForm(); setAddModalOpen(true); }}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-lg"
          >
            + Create First Goal
          </button>
        </div>
      )}

      {/* MODAL: NEW GOAL */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">🎯 Create New Financial Goal</h3>
            <form onSubmit={handleSaveGoal} className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Car, House Deposit, Emergency Fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Amount ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 500000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Already Saved ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={savedAmount}
                    onChange={(e) => setSavedAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Monthly Contribution</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 15000"
                    value={monthlyContrib}
                    onChange={(e) => setMonthlyContrib(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Date (Optional)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Color Theme</label>
                <div className="flex gap-2">
                  {CHART_PALETTE.slice(0, 7).map((c) => (
                    <div
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Notes..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CONTRIBUTION */}
      {contribModalOpen && selectedGoal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">➕ Add Contribution to {selectedGoal.name}</h3>
            <form onSubmit={handleAddContribution} className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Contribution Amount ({currency})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-lg font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Monthly savings deposit"
                  value={contribNote}
                  onChange={(e) => setContribNote(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContribModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Add Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

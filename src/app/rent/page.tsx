'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../../lib/store-context';
import { generateId } from '../../lib/store';
import { RENT_EXPENSE_CATEGORIES } from '../../lib/types';
import type { RentEntry, RentExpense, RentReceipt } from '../../lib/types';
import { formatCurrency, formatFull, formatDate, downloadFile, cn } from '../../lib/utils';
import {
  Building2, Receipt, ArrowUpRight, ArrowDownRight, Wallet, Plus, Trash2,
  Download, Upload, X, Image as ImageIcon, BarChart3, LineChart, FileText, Activity
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Legend, Tooltip, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Legend, Tooltip, Filler);

type Tab = 'overview' | 'ledger' | 'expenses' | 'receipts';

export default function RentPortal() {
  const { state, store } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: string }[]>([]);

  // Inputs
  const [rentDate, setRentDate] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [rentMode, setRentMode] = useState('');
  const [rentNotes, setRentNotes] = useState('');
  
  const [expDate, setExpDate] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCat, setExpCat] = useState(RENT_EXPENSE_CATEGORIES[0]);
  const [expPaidBy, setExpPaidBy] = useState('');

  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const currency = state.settings.currency || '₹';
  const rentEntries = store.getRentEntries();
  const rentExpenses = store.getRentExpenses();
  const rentReceipts = store.getRentReceipts();

  const totalRent = rentEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = rentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarnings = totalRent - totalExpenses;
  
  const avgRent = rentEntries.length ? totalRent / rentEntries.length : 0;
  const yieldRate = totalRent ? ((netEarnings / totalRent) * 100).toFixed(1) : 0;

  const chartData = useMemo(() => {
    const monthlyData: Record<string, { rent: number; exp: number }> = {};
    rentEntries.forEach(e => {
      const m = e.date.substring(0, 7);
      if (!monthlyData[m]) monthlyData[m] = { rent: 0, exp: 0 };
      monthlyData[m].rent += e.amount;
    });
    rentExpenses.forEach(e => {
      const m = e.date.substring(0, 7);
      if (!monthlyData[m]) monthlyData[m] = { rent: 0, exp: 0 };
      monthlyData[m].exp += e.amount;
    });
    const labels = Object.keys(monthlyData).sort();
    return {
      labels,
      datasets: [
        {
          label: 'Rent Received',
          data: labels.map(l => monthlyData[l].rent),
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          tension: 0.3
        },
        {
          label: 'Expenses',
          data: labels.map(l => monthlyData[l].exp),
          backgroundColor: '#ef4444',
          borderColor: '#ef4444',
          tension: 0.3
        }
      ]
    };
  }, [rentEntries, rentExpenses]);

  const addRent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentDate || !rentAmount) return;
    store.upsertRentEntry({
      id: generateId(),
      accountId: state.currentAccountId,
      date: rentDate,
      amount: parseFloat(rentAmount),
      period: '',
      mode: rentMode,
      notes: rentNotes
    });
    showToast('Rent entry added');
    setRentDate(''); setRentAmount(''); setRentMode(''); setRentNotes('');
  };

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDate || !expAmount || !expDesc) return;
    store.upsertRentExpense({
      id: generateId(),
      accountId: state.currentAccountId,
      date: expDate,
      amount: parseFloat(expAmount),
      description: expDesc,
      category: expCat,
      paidBy: expPaidBy
    });
    showToast('Expense added');
    setExpDate(''); setExpAmount(''); setExpDesc(''); setExpPaidBy('');
  };

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      store.addRentReceipt({
        name: file.name,
        data: ev.target?.result as string,
        size: file.size,
        date: new Date().toISOString()
      });
      showToast('Receipt uploaded');
    };
    reader.readAsDataURL(file);
  };

  const exportCSV = () => {
    let csv = 'Type,Date,Amount,Category/Mode,Description/Notes\n';
    rentEntries.forEach(r => csv += `Rent,${r.date},${r.amount},${r.mode},${r.notes}\n`);
    rentExpenses.forEach(e => csv += `Expense,${e.date},${e.amount},${e.category},${e.description}\n`);
    downloadFile('rent_export.csv', csv, 'text/csv');
    showToast('Exported CSV');
  };

  const allActivity = [...rentEntries.map(e => ({...e, type: 'rent'})), ...rentExpenses.map(e => ({...e, type: 'expense'}))]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white bg-[#050505] min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rent Portal</h1>
          <p className="text-white/50 text-sm mt-1">Manage rental income, maintenance, and receipts.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors border border-white/10">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ArrowUpRight size={24} /></div>
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Rent Received</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(totalRent, currency)}</p>
          </div>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500"><ArrowDownRight size={24} /></div>
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Total Expenses</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(totalExpenses, currency)}</p>
          </div>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500"><Wallet size={24} /></div>
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Net Earnings</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{formatCurrency(netEarnings, currency)}</p>
          </div>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Receipt size={24} /></div>
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Receipts</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{rentReceipts.length}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/[0.07]">
        {(['overview', 'ledger', 'expenses', 'receipts'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2.5 text-sm font-medium rounded-t-lg capitalize transition-colors relative",
              activeTab === tab ? "text-white bg-white/5" : "text-white/50 hover:text-white/80 hover:bg-white/[0.02]"
            )}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold flex items-center gap-2"><BarChart3 size={18} className="text-indigo-400"/> Cash Flow</h3>
                  <div className="flex bg-white/5 rounded-lg p-1">
                    <button onClick={() => setChartType('bar')} className={cn("p-1.5 rounded-md", chartType === 'bar' ? 'bg-white/10 text-white' : 'text-white/40')}><BarChart3 size={14}/></button>
                    <button onClick={() => setChartType('line')} className={cn("p-1.5 rounded-md", chartType === 'line' ? 'bg-white/10 text-white' : 'text-white/40')}><LineChart size={14}/></button>
                  </div>
                </div>
                <div className="h-64">
                  {chartType === 'bar' ? (
                    <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  ) : (
                    <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
                  )}
                </div>
              </div>

              <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><Activity size={18} className="text-indigo-400"/> Recent Activity</h3>
                <div className="space-y-3">
                  {allActivity.slice(0, 8).map(act => (
                    <div key={act.id} className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.02]">
                      <div>
                        <p className="font-medium text-sm">{act.type === 'rent' ? 'Rent Received' : (act as any).description}</p>
                        <p className="text-xs text-white/40">{formatDate(act.date)}</p>
                      </div>
                      <p className={cn("font-medium", act.type === 'rent' ? 'text-emerald-400' : 'text-rose-400')}>
                        {act.type === 'rent' ? '+' : '-'}{formatCurrency(Number(act.amount), currency)}
                      </p>
                    </div>
                  ))}
                  {allActivity.length === 0 && <p className="text-white/40 text-sm py-4 text-center">No activity recorded</p>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><FileText size={18} className="text-indigo-400"/> Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-white/50 text-sm">Months Tracked</span>
                    <span className="font-medium">{chartData.labels.length}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-white/50 text-sm">Average Rent</span>
                    <span className="font-medium">{formatCurrency(avgRent, currency)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-white/50 text-sm">Gross Income</span>
                    <span className="font-medium text-emerald-400">{formatCurrency(totalRent, currency)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-white/50 text-sm">Total Expenses</span>
                    <span className="font-medium text-rose-400">{formatCurrency(totalExpenses, currency)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-white/50 text-sm">Net Yield</span>
                    <span className="font-medium text-purple-400">{yieldRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <form onSubmit={addRent} className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Date</label>
                <input type="date" required value={rentDate} onChange={e=>setRentDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Amount</label>
                <input type="number" required value={rentAmount} onChange={e=>setRentAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Mode</label>
                <input type="text" value={rentMode} onChange={e=>setRentMode(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="e.g. Bank Transfer" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Notes</label>
                <input type="text" value={rentNotes} onChange={e=>setRentNotes(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="Optional" />
              </div>
              <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg p-2.5 text-sm font-medium flex justify-center items-center gap-2 transition-colors">
                <Plus size={16} /> Add Rent
              </button>
            </form>

            <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#141426] text-white/50 text-xs uppercase font-bold">
                  <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Mode</th><th className="px-6 py-4">Notes</th><th className="px-6 py-4"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {rentEntries.map(e => (
                    <tr key={e.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">{formatDate(e.date)}</td>
                      <td className="px-6 py-4 font-medium text-emerald-400">{formatCurrency(Number(e.amount), currency)}</td>
                      <td className="px-6 py-4">{e.mode || '-'}</td>
                      <td className="px-6 py-4 text-white/70">{e.notes || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { store.deleteRentEntry(e.id); showToast('Deleted entry', 'error'); }} className="text-white/30 hover:text-rose-400"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {rentEntries.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-white/40">No rent entries yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <form onSubmit={addExpense} className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-6 gap-4 items-end">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Date</label>
                <input type="date" required value={expDate} onChange={e=>setExpDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-white/50 mb-1 block">Description</label>
                <input type="text" required value={expDesc} onChange={e=>setExpDesc(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="Fix plumbing" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Category</label>
                <select value={expCat} onChange={e=>setExpCat(e.target.value as any)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm">
                  {RENT_EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Amount</label>
                <input type="number" required value={expAmount} onChange={e=>setExpAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm" placeholder="0.00" />
              </div>
              <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-lg p-2.5 text-sm font-medium flex justify-center items-center gap-2 transition-colors">
                <Plus size={16} /> Add Exp
              </button>
            </form>

            <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#141426] text-white/50 text-xs uppercase font-bold">
                  <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {rentExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">{formatDate(e.date)}</td>
                      <td className="px-6 py-4">{e.description}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-white/5 rounded text-xs">{e.category}</span></td>
                      <td className="px-6 py-4 font-medium text-rose-400">-{formatCurrency(Number(e.amount), currency)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { store.deleteRentExpense(e.id); showToast('Deleted expense', 'error'); }} className="text-white/30 hover:text-rose-400"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {rentExpenses.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-white/40">No rent expenses yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <Upload size={32} className="text-white/40 mb-4" />
              <p className="font-medium">Click or drag receipt here</p>
              <p className="text-xs text-white/40 mt-2">Images up to 5MB</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileUpload} className="hidden" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {rentReceipts.map(r => (
                <div key={r.id} className="relative group rounded-xl overflow-hidden bg-[#0e0e1c] border border-white/[0.07] aspect-[3/4]">
                  {r.data ? (
                    <img src={r.data} alt={r.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setReceiptImage(r.data)} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20 p-4 text-center">
                      <ImageIcon size={24} className="mb-2" />
                      <span className="text-xs break-all">{r.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => { store.deleteRentReceipt(r.id); showToast('Receipt deleted'); }} className="p-2 bg-rose-500/80 hover:bg-rose-500 text-white rounded-full">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
                    <p className="text-[10px] text-white truncate">{r.name}</p>
                    <p className="text-[10px] text-white/50">{formatDate(r.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {receiptImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setReceiptImage(null)}>
          <button className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"><X size={24}/></button>
          <img src={receiptImage} alt="Receipt Full" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={cn("px-4 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2", t.type === 'error' ? 'bg-rose-500 text-white' : 'bg-[#1a1a2e] text-white border border-white/10')}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

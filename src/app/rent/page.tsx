'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../lib/store-context';
import { generateId } from '../../lib/store';
import { RENT_EXPENSE_CATEGORIES } from '../../lib/types';
import type { RentEntry, RentExpense, RentReceipt } from '../../lib/types';
import { formatCurrency, formatFull, formatDate, downloadFile, cn } from '../../lib/utils';
import {
  Building2, Receipt, ArrowUpRight, ArrowDownRight, Wallet, Plus, Trash2, Edit2, Pencil,
  Download, Upload, X, Image as ImageIcon, BarChart3, LineChart, FileText, Activity
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Legend, Tooltip, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Legend, Tooltip, Filler);

type Tab = 'overview' | 'ledger' | 'expenses' | 'receipts';

export default function RentPortal() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, store, refresh } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: string }[]>([]);

  // Inputs
  const [rentBankAccount, setRentBankAccount] = useState('HDFC Bank');
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

  // Date Sort Order & Editing state for Rent Entries & Rent Expenses
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [editingRentEntry, setEditingRentEntry] = useState<RentEntry | null>(null);
  const [editingRentExpense, setEditingRentExpense] = useState<RentExpense | null>(null);

  const handleSaveRentEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item: RentEntry = {
      id: editingRentEntry?.id || generateId(),
      accountId: state.currentAccountId,
      date: formData.get('date') as string,
      bankAccount: formData.get('bankAccount') as string || 'HDFC Bank',
      amount: parseFloat(formData.get('amount') as string) || 0,
      period: editingRentEntry?.period || '',
      mode: formData.get('mode') as string || '',
      notes: formData.get('notes') as string || '',
    };
    store.upsertRentEntry(item);
    refresh();
    setEditingRentEntry(null);
    showToast('Rent entry updated successfully!', 'success');
  };

  const handleSaveRentExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const item: RentExpense = {
      id: editingRentExpense?.id || generateId(),
      accountId: state.currentAccountId,
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string) || 0,
      category: formData.get('category') as string,
      paidBy: editingRentExpense?.paidBy || 'Self',
    };
    store.upsertRentExpense(item);
    refresh();
    setEditingRentExpense(null);
    showToast('Rent expense updated successfully!', 'success');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rentImportModalOpen, setRentImportModalOpen] = useState(false);
  const [parsedRentEntries, setParsedRentEntries] = useState<any[]>([]);
  const excelRentInputRef = useRef<HTMLInputElement>(null);

  const handleRentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

          const imported: any[] = [];
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const dateVal = String(row[0] || '').trim();
            const amtVal = parseFloat(String(row[1] || row[2] || '').replace(/[^0-9.]/g, ''));
            if (!isNaN(amtVal) && amtVal > 0) {
              imported.push({
                date: dateVal.length === 10 ? dateVal : new Date().toISOString().split('T')[0],
                amount: amtVal,
                period: String(row[2] || row[3] || 'Monthly Rent'),
                mode: String(row[3] || row[4] || 'Bank Transfer'),
                notes: String(row[4] || row[5] || 'Imported statement'),
                bankAccount: String(row[5] || 'HDFC Bank')
              });
            }
          }
          setParsedRentEntries(imported);
          setRentImportModalOpen(true);
        } catch (err) {
          showToast('Error parsing Excel/CSV file', 'error');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (evt) => {
        const text = String(evt.target?.result || '');
        const lines = text.split('\n');
        const imported: any[] = [];
        lines.forEach(line => {
          const numbers = line.match(/\d+[\d,.]*/g);
          if (numbers && numbers.length > 0) {
            const amt = parseFloat(numbers[numbers.length - 1].replace(/,/g, ''));
            if (!isNaN(amt) && amt >= 1000) {
              imported.push({
                date: new Date().toISOString().split('T')[0],
                amount: amt,
                period: 'Rent Payment',
                mode: 'Bank/PDF',
                notes: line.substring(0, 40),
                bankAccount: 'HDFC Bank'
              });
            }
          }
        });
        setParsedRentEntries(imported);
        setRentImportModalOpen(true);
      };
      reader.readAsText(file);
    }
  };

  const confirmRentImport = () => {
    parsedRentEntries.forEach(item => {
      store.upsertRentEntry({
        id: generateId(),
        accountId: state.currentAccountId,
        bankAccount: item.bankAccount || 'HDFC Bank',
        date: item.date,
        amount: item.amount,
        period: item.period,
        mode: item.mode,
        notes: item.notes,
      });
    });
    refresh();
    setRentImportModalOpen(false);
    showToast(`Successfully imported ${parsedRentEntries.length} rent entries!`, 'success');
  };

  const showToast = (msg: string, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const currency = state.settings.currency || '₹';
  const rentEntries = store.getRentEntries();
  const rentExpenses = store.getRentExpenses();
  const rentReceipts = store.getRentReceipts();

  // Strict Date Sorting (Newest First / Oldest First)
  const sortedRentEntries = useMemo(() => {
    return [...rentEntries].sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      return sortOrder === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    });
  }, [rentEntries, sortOrder]);

  const sortedRentExpenses = useMemo(() => {
    return [...rentExpenses].sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      return sortOrder === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    });
  }, [rentExpenses, sortOrder]);

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

  if (!mounted) return null;

  const addRent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentDate || !rentAmount) return;
    store.upsertRentEntry({
      id: generateId(),
      accountId: state.currentAccountId,
      bankAccount: rentBankAccount,
      date: rentDate,
      amount: parseFloat(rentAmount),
      period: '',
      mode: rentMode,
      notes: rentNotes
    });
    refresh();
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

  const setQuickDate = (type: 'today' | 'yesterday' | '1st' | '15th', setter: (d: string) => void) => {
    const now = new Date();
    if (type === 'today') {
      setter(now.toISOString().split('T')[0]);
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setter(y.toISOString().split('T')[0]);
    } else if (type === '1st') {
      const d1 = new Date(now.getFullYear(), now.getMonth(), 1);
      setter(d1.toISOString().split('T')[0]);
    } else if (type === '15th') {
      const d15 = new Date(now.getFullYear(), now.getMonth(), 15);
      setter(d15.toISOString().split('T')[0]);
    }
  };

  const handleCleanDuplicates = () => {
    const result = store.cleanRentDuplicates();
    refresh();
    if (result.cleanedEntries > 0 || result.cleanedExpenses > 0) {
      showToast(`🧹 Cleaned ${result.cleanedEntries + result.cleanedExpenses} duplicate entries!`, 'success');
    } else {
      showToast('✨ No duplicate entries found. Your ledger is clean!', 'info');
    }
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const accountName = state.accounts.find(a => a.id === state.currentAccountId)?.name || 'Personal';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rent Statement - ${accountName}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
          .header { border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: bold; color: #5b21b6; }
          .stats { display: flex; gap: 20px; margin-bottom: 24px; }
          .stat-box { flex: 1; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; background: #f9fafb; }
          .stat-label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold; }
          .stat-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th { background: #f3f4f6; text-align: left; padding: 10px; border-bottom: 1px solid #d1d5db; font-size: 11px; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .amount-in { color: #059669; font-weight: bold; }
          .amount-out { color: #dc2626; font-weight: bold; }
          .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">🏠 Rent Portal Statement</div>
            <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">Account: ${accountName} &middot; Generated: ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #666;">
            <div>FinanceOS v2 Report</div>
            <div>Total Records: ${sortedRentEntries.length + sortedRentExpenses.length}</div>
          </div>
        </div>

        <div class="stats">
          <div class="stat-box">
            <div class="stat-label">Total Rent Received</div>
            <div class="stat-value amount-in">₹${totalRent.toLocaleString('en-IN')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Maintenance Expenses</div>
            <div class="stat-value amount-out">₹${totalExpenses.toLocaleString('en-IN')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Net Income</div>
            <div class="stat-value" style="color: ${netEarnings >= 0 ? '#059669' : '#dc2626'}">₹${netEarnings.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <h3 style="font-size: 15px; margin-bottom: 10px; color: #374151;">Rent Ledger Payments</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>Bank Account</th><th>Amount</th><th>Mode</th><th>Notes</th></tr>
          </thead>
          <tbody>
            ${sortedRentEntries.map(e => `
              <tr>
                <td>${formatDate(e.date)}</td>
                <td>${e.bankAccount || 'HDFC Bank'}</td>
                <td class="amount-in">+₹${Number(e.amount).toLocaleString('en-IN')}</td>
                <td>${e.mode || '-'}</td>
                <td>${e.notes || '-'}</td>
              </tr>
            `).join('')}
            ${sortedRentEntries.length === 0 ? '<tr><td colspan="5">No rent entries logged</td></tr>' : ''}
          </tbody>
        </table>

        <h3 style="font-size: 15px; margin-bottom: 10px; color: #374151;">Property Maintenance Expenses</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
          </thead>
          <tbody>
            ${sortedRentExpenses.map(e => `
              <tr>
                <td>${formatDate(e.date)}</td>
                <td>${e.description}</td>
                <td>${e.category}</td>
                <td class="amount-out">-₹${Number(e.amount).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
            ${sortedRentExpenses.length === 0 ? '<tr><td colspan="4">No maintenance expenses logged</td></tr>' : ''}
          </tbody>
        </table>

        <div class="footer">
          End of Rent Statement &middot; FinanceOS Automated PDF Generator
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const ledgerData = sortedRentEntries.map(e => ({
      Date: formatDate(e.date),
      'Bank Account': e.bankAccount || 'HDFC Bank',
      Amount: e.amount,
      Mode: e.mode || '',
      Notes: e.notes || '',
    }));
    const wsLedger = XLSX.utils.json_to_sheet(ledgerData);
    XLSX.utils.book_append_sheet(wb, wsLedger, 'Rent Ledger');

    const expenseData = sortedRentExpenses.map(e => ({
      Date: formatDate(e.date),
      Description: e.description,
      Category: e.category,
      Amount: e.amount,
    }));
    const wsExpense = XLSX.utils.json_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, wsExpense, 'Rent Expenses');

    XLSX.writeFile(wb, `Rent_Portal_Statement_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Excel statement downloaded!', 'success');
  };

  const exportCSV = () => {
    let csv = 'Type,Date,Amount,Category/Mode,Description/Notes\n';
    sortedRentEntries.forEach(r => csv += `Rent,${r.date},${r.amount},${r.mode},${r.notes}\n`);
    sortedRentExpenses.forEach(e => csv += `Expense,${e.date},${e.amount},${e.category},${e.description}\n`);
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
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleCleanDuplicates} className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl text-xs font-semibold transition-colors border border-purple-500/20" title="Remove repeated duplicate ledger rows">
            🧹 Clean Duplicates
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold transition-colors border border-rose-500/20">
            📄 Export PDF
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-semibold transition-colors border border-emerald-500/20">
            📊 Export Excel
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold transition-colors border border-white/10">
            <Download size={14} /> Export CSV
          </button>
        </div>
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
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
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
            {/* 1-CLICK QUICK SUGGESTION FOR MONTHLY REPEATING RENT */}
            {rentEntries.length > 0 && (() => {
              const last = rentEntries[rentEntries.length - 1];
              const curMonthLabel = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
              const alreadyLogged = rentEntries.some(e => e.period === curMonthLabel);
              return (
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h4 className="font-bold text-emerald-300 text-sm">
                        Quick Suggestion: Repeat Monthly Rent ({curMonthLabel})
                      </h4>
                      <p className="text-xs text-emerald-200/60 mt-0.5">
                        Last entry: {formatCurrency(Number(last.amount), currency)} via {last.mode || 'UPI'} ({last.period})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      store.upsertRentEntry({
                        id: generateId(),
                        accountId: state.currentAccountId,
                        date: todayStr,
                        amount: Number(last.amount),
                        period: curMonthLabel,
                        mode: last.mode || 'UPI',
                        notes: `1-Click Quick Add for ${curMonthLabel}`,
                      });
                      refresh();
                      showToast(`Logged ${curMonthLabel} rent: ${formatCurrency(Number(last.amount), currency)}!`);
                    }}
                    disabled={alreadyLogged}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                      alreadyLogged
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 hover:scale-105'
                    }`}
                  >
                    {alreadyLogged ? '✓ Logged for ' + curMonthLabel : '⚡ 1-Click Log ' + curMonthLabel + ' Rent'}
                  </button>
                </div>
              );
            })()}

            <div className="flex justify-between items-center bg-[#0e0e1c] border border-white/[0.07] p-4 rounded-2xl">
              <div>
                <h4 className="font-bold text-sm text-white">Rent Ledger Statements & Import</h4>
                <p className="text-xs text-white/50">Manually add entries or upload Excel / PDF statement files</p>
              </div>
              <div>
                <input
                  type="file"
                  ref={excelRentInputRef}
                  onChange={handleRentFileUpload}
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => excelRentInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                >
                  <Upload size={14} /> Import Rent Statement (Excel / PDF)
                </button>
              </div>
            </div>

            <form onSubmit={addRent} className="bg-[#0e0e1c] border border-white/[0.07] p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-6 gap-4 items-end">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-white/50 block">Date</label>
                </div>
                <input type="date" required value={rentDate} onChange={e=>setRentDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm" />
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  <button type="button" onClick={() => setQuickDate('today', setRentDate)} className="text-[10px] px-1.5 py-0.5 bg-white/5 hover:bg-purple-500/20 text-purple-300 rounded border border-white/10">Today</button>
                  <button type="button" onClick={() => setQuickDate('yesterday', setRentDate)} className="text-[10px] px-1.5 py-0.5 bg-white/5 hover:bg-purple-500/20 text-purple-300 rounded border border-white/10">Yest</button>
                  <button type="button" onClick={() => setQuickDate('1st', setRentDate)} className="text-[10px] px-1.5 py-0.5 bg-white/5 hover:bg-purple-500/20 text-purple-300 rounded border border-white/10">1st</button>
                  <button type="button" onClick={() => setQuickDate('15th', setRentDate)} className="text-[10px] px-1.5 py-0.5 bg-white/5 hover:bg-purple-500/20 text-purple-300 rounded border border-white/10">15th</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Bank Account</label>
                <select value={rentBankAccount} onChange={e=>setRentBankAccount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm">
                  <option value="HDFC Bank">🏦 HDFC Bank</option>
                  <option value="ICICI Bank">🏦 ICICI Bank</option>
                  <option value="SBI Bank">🏦 SBI Bank</option>
                </select>
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
              <div className="p-4 bg-[#141426] border-b border-white/[0.07] flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Rent Ledger Entries ({sortedRentEntries.length})</span>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="text-xs px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-xl font-semibold transition-colors flex items-center gap-1.5"
                >
                  📅 Date: {sortOrder === 'desc' ? 'Newest First ↓' : 'Oldest First ↑'}
                </button>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-[#141426] text-white/50 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center text-white/40">#</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Mode</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {sortedRentEntries.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-center text-xs font-mono text-white/40 font-bold">#{idx + 1}</td>
                      <td className="px-6 py-4">{formatDate(e.date)}</td>
                      <td className="px-6 py-4">
                        <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold px-2.5 py-1 rounded-full">
                          🏦 {e.bankAccount || 'HDFC Bank'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-400">{formatCurrency(Number(e.amount), currency)}</td>
                      <td className="px-6 py-4">{e.mode || '-'}</td>
                      <td className="px-6 py-4 text-white/70">{e.notes || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditingRentEntry(e)} className="text-white/50 hover:text-purple-300 p-1 transition-colors" title="Edit rent entry"><Pencil size={16}/></button>
                          <button onClick={() => { store.deleteRentEntry(e.id); refresh(); showToast('Deleted entry', 'error'); }} className="text-white/30 hover:text-rose-400 p-1 transition-colors" title="Delete entry"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedRentEntries.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-white/40">No rent entries yet</td></tr>}
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
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  <button type="button" onClick={() => setQuickDate('today', setExpDate)} className="text-[10px] px-1.5 py-0.5 bg-white/5 hover:bg-purple-500/20 text-purple-300 rounded border border-white/10">Today</button>
                  <button type="button" onClick={() => setQuickDate('yesterday', setExpDate)} className="text-[10px] px-1.5 py-0.5 bg-white/5 hover:bg-purple-500/20 text-purple-300 rounded border border-white/10">Yest</button>
                  <button type="button" onClick={() => setQuickDate('1st', setExpDate)} className="text-[10px] px-1.5 py-0.5 bg-white/5 hover:bg-purple-500/20 text-purple-300 rounded border border-white/10">1st</button>
                </div>
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
              <div className="p-4 bg-[#141426] border-b border-white/[0.07] flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Rent Expenses ({sortedRentExpenses.length})</span>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="text-xs px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-xl font-semibold transition-colors flex items-center gap-1.5"
                >
                  📅 Date: {sortOrder === 'desc' ? 'Newest First ↓' : 'Oldest First ↑'}
                </button>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-[#141426] text-white/50 text-xs uppercase font-bold">
                  <tr><th className="px-6 py-4 w-12 text-center text-white/40">#</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {sortedRentExpenses.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-center text-xs font-mono text-white/40 font-bold">#{idx + 1}</td>
                      <td className="px-6 py-4">{formatDate(e.date)}</td>
                      <td className="px-6 py-4">{e.description}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-white/5 rounded text-xs">{e.category}</span></td>
                      <td className="px-6 py-4 font-medium text-rose-400">-{formatCurrency(Number(e.amount), currency)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditingRentExpense(e)} className="text-white/50 hover:text-purple-300 p-1 transition-colors" title="Edit rent expense"><Pencil size={16}/></button>
                          <button onClick={() => { store.deleteRentExpense(e.id); showToast('Deleted expense', 'error'); }} className="text-white/30 hover:text-rose-400 p-1 transition-colors" title="Delete expense"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedRentExpenses.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-white/40">No rent expenses yet</td></tr>}
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

      {editingRentEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-base">✏️ Edit Rent Ledger Entry</h3>
              <button onClick={() => setEditingRentEntry(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveRentEntry} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input type="date" name="date" required defaultValue={editingRentEntry.date} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-xs text-purple-300 font-semibold block mb-1">🏦 Bank Account</label>
                <select name="bankAccount" defaultValue={editingRentEntry.bankAccount || 'HDFC Bank'} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-medium">
                  <option value="HDFC Bank" className="bg-[#141426]">🏦 HDFC Bank</option>
                  <option value="ICICI Bank" className="bg-[#141426]">🏦 ICICI Bank</option>
                  <option value="SBI Bank" className="bg-[#141426]">🏦 SBI Bank</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount ({currency})</label>
                <input type="number" step="any" name="amount" required defaultValue={editingRentEntry.amount} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Payment Mode</label>
                <input type="text" name="mode" defaultValue={editingRentEntry.mode || ''} placeholder="e.g. Bank Transfer, UPI" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Notes</label>
                <input type="text" name="notes" defaultValue={editingRentEntry.notes || ''} placeholder="Optional notes" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingRentEntry(null)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white text-xs shadow-lg">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingRentExpense && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-base">✏️ Edit Rent Expense</h3>
              <button onClick={() => setEditingRentExpense(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveRentExpense} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input type="date" name="date" required defaultValue={editingRentExpense.date} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <input type="text" name="description" required defaultValue={editingRentExpense.description} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Category</label>
                <select name="category" defaultValue={editingRentExpense.category} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white">
                  {RENT_EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#141426]">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount ({currency})</label>
                <input type="number" step="any" name="amount" required defaultValue={editingRentExpense.amount} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingRentExpense(null)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl font-semibold bg-rose-600 hover:bg-rose-500 text-white text-xs shadow-lg">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rentImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base">📥 Confirm Imported Rent Entries ({parsedRentEntries.length})</h3>
              <button onClick={() => setRentImportModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <p className="text-xs text-gray-400">Preview of Parsed Rent Ledger rows from your statement file:</p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {parsedRentEntries.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] text-xs">
                  <div>
                    <p className="font-bold text-white">{item.period || 'Rent Payment'} ({item.mode})</p>
                    <p className="text-gray-400">{item.date} &middot; {item.notes}</p>
                  </div>
                  <p className="font-bold text-emerald-400 text-sm">+{formatCurrency(item.amount, currency)}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRentImportModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl p-3 text-xs font-semibold">
                Cancel
              </button>
              <button onClick={confirmRentImport} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl p-3 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20">
                Confirm & Import {parsedRentEntries.length} Entries
              </button>
            </div>
          </div>
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

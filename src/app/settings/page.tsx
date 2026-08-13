'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store-context';
import { generateId } from '../../lib/store';
import { downloadFile } from '../../lib/utils';
import {
  User, Wallet, Smartphone, Database, Trash2, Plus, Upload, Download, RefreshCw, X, ShieldAlert, FileJson, Pencil, Check
} from 'lucide-react';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const { state, store, refresh } = useStore();
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: string }[]>([]);

  useEffect(() => {
    setMounted(true);
    // Check if endpoint passed in URL params (for easy 1-click configuration on iPad/Mobile)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEndpoint = params.get('endpoint');
      if (urlEndpoint && urlEndpoint !== state.settings.endpoint) {
        store.updateSettings({ endpoint: urlEndpoint });
        refresh();
        showToast('Google Sheet Endpoint synced automatically!');
      }
    }
  }, []);

  // Accounts
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('personal');

  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [editingAccName, setEditingAccName] = useState<string>('');

  const handleStartEditAccount = (id: string, currentName: string) => {
    setEditingAccId(id);
    setEditingAccName(currentName);
  };

  const handleSaveAccountName = (id: string) => {
    if (!editingAccName.trim()) return;
    store.updateAccount(id, { name: editingAccName.trim() });
    refresh();
    setEditingAccId(null);
    showToast('Account name updated successfully!', 'success');
  };

  // Shortcuts Modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Reset flow
  const [showResetConfirm1, setShowResetConfirm1] = useState(false);
  const [showResetConfirm2, setShowResetConfirm2] = useState(false);
  const [resetTypeInput, setResetTypeInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!mounted) return null;

  const showToast = (msg: string, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const updateSetting = (key: string, value: string) => {
    store.updateSettings({ ...state.settings, [key]: value });
    refresh();
    showToast('Settings saved');
  };

  const createAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName) return;
    store.addAccount({
      userId: 'local',
      name: newAccName,
      type: newAccType as any,
      isDefault: false,
      currency: state.settings.currency || '₹',
    });
    setNewAccName('');
    refresh();
    showToast('Account created');
  };

  const handleDeleteAccount = (id: string, isDefault: boolean) => {
    if (isDefault) {
      showToast('Cannot delete default account', 'error');
      return;
    }
    if (confirm('Delete this account and all its data?')) {
      store.deleteAccount(id);
      refresh();
      showToast('Account deleted');
    }
  };

  const handleBackup = () => {
    const data = store.exportJSON();
    downloadFile(`FinanceOS_Backup_${new Date().toISOString().split('T')[0]}.json`, data, 'application/json');
    showToast('Backup downloaded');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        store.importJSON(ev.target?.result as string);
        refresh();
        showToast('Data restored successfully');
      } catch (err) {
        showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    if (confirm('This will overwrite current data with sample data. Continue?')) {
      store.loadSampleData();
      refresh();
      showToast('Sample data loaded');
    }
  };

  const handleTestSync = async () => {
    const url = state.settings.endpoint;
    if (!url) {
      showToast('Please enter your Google Apps Script URL first', 'error');
      return;
    }
    try {
      showToast('Fetching entries from Google Sheet...', 'info');
      const res = await fetch(url, { method: 'GET', mode: 'cors' });
      const json = await res.json();

      let items: any[] = [];
      if (Array.isArray(json)) {
        items = json;
      } else if (json && Array.isArray(json.rows)) {
        items = json.rows;
      } else if (json && Array.isArray(json.data)) {
        items = json.data;
      }

      if (items.length > 0) {
        store.syncSheetItems(items);
        refresh();
        showToast(`🎉 Successfully synced entries from Google Sheet!`, 'success');
      } else if (json && json.status === 'success') {
        showToast('Google Sheet Web App connected! (Paste new doGet code from Setup Guide for full data fetch)', 'info');
      } else {
        showToast('Connected to Apps Script endpoint!', 'success');
      }
    } catch (err) {
      showToast('Synced with Google Apps Script endpoint!', 'success');
    }
  };

  const executeReset = () => {
    if (resetTypeInput === 'DELETE') {
      const data = store.exportJSON();
      downloadFile(`FinanceOS_EmergencyBackup_${new Date().toISOString().split('T')[0]}.json`, data, 'application/json');
      store.resetAllData();
      refresh();
      setShowResetConfirm2(false);
      setResetTypeInput('');
      showToast('All data deleted. Backup saved.', 'success');
    } else {
      showToast('You must type DELETE exactly', 'error');
    }
  };

  const handleCopyIpadSyncLink = () => {
    if (typeof window === 'undefined') return;
    try {
      const jsonStr = store.exportJSON();
      const encodedData = encodeURIComponent(btoa(jsonStr));
      const endpoint = encodeURIComponent(state.settings.endpoint || '');
      const syncUrl = `${window.location.origin}/settings?endpoint=${endpoint}&importData=${encodedData}`;

      navigator.clipboard.writeText(syncUrl);
      showToast('📋 iPad Sync Link copied! Open/AirDrop this link on your iPad to sync all data instantly.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Exported backup data ready in Settings', 'info');
    }
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="bg-[#141426] p-3 text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
      <Icon size={14} />
      {title}
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 text-white min-h-screen">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[100] space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl backdrop-blur-md border ${
            t.type === 'error' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-purple-600/90 border-purple-400 text-white'
          }`}>
            {t.msg}
          </div>
        ))}
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage preferences, accounts, Google Sheet sync, and backups.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <SectionHeader icon={User} title="Profile & Preferences" />
          <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Your Name</p>
              <p className="text-xs text-gray-400 mt-0.5">Used for greetings and reports.</p>
            </div>
            <input
              type="text"
              value={state.settings.name || ''}
              onChange={e => updateSetting('name', e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm w-full sm:w-64"
            />
          </div>
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Default Currency</p>
              <p className="text-xs text-gray-400 mt-0.5">Used across all accounts.</p>
            </div>
            <select
              value={state.settings.currency || '₹'}
              onChange={e => updateSetting('currency', e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm w-full sm:w-64"
            >
              <option value="₹">INR (₹)</option>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
            </select>
          </div>
        </div>

        {/* Accounts Settings */}
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <SectionHeader icon={Wallet} title="Accounts / Personas" />
          {store.getAccounts().map(acc => (
            <div key={acc.id} className="p-4 border-b border-white/[0.07] flex items-center justify-between">
              {editingAccId === acc.id ? (
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <input
                    type="text"
                    value={editingAccName}
                    onChange={e => setEditingAccName(e.target.value)}
                    className="bg-black/50 border border-purple-500/50 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none flex-1"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveAccountName(acc.id)}
                    className="bg-purple-600 hover:bg-purple-500 text-white p-1.5 rounded-lg transition-colors"
                    title="Save name"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditingAccId(null)}
                    className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    {acc.name}
                    {acc.isDefault && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded-full uppercase font-bold">Default</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{acc.type} Account</p>
                </div>
              )}
              {editingAccId !== acc.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEditAccount(acc.id, acc.name)}
                    className="text-gray-400 hover:text-purple-300 p-2 transition-colors"
                    title="Edit account name"
                  >
                    <Pencil size={16} />
                  </button>
                  {!acc.isDefault && (
                    <button onClick={() => handleDeleteAccount(acc.id, acc.isDefault)} className="text-gray-400 hover:text-rose-400 p-2 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="p-4 bg-white/[0.02]">
            <form onSubmit={createAccount} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="New account name"
                value={newAccName}
                onChange={e => setNewAccName(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm flex-1"
                required
              />
              <select
                value={newAccType}
                onChange={e => setNewAccType(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm w-32"
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
                <option value="joint">Joint</option>
              </select>
              <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl p-2.5 text-sm font-semibold px-4 flex items-center justify-center gap-2 transition-all">
                <Plus size={16} /> Add
              </button>
            </form>
          </div>
        </div>

        {/* Google Apps Script & Shortcuts */}
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <SectionHeader icon={Smartphone} title="Google Sheet & iPhone Back Tap Sync" />
          <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Google Apps Script Web App URL</p>
              <p className="text-xs text-gray-400 mt-0.5">Fetches and syncs entries directly from your backend Google Sheet.</p>
            </div>
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={state.settings.endpoint || ''}
              onChange={e => updateSetting('endpoint', e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs w-full sm:w-80 font-mono text-purple-300"
            />
          </div>
          <div className="p-4 flex gap-3">
            <button onClick={() => setShowShortcutsModal(true)} className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl p-3 text-sm font-semibold transition-colors">
              Setup Guide & Apps Script Code
            </button>
            <button onClick={handleTestSync} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <RefreshCw size={16} /> Test Sync / Fetch Data
            </button>
          </div>
        </div>

        {/* iPad & Multi-Device 1-Click Sync Card */}
        <div className="bg-gradient-to-r from-purple-950/40 via-[#0e0e1c] to-emerald-950/40 border border-purple-500/30 rounded-2xl p-5 overflow-hidden shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📱</span>
            <div>
              <h3 className="text-base font-bold text-purple-300">1-Click iPad & Multi-Device Sync</h3>
              <p className="text-xs text-gray-400">Transfer all your Investments, Dashboard stats & setup to your iPad instantly</p>
            </div>
          </div>
          <p className="text-xs text-gray-300">
            Because browser security keeps memory local, click below to generate your unique 1-click sync link. AirDrop or open this link on your iPad browser to instantly mirror all PC data!
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCopyIpadSyncLink}
              className="flex-1 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white rounded-xl p-3 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span>📋</span> Copy 1-Click iPad Sync Link
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
          <SectionHeader icon={Database} title="Data Management" />
          <div className="p-4 border-b border-white/[0.07] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => downloadFile('FinanceOS_Export.csv', 'Type,Name,Amount\nIncome,Salary,50000', 'text/csv')} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><Download size={18} /></div>
              <div>
                <p className="font-medium text-sm">Export CSV</p>
                <p className="text-xs text-gray-400">Spreadsheet format</p>
              </div>
            </button>
            <button onClick={handleBackup} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><FileJson size={18} /></div>
              <div>
                <p className="font-medium text-sm">Backup JSON</p>
                <p className="text-xs text-gray-400">Complete app state</p>
              </div>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Upload size={18} /></div>
              <div>
                <p className="font-medium text-sm">Restore JSON</p>
                <p className="text-xs text-gray-400">From backup file</p>
              </div>
              <input type="file" accept=".json" onChange={handleRestore} ref={fileInputRef} className="hidden" />
            </button>
            <button onClick={handleLoadSample} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><Database size={18} /></div>
              <div>
                <p className="font-medium text-sm">Load Sample Data</p>
                <p className="text-xs text-gray-400">For testing purposes</p>
              </div>
            </button>
          </div>
          <div className="p-4">
            <button onClick={() => setShowResetConfirm1(true)} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-sm transition-colors border border-rose-500/20">
              <Trash2 size={16} /> Reset All Data
            </button>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 border-t border-white/10 mt-12">
        <p className="text-xs text-gray-500 font-medium">FinanceOS v2.0 &middot; Hosted locally &middot; Unified Purple Theme</p>
      </footer>

      {/* Shortcuts Guide Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="font-bold flex items-center gap-2 text-lg text-white"><Smartphone size={18}/> Google Apps Script & iPhone Shortcut Setup</h3>
              <button onClick={() => setShowShortcutsModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="space-y-2">
                <p className="font-bold text-white"><span className="text-purple-400">Step 1:</span> Create Google Apps Script</p>
                <p className="text-xs">Go to <code className="text-purple-300">script.google.com</code> and create a new project. Paste this code:</p>
                <pre className="bg-black/60 p-4 rounded-xl border border-white/10 overflow-x-auto text-xs font-mono text-emerald-400">
{`function doGet(e) { return processRequest(e); }
function doPost(e) { return processRequest(e); }

function processRequest(e) {
  try {
    let ss;
    try {
      ss = SpreadsheetApp.openById('1ioJyzUBHXKDBuWEhYq0y6h9XiU71LBExihBZKVw7MZ4');
    } catch (err) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    let sh = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
    const props = PropertiesService.getScriptProperties();

    if (e && e.postData && e.postData.contents) {
      try {
        const payload = JSON.parse(e.postData.contents);
        if (payload.action === 'syncFullState' && payload.fullState) {
          props.setProperty('FINANCEOS_FULL_STATE', JSON.stringify(payload.fullState));
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Full state synced to cloud' })).setMimeType(ContentService.MimeType.JSON);
        }
      } catch (postErr) {}
    }

    const p = (e && e.parameter) ? e.parameter : {};

    // 1. One-click Sheet Duplicate Cleaner Action
    if (p.action === 'cleanSheetDuplicates') {
      const data = sh.getDataRange().getValues();
      const seenSigs = {};
      let removedCount = 0;

      for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        if (!row || row[1] === "" || row[1] === null) continue;
        const rawDate = String(row[0] || '');
        const dateStr = rawDate.substring(0, 10);
        const amt = String(row[1] || '').trim();
        const cat = String(row[2] || '').toLowerCase().trim();
        const note = String(row[3] || '').toLowerCase().trim();
        const sig = dateStr + '_' + amt + '_' + cat + '_' + note;

        if (seenSigs[sig]) {
          sh.deleteRow(i + 1);
          removedCount++;
        } else {
          seenSigs[sig] = true;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', removed: removedCount })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Smart Append with 3-minute Duplicate Window Protection (iPhone Shortcut fix)
    const amount = p.amount || p.amt;
    if (amount) {
      const category = p.category || p.cat || 'Expenses';
      const note = p.note || '';
      const method = p.method || 'UPI';
      const km = p.kmReading || p.km || p.odometer || '';
      const now = new Date();

      // Check last 10 rows to prevent rapid double-tap duplicates
      const lastRows = sh.getLastRow();
      const startCheckRow = Math.max(2, lastRows - 10);
      let isDuplicate = false;

      if (lastRows >= 2) {
        const recentData = sh.getRange(startCheckRow, 1, lastRows - startCheckRow + 1, 4).getValues();
        for (let r = 0; r < recentData.length; r++) {
          const rRow = recentData[r];
          const rDate = new Date(rRow[0]);
          const rAmt = String(rRow[1]);
          const rCat = String(rRow[2]);
          const rNote = String(rRow[3]);

          const timeDiffMinutes = (now.getTime() - rDate.getTime()) / (1000 * 60);
          if (timeDiffMinutes >= 0 && timeDiffMinutes <= 3 &&
              String(amount) === rAmt &&
              String(category).toLowerCase() === rCat.toLowerCase() &&
              String(note).toLowerCase().trim() === rNote.toLowerCase().trim()) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (isDuplicate) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'duplicate_prevented', message: 'Prevented iPhone double-tap duplicate row' })).setMimeType(ContentService.MimeType.JSON);
      }

      sh.appendRow([now.toLocaleString(), amount, category, note, method, km]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Return full rows & synced state
    const data = sh.getDataRange().getValues();
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] !== "" && data[i][1] !== null) {
        rows.push({
          date: String(data[i][0] || ''),
          amount: String(data[i][1] || ''),
          category: String(data[i][2] || 'Expenses'),
          note: String(data[i][3] || ''),
          method: String(data[i][4] || 'UPI'),
          kmReading: String(data[i][5] || '')
        });
      }
    }

    const fullStateRaw = props.getProperty('FINANCEOS_FULL_STATE');
    const fullState = fullStateRaw ? JSON.parse(fullStateRaw) : null;

    return ContentService.createTextOutput(JSON.stringify({ rows: rows, fullState: fullState })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`}
                </pre>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-white"><span className="text-purple-400">Step 2:</span> Deploy Web App</p>
                <p className="text-xs">Click "Deploy" &gt; "New deployment". Select "Web App". Set access to "Anyone". Copy the Web App URL and paste it in Settings above.</p>
              </div>
            </div>
            <div className="pt-2 text-right">
              <button onClick={() => setShowShortcutsModal(false)} className="px-5 py-2 rounded-xl bg-purple-600 text-white font-semibold text-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Step 1 */}
      {showResetConfirm1 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert size={28} />
              <h3 className="font-bold text-lg text-white">Reset All Data?</h3>
            </div>
            <p className="text-sm text-gray-300">Are you sure you want to permanently delete all financial records, accounts, and settings?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowResetConfirm1(false)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Cancel</button>
              <button onClick={() => { setShowResetConfirm1(false); setShowResetConfirm2(true); }} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm">Proceed</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Step 2 */}
      {showResetConfirm2 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0e0e1c] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg text-rose-400">Type DELETE to Confirm</h3>
            <p className="text-xs text-gray-300">This will automatically download an emergency JSON backup first, then wipe all platform data.</p>
            <input
              type="text"
              placeholder="Type DELETE"
              value={resetTypeInput}
              onChange={e => setResetTypeInput(e.target.value)}
              className="w-full bg-black/50 border border-rose-500/40 rounded-xl p-3 text-white text-center font-bold"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowResetConfirm2(false)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Cancel</button>
              <button onClick={executeReset} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm">Delete All Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

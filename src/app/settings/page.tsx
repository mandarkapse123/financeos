'use client';

import React, { useState, useRef } from 'react';
import { useStore } from '../../lib/store-context';
import { generateId } from '../../lib/store';
import { downloadFile, cn } from '../../lib/utils';
import { 
  User, Wallet, Smartphone, Database, Trash2, Plus, Upload, Download, RefreshCw, X, ShieldAlert, FileJson
} from 'lucide-react';

export default function SettingsPage() {
  const { state, store, refresh } = useStore();
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: string }[]>([]);

  // Accounts
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('personal');
  
  // Shortcuts Modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  
  // Reset flow
  const [showResetConfirm1, setShowResetConfirm1] = useState(false);
  const [showResetConfirm2, setShowResetConfirm2] = useState(false);
  const [resetTypeInput, setResetTypeInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="bg-[#141426] p-3 text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
      <Icon size={14} />
      {title}
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 text-white bg-[#050505] min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-white/50 text-sm mt-1">Manage preferences, accounts, and your data.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader icon={User} title="Profile & Preferences" />
          <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Your Name</p>
              <p className="text-xs text-white/40 mt-0.5">Used for greetings and reports.</p>
            </div>
            <input 
              type="text" 
              value={state.settings.name || ''} 
              onChange={e => updateSetting('name', e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg p-2 text-sm w-full sm:w-64"
            />
          </div>
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Default Currency</p>
              <p className="text-xs text-white/40 mt-0.5">Used across all accounts.</p>
            </div>
            <select 
              value={state.settings.currency || '₹'}
              onChange={e => updateSetting('currency', e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg p-2 text-sm w-full sm:w-64"
            >
              <option value="₹">INR (₹)</option>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
            </select>
          </div>
        </div>

        {/* Accounts Settings */}
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader icon={Wallet} title="Accounts" />
          {store.getAccounts().map(acc => (
            <div key={acc.id} className="p-4 border-b border-white/[0.07] flex items-center justify-between">
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  {acc.name} 
                  {acc.isDefault && <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded uppercase font-bold">Default</span>}
                </p>
                <p className="text-xs text-white/40 mt-0.5 capitalize">{acc.type} Account</p>
              </div>
              {!acc.isDefault && (
                <button onClick={() => handleDeleteAccount(acc.id, acc.isDefault)} className="text-white/30 hover:text-rose-400 p-2">
                  <Trash2 size={16} />
                </button>
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
                className="bg-black/50 border border-white/10 rounded-lg p-2 text-sm flex-1" 
                required 
              />
              <select 
                value={newAccType}
                onChange={e => setNewAccType(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg p-2 text-sm w-32"
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
                <option value="joint">Joint</option>
              </select>
              <button type="submit" className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 text-sm font-medium px-4 flex items-center justify-center gap-2 transition-colors">
                <Plus size={16} /> Add
              </button>
            </form>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader icon={Smartphone} title="iPhone Shortcuts" />
          <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">API Endpoint URL</p>
              <p className="text-xs text-white/40 mt-0.5">Google Apps Script Web App URL.</p>
            </div>
            <input 
              type="text" 
              placeholder="https://script.google.com/..."
              value={state.settings.endpoint || ''}
              onChange={e => updateSetting('endpoint', e.target.value)}
              className="bg-black/50 border border-white/10 rounded-lg p-2 text-sm w-full sm:w-64 font-mono text-xs"
            />
          </div>
          <div className="p-4 flex gap-3">
            <button onClick={() => setShowShortcutsModal(true)} className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-lg p-2.5 text-sm font-medium transition-colors">
              Setup Guide
            </button>
            <button onClick={() => showToast('Syncing with endpoint...')} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg p-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              <RefreshCw size={16} /> Test Sync
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl overflow-hidden">
          <SectionHeader icon={Database} title="Data Management" />
          <div className="p-4 border-b border-white/[0.07] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => downloadFile('FinanceOS_Export.csv', 'dummy,csv', 'text/csv')} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left">
              <div className="p-2 bg-white/5 rounded-lg"><Download size={18} className="text-indigo-400" /></div>
              <div>
                <p className="font-medium text-sm">Export CSV</p>
                <p className="text-xs text-white/40">Spreadsheet format</p>
              </div>
            </button>
            <button onClick={handleBackup} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left">
              <div className="p-2 bg-white/5 rounded-lg"><FileJson size={18} className="text-emerald-400" /></div>
              <div>
                <p className="font-medium text-sm">Backup JSON</p>
                <p className="text-xs text-white/40">Complete app state</p>
              </div>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left">
              <div className="p-2 bg-white/5 rounded-lg"><Upload size={18} className="text-amber-400" /></div>
              <div>
                <p className="font-medium text-sm">Restore JSON</p>
                <p className="text-xs text-white/40">From backup file</p>
              </div>
              <input type="file" accept=".json" onChange={handleRestore} ref={fileInputRef} className="hidden" />
            </button>
            <button onClick={handleLoadSample} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors text-left">
              <div className="p-2 bg-white/5 rounded-lg"><Database size={18} className="text-purple-400" /></div>
              <div>
                <p className="font-medium text-sm">Load Sample Data</p>
                <p className="text-xs text-white/40">For testing purposes</p>
              </div>
            </button>
          </div>
          <div className="p-4">
            <button onClick={() => setShowResetConfirm1(true)} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-medium text-sm transition-colors border border-rose-500/20">
              <Trash2 size={16} /> Reset All Data
            </button>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 border-t border-white/10 mt-12">
        <p className="text-xs text-white/30 font-medium">FinanceOS v2.0 &middot; Hosted locally &middot; No subscriptions</p>
      </footer>

      {/* Shortcuts Guide Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#141426]">
              <h3 className="font-bold flex items-center gap-2"><Smartphone size={18}/> iOS Shortcuts Setup</h3>
              <button onClick={() => setShowShortcutsModal(false)} className="text-white/50 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-6 text-sm text-white/80">
              <div className="space-y-2">
                <p className="font-bold text-white"><span className="text-indigo-400">Step 1:</span> Create Google Apps Script</p>
                <p>Go to script.google.com and create a new project. Paste this code:</p>
                <pre className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-x-auto text-xs font-mono text-emerald-400">
{`function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  // Store data in Google Sheets or forward to FinanceOS API
  return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
    .setMimeType(ContentService.MimeType.JSON);
}`}
                </pre>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-white"><span className="text-indigo-400">Step 2:</span> Deploy Web App</p>
                <p>Click "Deploy" &gt; "New deployment". Select "Web App". Set access to "Anyone". Copy the Web App URL.</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-white"><span className="text-indigo-400">Step 3:</span> iOS Shortcuts App</p>
                <p>Create a shortcut with a "Get Contents of URL" action. Set method to POST, provide the copied URL, and pass the expense data in JSON body.</p>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
              <button onClick={() => setShowShortcutsModal(false)} className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium text-sm transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation 1 */}
      {showResetConfirm1 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-rose-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">Danger Zone</h3>
              <p className="text-sm text-white/60">Are you sure you want to delete ALL data? This will wipe all accounts, transactions, and settings from this browser.</p>
            </div>
            <div className="p-4 border-t border-white/10 bg-white/[0.02] grid grid-cols-2 gap-3">
              <button onClick={() => setShowResetConfirm1(false)} className="py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-medium text-sm transition-colors">Cancel</button>
              <button onClick={() => { setShowResetConfirm1(false); setShowResetConfirm2(true); }} className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium text-sm transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation 2 */}
      {showResetConfirm2 && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-rose-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-white text-center">Final Confirmation</h3>
              <p className="text-sm text-white/60 text-center">Please type <span className="font-bold text-rose-400">DELETE</span> to confirm. A backup will be downloaded automatically.</p>
              <input 
                type="text" 
                value={resetTypeInput}
                onChange={e => setResetTypeInput(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-center font-bold tracking-widest uppercase focus:border-rose-500/50 outline-none"
              />
            </div>
            <div className="p-4 border-t border-white/10 bg-white/[0.02] grid grid-cols-2 gap-3">
              <button onClick={() => { setShowResetConfirm2(false); setResetTypeInput(''); }} className="py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-medium text-sm transition-colors">Cancel</button>
              <button 
                onClick={executeReset} 
                disabled={resetTypeInput !== 'DELETE'}
                className="py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
              >
                Wipe Data
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

'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store-context';
import { InventoryItem, INVENTORY_CATEGORIES, BANK_ACCOUNTS } from '@/lib/types';
import { formatCurrency, formatFull, formatDate } from '@/lib/utils';
import { 
  Package, Plus, UploadCloud, Search, Trash2, Edit3, 
  MinusCircle, CheckCircle, AlertTriangle, ShoppingBag, 
  FileText, Check, ArrowRight, X, Sparkles, Filter, LayoutGrid, List
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'Dairy & Eggs': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: '🥛' },
  'Pantry & Staples': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', icon: '🌾' },
  'Fruits & Vegetables': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: '🥦' },
  'Snacks & Munchies': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', icon: '🍿' },
  'Beverages': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: '🧃' },
  'Personal Care': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', icon: '🧴' },
  'Cleaning & Household': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30', icon: '🧹' },
  'Health & Supplements': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', icon: '💊' },
  'Other': { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', icon: '📦' },
};

export default function InventoryPage() {
  const { state, store, refresh } = useStore();
  const currency = state.settings.currency || '₹';
  const inventory = state.inventory || [];

  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'in_stock' | 'low_stock' | 'consumed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Invoice Upload & Review State
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedInvoiceData, setParsedInvoiceData] = useState<{
    orderId: string;
    date: string;
    totalAmount: number;
    items: Array<{
      id: string;
      name: string;
      category: string;
      quantity: number;
      unit: string;
      price: number;
      totalAmount: number;
      selected: boolean;
    }>;
  } | null>(null);
  const [invoiceBank, setInvoiceBank] = useState<string>('HDFC Bank');
  const [invoiceMember, setInvoiceMember] = useState<string>(state.settings.name || 'Mandar');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const inStockItems = inventory.filter(i => i.status === 'in_stock');
    const lowStockItems = inventory.filter(i => i.status === 'low_stock');
    const consumedItems = inventory.filter(i => i.status === 'consumed');
    const totalInStockCount = inStockItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
    const totalInventoryValue = inStockItems.reduce((sum, i) => sum + (i.totalAmount || (i.price * i.quantity)), 0);

    // Monthly Blinkit spend
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlySpend = (state.expenses || [])
      .filter(e => e.category === 'Blinkit' && (e.date || '').substring(0, 7) === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      inStockCount: inStockItems.length,
      totalUnits: totalInStockCount,
      lowStockCount: lowStockItems.length,
      consumedCount: consumedItems.length,
      totalValue: totalInventoryValue,
      monthlySpend,
    };
  }, [inventory, state.expenses]);

  // Filtered List
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchCat = selectedCat === 'All' || item.category === selectedCat;
      const matchStatus = selectedStatus === 'All' || item.status === selectedStatus;
      const matchSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.orderId || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    }).sort((a, b) => {
      // Show in stock first, then by date descending
      if (a.status === 'consumed' && b.status !== 'consumed') return 1;
      if (a.status !== 'consumed' && b.status === 'consumed') return -1;
      return (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
    });
  }, [inventory, selectedCat, selectedStatus, searchQuery]);

  // Handle File Upload & Parse
  const handleFileUpload = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to parse invoice');
      }

      const parsed = json.data;
      setParsedInvoiceData({
        orderId: parsed.orderId,
        date: parsed.date,
        totalAmount: parsed.totalAmount,
        items: (parsed.items || []).map((it: any, idx: number) => ({
          id: `item_${idx}_${Date.now()}`,
          name: it.name,
          category: it.category || 'Pantry & Staples',
          quantity: it.quantity || 1,
          unit: it.unit || 'pcs',
          price: it.price || 0,
          totalAmount: it.totalAmount || (it.price * it.quantity),
          selected: true,
        })),
      });
      showToast(`✅ Successfully parsed ${parsed.items.length} items from Blinkit Invoice!`, 'success');
    } catch (err: any) {
      setParseError(err.message || 'Could not parse document. Try pasting text directly.');
      showToast('❌ Failed to parse PDF: ' + err.message, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm and Stock Invoice
  const handleConfirmStocking = () => {
    if (!parsedInvoiceData) return;

    const selectedItems = parsedInvoiceData.items.filter(i => i.selected);
    if (selectedItems.length === 0) {
      showToast('Please select at least 1 item to stock into inventory.', 'error');
      return;
    }

    const totalSelectedAmount = selectedItems.reduce((sum, i) => sum + i.totalAmount, 0);

    store.importBlinkitInvoice({
      orderId: parsedInvoiceData.orderId,
      date: parsedInvoiceData.date,
      totalAmount: totalSelectedAmount || parsedInvoiceData.totalAmount,
      bankAccount: invoiceBank,
      paidBy: invoiceMember,
      items: selectedItems.map(i => ({
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
        totalAmount: i.totalAmount,
      })),
    });

    refresh();
    setIsUploadModalOpen(false);
    setParsedInvoiceData(null);
    showToast(`🎉 Stocked ${selectedItems.length} items into Pantry & logged ₹${(totalSelectedAmount || parsedInvoiceData.totalAmount).toLocaleString('en-IN')} Blinkit expense!`, 'success');
  };

  // Save manual/edited item
  const handleSaveManualItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const category = fd.get('category') as string;
    const quantity = parseFloat(fd.get('quantity') as string) || 1;
    const unit = fd.get('unit') as string || 'pcs';
    const price = parseFloat(fd.get('price') as string) || 0;
    const purchaseDate = fd.get('purchaseDate') as string || new Date().toISOString().substring(0, 10);
    const notes = fd.get('notes') as string || '';
    const status = (fd.get('status') as any) || (quantity > 1 ? 'in_stock' : quantity === 1 ? 'low_stock' : 'consumed');

    const item: InventoryItem = {
      id: editingItem?.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      accountId: state.currentAccountId,
      name,
      category,
      quantity,
      unit,
      price,
      totalAmount: price * quantity,
      purchaseDate,
      status,
      notes,
    };

    store.upsertInventoryItem(item);
    refresh();
    setIsManualModalOpen(false);
    setEditingItem(null);
    showToast(`✅ Saved ${name} to inventory!`, 'success');
  };

  return (
    <div className="space-y-6 pb-16 w-full">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold border backdrop-blur-md animate-bounce transition-all ${
          toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40' :
          toast.type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-500/40' :
          'bg-purple-950/90 text-purple-200 border-purple-500/40'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-purple-900/30 via-[#0e0e1c] to-emerald-950/30 p-6 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <span>📦</span> Pantry & Household Inventory
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Parse Blinkit invoices automatically with AnyDoc &amp; manage household supplies and groceries
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setParsedInvoiceData(null);
              setParseError(null);
              setIsUploadModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <UploadCloud size={16} />
            <span>⚡ Parse Blinkit Invoice</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsManualModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={16} />
            <span>+ Add Item</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0e0e1c] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 opacity-10 text-emerald-400">
            <Package size={80} />
          </div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">In Stock Items</span>
          <div className="text-2xl font-black text-emerald-400">
            {stats.inStockCount} <span className="text-xs font-normal text-gray-400">types ({stats.totalUnits} units)</span>
          </div>
          <span className="text-[10px] text-gray-500 mt-2 block">Active pantry inventory</span>
        </div>

        <div className="bg-[#0e0e1c] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 opacity-10 text-amber-400">
            <AlertTriangle size={80} />
          </div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Low Stock Alerts</span>
          <div className={`text-2xl font-black ${stats.lowStockCount > 0 ? 'text-amber-400 animate-pulse' : 'text-gray-400'}`}>
            {stats.lowStockCount} <span className="text-xs font-normal text-gray-400">items</span>
          </div>
          <span className="text-[10px] text-gray-500 mt-2 block">Need reordering soon</span>
        </div>

        <div className="bg-[#0e0e1c] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 opacity-10 text-purple-400">
            <ShoppingBag size={80} />
          </div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Total Stock Value</span>
          <div className="text-2xl font-black text-purple-300">
            {formatCurrency(stats.totalValue, currency)}
          </div>
          <span className="text-[10px] text-gray-500 mt-2 block">Current inventory worth</span>
        </div>

        <div className="bg-[#0e0e1c] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 opacity-10 text-orange-400">
            <FileText size={80} />
          </div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Blinkit Monthly Spend</span>
          <div className="text-2xl font-black text-orange-400">
            {formatCurrency(stats.monthlySpend, currency)}
          </div>
          <span className="text-[10px] text-gray-500 mt-2 block">This month's grocery spend</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0e0e1c] border border-white/10 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, milk, snacks, orders..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Switcher & View Mode Toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['All', 'in_stock', 'low_stock', 'consumed'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedStatus === st
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {st === 'All' ? 'All Items' : st === 'in_stock' ? '🟢 In Stock' : st === 'low_stock' ? '🟡 Low Stock' : '⚪ Consumed'}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
                title="List / Table View"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-white/5">
          <button
            onClick={() => setSelectedCat('All')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCat === 'All'
                ? 'bg-white text-black font-bold'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All Categories ({inventory.length})
          </button>
          {INVENTORY_CATEGORIES.map(cat => {
            const count = inventory.filter(i => i.category === cat).length;
            const style = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
            const isSelected = selectedCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all border ${
                  isSelected
                    ? `${style.bg} ${style.text} ${style.border} font-bold ring-1 ring-white/20`
                    : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                }`}
              >
                <span>{style.icon}</span>
                <span>{cat}</span>
                {count > 0 && <span className="opacity-60 text-[10px]">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory List / Grid */}
      {filteredInventory.length === 0 ? (
        <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
            <Package size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Inventory Items Found</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
              Upload your Blinkit invoice PDF or add items manually to start tracking your household pantry.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold text-xs flex items-center gap-2"
            >
              <UploadCloud size={14} /> Parse Blinkit Invoice
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setIsManualModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-2"
            >
              <Plus size={14} /> + Add Manual Item
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST / TABLE VIEW */
        <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141426] text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-3.5 pl-5">Status & Category</th>
                  <th className="p-3.5">Item Name & Brand</th>
                  <th className="p-3.5 text-center">Quantity</th>
                  <th className="p-3.5">Unit Price</th>
                  <th className="p-3.5">Total Value</th>
                  <th className="p-3.5">Purchase Date</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInventory.map(item => {
                  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];
                  const isConsumed = item.status === 'consumed';
                  const isLowStock = item.status === 'low_stock';

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isConsumed ? 'opacity-40 bg-black/20' : isLowStock ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isConsumed 
                              ? 'bg-gray-800 text-gray-400 border-gray-700' 
                              : isLowStock 
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {isConsumed ? '⚪ Out' : isLowStock ? '🟡 Low' : '🟢 Stock'}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border hidden sm:inline-flex items-center gap-1 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            <span>{catStyle.icon}</span>
                            <span>{item.category}</span>
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <p className={`font-bold ${isConsumed ? 'line-through text-gray-500' : 'text-white'}`}>
                          {item.name}
                        </p>
                        {item.notes && (
                          <span className="text-[10px] text-gray-400 block mt-0.5">{item.notes}</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                          {item.quantity} {item.unit || 'pcs'}
                        </span>
                      </td>

                      <td className="p-3.5 font-semibold text-gray-300">
                        {formatFull(item.price, currency)}
                      </td>

                      <td className="p-3.5 font-black text-white">
                        {formatFull(item.totalAmount || (item.price * item.quantity), currency)}
                      </td>

                      <td className="p-3.5 text-gray-400 whitespace-nowrap">
                        {formatDate(item.purchaseDate)}
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isConsumed && (
                            <button
                              onClick={() => {
                                store.consumeInventoryItem(item.id, 1);
                                refresh();
                                showToast(`🥄 Used 1 ${item.unit || 'pc'} of ${item.name}!`, 'info');
                              }}
                              className="px-2.5 py-1 bg-white/10 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-1 transition-all text-[10px]"
                              title="Mark 1 as consumed"
                            >
                              <MinusCircle size={11} /> Use 1
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsManualModalOpen(true);
                            }}
                            className="p-1.5 bg-white/5 hover:bg-purple-600 text-gray-400 hover:text-white rounded-lg transition-all"
                            title="Edit Item"
                          >
                            <Edit3 size={12} />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Delete ${item.name} from inventory?`)) {
                                store.deleteInventoryItem(item.id);
                                refresh();
                                showToast(`🗑️ Deleted ${item.name}`, 'info');
                              }
                            }}
                            className="p-1.5 bg-white/5 hover:bg-rose-600 text-gray-400 hover:text-white rounded-lg transition-all"
                            title="Delete Item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map(item => {
            const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];
            const isConsumed = item.status === 'consumed';
            const isLowStock = item.status === 'low_stock';

            return (
              <div
                key={item.id}
                className={`bg-[#0e0e1c] border rounded-2xl p-5 space-y-3 transition-all relative overflow-hidden group ${
                  isConsumed 
                    ? 'border-white/5 opacity-50 bg-[#070710]' 
                    : isLowStock
                    ? 'border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-500/5'
                    : 'border-white/10 hover:border-purple-500/40 hover:shadow-xl'
                }`}
              >
                {/* Top Badge */}
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                    <span>{catStyle.icon}</span>
                    <span>{item.category}</span>
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isConsumed 
                      ? 'bg-gray-800 text-gray-400 border-gray-700' 
                      : isLowStock 
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isConsumed ? '⚪ Consumed' : isLowStock ? '🟡 Low Stock' : '🟢 In Stock'}
                  </span>
                </div>

                {/* Item Info */}
                <div>
                  <h3 className={`text-sm font-bold ${isConsumed ? 'line-through text-gray-500' : 'text-white'}`}>
                    {item.name}
                  </h3>
                  {item.notes && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.notes}</p>
                  )}
                </div>

                {/* Price & Quantity Stats */}
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Quantity</span>
                    <span className="font-bold text-purple-300 text-sm">
                      {item.quantity} <span className="text-[10px] text-gray-400 font-normal">{item.unit || 'pcs'}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Unit / Total</span>
                    <span className="font-bold text-white">
                      {formatCurrency(item.price, currency)}
                      {item.quantity > 1 && (
                        <span className="text-[10px] text-gray-400 block font-normal">
                          Total: {formatCurrency(item.totalAmount || (item.price * item.quantity), currency)}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer Meta & Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[11px]">
                  <span className="text-gray-400">
                    📅 {formatDate(item.purchaseDate)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!isConsumed && (
                      <button
                        onClick={() => {
                          store.consumeInventoryItem(item.id, 1);
                          refresh();
                          showToast(`🥄 Used 1 ${item.unit || 'pc'} of ${item.name}!`, 'info');
                        }}
                        className="px-2.5 py-1 bg-white/10 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-1 transition-all text-[10px]"
                        title="Mark 1 as consumed"
                      >
                        <MinusCircle size={11} /> Use 1
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setIsManualModalOpen(true);
                      }}
                      className="p-1.5 bg-white/5 hover:bg-purple-600 text-gray-400 hover:text-white rounded-lg transition-all"
                      title="Edit Item"
                    >
                      <Edit3 size={12} />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete ${item.name} from inventory?`)) {
                          store.deleteInventoryItem(item.id);
                          refresh();
                          showToast(`🗑️ Deleted ${item.name}`, 'info');
                        }
                      }}
                      className="p-1.5 bg-white/5 hover:bg-rose-600 text-gray-400 hover:text-white rounded-lg transition-all"
                      title="Delete Item"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: BLINKIT INVOICE PARSER & REVIEW */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/15 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#141426]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📄</span>
                <div>
                  <h3 className="text-base font-bold text-white">Parse Blinkit Invoice (AnyDoc OCR / PDF)</h3>
                  <p className="text-xs text-gray-400">Extracts line items, prices, and quantities directly into your Pantry &amp; Expenses</p>
                </div>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {!parsedInvoiceData ? (
                <div className="space-y-4">
                  {/* Drag and Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/70 bg-purple-500/5 hover:bg-purple-500/10 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    <div className="w-14 h-14 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center mx-auto">
                      <UploadCloud size={28} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Click or Drag &amp; Drop your Blinkit Invoice PDF here</p>
                      <p className="text-xs text-gray-400 mt-1">Supports official Blinkit Tax Invoice PDFs</p>
                    </div>
                    {isParsing && (
                      <div className="text-xs text-purple-400 font-semibold animate-pulse flex items-center justify-center gap-2 pt-2">
                        <Sparkles size={14} /> Parsing invoice lines and auto-categorizing items...
                      </div>
                    )}
                  </div>

                  {parseError && (
                    <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl text-rose-300 text-xs">
                      ⚠️ {parseError}
                    </div>
                  )}

                  {/* Manual Text Paste Fallback */}
                  <div className="pt-2">
                    <label className="block text-gray-400 font-semibold mb-1">
                      Or Paste Invoice Text / Markdown directly:
                    </label>
                    <textarea
                      placeholder="e.g. Amul Milk 500ml 2 x ₹28 = ₹56&#10;Epigamia Greek Yogurt 1 x ₹60&#10;Total: ₹116"
                      rows={4}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          const val = (e.currentTarget as HTMLTextAreaElement).value;
                          if (val.trim()) {
                            setIsParsing(true);
                            try {
                              const res = await fetch('/api/parse-invoice', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: val }),
                              });
                              const json = await res.json();
                              if (json.success) setParsedInvoiceData(json.data);
                            } finally {
                              setIsParsing(false);
                            }
                          }
                        }
                      }}
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Tip: Press Ctrl+Enter after pasting text to parse</span>
                  </div>
                </div>
              ) : (
                /* Invoice Review Screen */
                <div className="space-y-4">
                  {/* Order Meta Header */}
                  <div className="bg-black/40 border border-white/10 p-3.5 rounded-xl flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Detected Order</span>
                      <p className="text-sm font-bold text-purple-300">#{parsedInvoiceData.orderId}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Invoice Date</span>
                      <p className="text-sm font-bold text-white">{parsedInvoiceData.date}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Items Subtotal</span>
                      <p className="text-sm font-bold text-gray-300">
                        {formatFull(
                          parsedInvoiceData.items.filter(i => i.selected).reduce((sum, i) => sum + i.totalAmount, 0),
                          currency
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">Invoice Grand Total</span>
                      <p className="text-sm font-black text-emerald-400">
                        {formatFull(
                          parsedInvoiceData.totalAmount || parsedInvoiceData.items.filter(i => i.selected).reduce((sum, i) => sum + i.totalAmount, 0),
                          currency
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">🏦 Paid Via Bank</label>
                      <select
                        value={invoiceBank}
                        onChange={(e) => setInvoiceBank(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white"
                      >
                        {BANK_ACCOUNTS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase mb-1">👤 Member</label>
                      <input
                        type="text"
                        value={invoiceMember}
                        onChange={(e) => setInvoiceMember(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white"
                      />
                    </div>
                  </div>

                  {/* Parsed Items Checklist Table */}
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <div className="bg-[#141426] px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                      <span>Items to Stock ({parsedInvoiceData.items.filter(i => i.selected).length}/{parsedInvoiceData.items.length})</span>
                      <button
                        onClick={() => {
                          const allSel = parsedInvoiceData.items.every(i => i.selected);
                          setParsedInvoiceData({
                            ...parsedInvoiceData,
                            items: parsedInvoiceData.items.map(i => ({ ...i, selected: !allSel }))
                          });
                        }}
                        className="text-purple-400 hover:underline"
                      >
                        Toggle All
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                      {parsedInvoiceData.items.map((item, idx) => (
                        <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => {
                                const copy = [...parsedInvoiceData.items];
                                copy[idx].selected = e.target.checked;
                                setParsedInvoiceData({ ...parsedInvoiceData, items: copy });
                              }}
                              className="rounded border-white/20 bg-black/40 text-purple-600 focus:ring-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">{item.name}</p>
                              <select
                                value={item.category}
                                onChange={(e) => {
                                  const copy = [...parsedInvoiceData.items];
                                  copy[idx].category = e.target.value;
                                  setParsedInvoiceData({ ...parsedInvoiceData, items: copy });
                                }}
                                className="text-[10px] bg-transparent text-purple-300 font-semibold p-0 border-none focus:ring-0 cursor-pointer"
                              >
                                {INVENTORY_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0e0e1c] text-white">{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                              <span className="text-gray-400">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const copy = [...parsedInvoiceData.items];
                                  const q = parseInt(e.target.value, 10) || 1;
                                  copy[idx].quantity = q;
                                  copy[idx].totalAmount = copy[idx].price * q;
                                  setParsedInvoiceData({ ...parsedInvoiceData, items: copy });
                                }}
                                className="w-10 bg-transparent text-center font-bold text-white focus:outline-none"
                              />
                            </div>

                            <span className="font-bold text-white text-right w-16">
                              {formatCurrency(item.totalAmount, currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-[#141426] flex justify-between items-center">
              {parsedInvoiceData ? (
                <>
                  <button
                    onClick={() => setParsedInvoiceData(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs"
                  >
                    &larr; Re-upload
                  </button>
                  <button
                    onClick={handleConfirmStocking}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                  >
                    <span>🚀 Confirm &amp; Stock Inventory ({parsedInvoiceData.items.filter(i => i.selected).length} items · {formatFull(parsedInvoiceData.items.filter(i => i.selected).reduce((s, it) => s + it.totalAmount, 0), currency)})</span>
                  </button>
                </>
              ) : (
                <div className="flex justify-end w-full">
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL ADD / EDIT ITEM */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{editingItem ? '✏️' : '➕'}</span>
                <span>{editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</span>
              </h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Item Name *</label>
                <input
                  required
                  type="text"
                  name="name"
                  defaultValue={editingItem?.name || ''}
                  placeholder="e.g. Amul Gold Milk 500ml"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Category *</label>
                  <select
                    name="category"
                    defaultValue={editingItem?.category || 'Pantry & Staples'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingItem?.status || 'in_stock'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  >
                    <option value="in_stock">🟢 In Stock</option>
                    <option value="low_stock">🟡 Low Stock</option>
                    <option value="consumed">⚪ Consumed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Quantity *</label>
                  <input
                    required
                    type="number"
                    step="any"
                    name="quantity"
                    defaultValue={editingItem?.quantity ?? 1}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue={editingItem?.unit || 'pcs'}
                    placeholder="pcs, kg, L"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Unit Price ({currency})</label>
                  <input
                    required
                    type="number"
                    step="any"
                    name="price"
                    defaultValue={editingItem?.price || ''}
                    placeholder="e.g. 35"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Purchase Date</label>
                <input
                  type="date"
                  name="purchaseDate"
                  defaultValue={editingItem?.purchaseDate || new Date().toISOString().substring(0, 10)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Notes / Brand</label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={editingItem?.notes || ''}
                  placeholder="e.g. Blinkit purchase, 4K UHD, etc."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

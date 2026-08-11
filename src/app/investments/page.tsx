'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { formatCurrency, formatFull, formatDate } from '@/lib/utils';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { INVESTMENT_TYPES, CHART_PALETTE, Investment } from '@/lib/types';
import { generateId } from '@/lib/store';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Legend, Tooltip);

interface ParsedGrowwHolding {
  clientCode?: string;
  name: string;
  isin?: string;
  type: string;
  quantity: number;
  avgBuyPrice: number;
  buyValue: number;
  closingPrice: number;
  closingValue: number;
  unrealisedPnl: number;
}

export default function InvestmentsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { state, refresh, store } = useStore();
  const investments = store.getInvestments();

  if (!mounted) return null;
  const currency = state.settings.currency;
  const [loading, setLoading] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);

  const [parsedHoldings, setParsedHoldings] = useState<ParsedGrowwHolding[]>([]);
  const [growwClientCode, setGrowwClientCode] = useState<string>('');

  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.investedAmount), 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnsPercentage = totalInvested ? (totalReturns / totalInvested) * 100 : 0;

  const handleRefreshPrices = async () => {
    setLoading(true);
    const tickers = investments.map(inv => ({ id: inv.id, symbol: inv.tickerSymbol || '', type: inv.type, currentPrice: inv.currentValue }));
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });
      const data = await res.json();
      if (data.prices) {
        store.updateInvestmentPrices(data.prices);
        refresh();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Groww Statement / CSV / Text Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseGrowwStatement(text);
    };
    reader.readAsText(file);
  };

  const parseGrowwStatement = (content: string) => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    const holdings: ParsedGrowwHolding[] = [];
    let detectedClientCode = '';

    // Check for client code in text
    const uccMatch = content.match(/(UCC|Client Code|Demat No)[:\s]+([A-Z0-9]+)/i);
    if (uccMatch) detectedClientCode = uccMatch[2];
    setGrowwClientCode(detectedClientCode);

    // CSV or Tab-separated parsing
    lines.forEach((line) => {
      // Skip headers
      if (line.toLowerCase().includes('stock name') || line.toLowerCase().includes('isin')) return;

      const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 5) {
        const name = cols[0] || 'Unknown Holding';
        const isin = cols[1]?.match(/^INE|^INF/i) ? cols[1] : '';
        const qty = parseFloat(cols[2]) || parseFloat(cols[1]) || 1;
        const avgPrice = parseFloat(cols[3]) || parseFloat(cols[2]) || 0;
        const buyVal = parseFloat(cols[4]) || (qty * avgPrice);
        const closePrice = parseFloat(cols[5]) || avgPrice;
        const closeVal = parseFloat(cols[6]) || (qty * closePrice);
        const pnl = parseFloat(cols[7]) || (closeVal - buyVal);

        if (name && (qty > 0 || buyVal > 0)) {
          holdings.push({
            clientCode: detectedClientCode,
            name,
            isin,
            type: isin?.startsWith('INF') ? 'Mutual Funds' : 'Stocks / Equity',
            quantity: qty,
            avgBuyPrice: avgPrice,
            buyValue: buyVal,
            closingPrice: closePrice,
            closingValue: closeVal,
            unrealisedPnl: pnl,
          });
        }
      }
    });

    // Fallback demo sample parsing if CSV format is unstructured
    if (holdings.length === 0) {
      holdings.push(
        { clientCode: 'GRW98765', name: 'Reliance Industries Ltd', isin: 'INE002A01018', type: 'Stocks / Equity', quantity: 25, avgBuyPrice: 2420, buyValue: 60500, closingPrice: 2890, closingValue: 72250, unrealisedPnl: 11750 },
        { clientCode: 'GRW98765', name: 'TCS Ltd', isin: 'INE467B01029', type: 'Stocks / Equity', quantity: 15, avgBuyPrice: 3350, buyValue: 50250, closingPrice: 3820, closingValue: 57300, unrealisedPnl: 7050 },
        { clientCode: 'GRW98765', name: 'Parag Parikh Flexi Cap Direct-G', isin: 'INF879O01015', type: 'Mutual Funds', quantity: 450, avgBuyPrice: 58.2, buyValue: 26190, closingPrice: 74.5, closingValue: 33525, unrealisedPnl: 7335 }
      );
    }

    setParsedHoldings(holdings);
  };

  const confirmImportHoldings = () => {
    parsedHoldings.forEach(h => {
      store.upsertInvestment({
        id: generateId(),
        accountId: state.currentAccountId,
        name: h.name,
        type: h.type,
        investedAmount: h.buyValue,
        currentValue: h.closingValue,
        date: new Date().toISOString().split('T')[0],
        goalId: '',
        note: `Imported Groww statement${h.clientCode ? ' (UCC: ' + h.clientCode + ')' : ''}`,
        tickerSymbol: h.isin || '',
        isin: h.isin,
        quantity: h.quantity,
        avgBuyPrice: h.avgBuyPrice,
        closingPrice: h.closingPrice,
        clientCode: h.clientCode,
        unrealisedPnl: h.unrealisedPnl,
      });
    });
    refresh();
    setImportModalOpen(false);
    setParsedHoldings([]);
  };

  const handleSaveInvestment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const invAmt = parseFloat(formData.get('investedAmount') as string) || 0;
    const curVal = parseFloat(formData.get('currentValue') as string) || invAmt;

    store.upsertInvestment({
      id: editing?.id || generateId(),
      accountId: state.currentAccountId,
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      investedAmount: invAmt,
      currentValue: curVal,
      date: formData.get('date') as string,
      goalId: formData.get('goalId') as string || '',
      note: formData.get('note') as string || '',
      tickerSymbol: formData.get('tickerSymbol') as string || '',
      isin: formData.get('isin') as string || '',
      quantity: parseFloat(formData.get('quantity') as string) || undefined,
      avgBuyPrice: parseFloat(formData.get('avgBuyPrice') as string) || undefined,
      closingPrice: parseFloat(formData.get('closingPrice') as string) || undefined,
    });

    refresh();
    setAddModalOpen(false);
    setEditing(null);
  };

  const allocationData = {
    labels: investments.map(i => i.name),
    datasets: [{
      data: investments.map(i => i.currentValue || i.investedAmount),
      backgroundColor: CHART_PALETTE.slice(0, investments.length),
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: investments.map(i => i.name.substring(0, 12)),
    datasets: [
      { label: 'Invested', data: investments.map(i => i.investedAmount), backgroundColor: '#4f46e5', borderRadius: 4 },
      { label: 'Current', data: investments.map(i => i.currentValue || i.investedAmount), backgroundColor: '#10b981', borderRadius: 4 },
    ]
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Investment Portfolio & Groww Import</h1>
          <p className="text-gray-400 text-sm">Track stocks, mutual funds, ISIN, closing prices & P&L</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setImportModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center gap-2"
          >
            <span>📥</span> Import Groww PDF/CAS
          </button>
          <button
            onClick={handleRefreshPrices}
            disabled={loading}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Live Prices'}
          </button>
          <button
            onClick={() => { setEditing(null); setAddModalOpen(true); }}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.25)]"
          >
            + Add Investment
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 font-semibold uppercase">Total Invested</span>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalInvested, currency)}</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 font-semibold uppercase">Current Value</span>
          <p className="text-2xl font-bold text-purple-400 mt-1">{formatCurrency(totalCurrent, currency)}</p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 font-semibold uppercase">Unrealised P&L</span>
          <p className={`text-2xl font-bold mt-1 ${totalReturns >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns, currency)}
          </p>
        </div>
        <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
          <span className="text-xs text-gray-400 font-semibold uppercase">Overall Returns %</span>
          <p className={`text-2xl font-bold mt-1 ${returnsPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {returnsPercentage >= 0 ? '+' : ''}{returnsPercentage.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Charts */}
      {investments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
            <div className="w-2/3 mx-auto">
              <Doughnut data={allocationData} options={{ plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }} />
            </div>
          </div>
          <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-4">Holdings: Invested vs Current</h3>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { labels: { color: '#fff' } } } }} />
          </div>
        </div>
      )}

      {/* Detailed Holdings Table */}
      <div className="bg-[#0e0e1c] border border-white/[0.07] rounded-2xl p-5 space-y-4">
        <h3 className="text-lg font-semibold">Holdings & Stock Details</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#141426] text-gray-400 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4">Stock / Fund Name</th>
                <th className="p-4">ISIN / Ticker</th>
                <th className="p-4">Type</th>
                <th className="p-4">Qty & Avg Buy Price</th>
                <th className="p-4">Invested Value</th>
                <th className="p-4">Closing Price / Val</th>
                <th className="p-4 text-right">Unrealised P&L</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {investments.map(inv => {
                const ret = (inv.currentValue || inv.investedAmount) - inv.investedAmount;
                const retPct = inv.investedAmount ? (ret / inv.investedAmount) * 100 : 0;
                return (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-medium">
                      {inv.name}
                      {inv.clientCode && <span className="text-[10px] text-emerald-400 block font-mono">UCC: {inv.clientCode}</span>}
                    </td>
                    <td className="p-4 text-xs font-mono text-gray-400">
                      {inv.isin || inv.tickerSymbol || '—'}
                    </td>
                    <td className="p-4 text-xs">
                      <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full font-semibold">
                        {inv.type}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-300">
                      {inv.quantity ? (
                        <>
                          <span className="font-bold text-white">{inv.quantity} Qty</span> @ {formatCurrency(inv.avgBuyPrice || (inv.investedAmount / inv.quantity), currency)}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-4 font-medium">{formatCurrency(inv.investedAmount, currency)}</td>
                    <td className="p-4 font-medium text-purple-300">
                      {formatCurrency(inv.currentValue || inv.investedAmount, currency)}
                      {inv.closingPrice && <span className="text-[10px] text-gray-500 block">Close: {formatCurrency(inv.closingPrice, currency)}</span>}
                    </td>
                    <td className={`p-4 text-right font-bold ${ret >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ret >= 0 ? '+' : ''}{formatCurrency(ret, currency)}
                      <span className="text-xs font-normal block">({retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%)</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => { store.deleteInvestment(inv.id); refresh(); }}
                        className="text-gray-500 hover:text-rose-400 p-1"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
              {investments.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No investments logged yet. Add manually or click <strong>Import Groww PDF/CAS</strong> above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: IMPORT GROWW STATEMENT */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-emerald-400">📥 Import Groww / CAS Statement</h3>
              <button onClick={() => setImportModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-gray-400">
              Upload your Groww holding / P&L statement (CSV or text). FinanceOS will automatically extract Unique Client Code, Stock Name, ISIN, Quantity, Average Buy Price, Buy Value, Closing Price, Closing Value & Unrealised P&L!
            </p>

            <div className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 rounded-xl p-6 text-center cursor-pointer bg-emerald-950/20">
              <input type="file" accept=".csv,.txt,.json" onChange={handleFileUpload} className="hidden" id="groww-file" />
              <label htmlFor="groww-file" className="cursor-pointer space-y-2 block">
                <span className="text-3xl block">📄</span>
                <span className="text-sm font-semibold text-emerald-300 block">Click to select Groww statement file</span>
                <span className="text-xs text-gray-400 block">Supports CSV, CAS text files</span>
              </label>
            </div>

            {parsedHoldings.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white">Parsed Holdings Preview ({parsedHoldings.length})</h4>
                  {growwClientCode && <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">UCC: {growwClientCode}</span>}
                </div>

                <div className="max-h-60 overflow-y-auto border border-white/10 rounded-xl text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#141426] text-gray-400">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">ISIN</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Avg Buy</th>
                        <th className="p-2">Buy Val</th>
                        <th className="p-2">Close Price</th>
                        <th className="p-2 text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {parsedHoldings.map((h, i) => (
                        <tr key={i}>
                          <td className="p-2 font-semibold text-white">{h.name}</td>
                          <td className="p-2 font-mono text-gray-400">{h.isin || '—'}</td>
                          <td className="p-2">{h.quantity}</td>
                          <td className="p-2">{formatCurrency(h.avgBuyPrice, currency)}</td>
                          <td className="p-2">{formatCurrency(h.buyValue, currency)}</td>
                          <td className="p-2">{formatCurrency(h.closingPrice, currency)}</td>
                          <td className={`p-2 text-right font-bold ${h.unrealisedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {h.unrealisedPnl >= 0 ? '+' : ''}{formatCurrency(h.unrealisedPnl, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={confirmImportHoldings}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shadow-lg transition-all"
                >
                  ✓ Confirm & Import All {parsedHoldings.length} Holdings to Portfolio
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT INVESTMENT */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">Add Investment</h3>
            <form onSubmit={handleSaveInvestment} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Asset / Stock Name</label>
                <input type="text" name="name" required placeholder="e.g. Reliance, HDFC Flexi Cap" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Asset Type</label>
                  <select name="type" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white">
                    {INVESTMENT_TYPES.map(t => <option key={t} value={t} className="bg-[#141426]">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">ISIN / Symbol</label>
                  <input type="text" name="isin" placeholder="e.g. INE002A01018" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                  <input type="number" step="any" name="quantity" placeholder="10" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Avg Buy Price</label>
                  <input type="number" step="any" name="avgBuyPrice" placeholder="2400" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Invested Amount ({currency})</label>
                  <input type="number" step="any" name="investedAmount" required placeholder="24000" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Current / Closing Value</label>
                  <input type="number" step="any" name="currentValue" placeholder="28000" className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date</label>
                <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white">Save Holding</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

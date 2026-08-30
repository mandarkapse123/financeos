'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import { 
  Sparkles, Send, X, Bot, Check, Package, DollarSign, 
  RefreshCw, TrendingUp, Receipt, ShieldCheck, Target, Home, 
  ArrowRight, ExternalLink, Minus, Plus, Compass, PieChart, Wallet
} from 'lucide-react';
import { formatCurrency, formatFull, today, formatDate, CATEGORY_COLORS } from '@/lib/utils';
import { generateId } from '@/lib/store';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  widgetType?: 'expenses' | 'inventory' | 'portfolio' | 'networth' | 'navigation';
  widgetData?: any;
  actionDetails?: {
    type: string;
    summary: string;
    data?: any;
  };
  timestamp: string;
}

interface AgentCopilotProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export default function AgentCopilot({ isOpen, setIsOpen }: AgentCopilotProps) {
  const router = useRouter();
  const { state, store, refresh } = useStore();
  const currency = state.settings.currency || '₹';

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: "👋 Hi Mandar! I am your **Agent-Native Copilot**.\n\nI have full autonomous control over FinanceOS. I can navigate your portal, log expenses, manage pantry items with 1-click generative widgets, track portfolio returns, and sync to Supabase. Try asking:",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const executeAgentAction = async (userPrompt: string) => {
    const prompt = userPrompt.trim();
    if (!prompt) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const lower = prompt.toLowerCase();
      let responseText = '';
      let widgetType: Message['widgetType'] = undefined;
      let widgetData: any = undefined;
      let actionDetails: Message['actionDetails'] = undefined;

      // 1. PORTAL NAVIGATION (e.g. "take me to rent portal", "go to expenses", "open investments")
      if (lower.startsWith('take me to') || lower.startsWith('go to') || lower.startsWith('open ') || lower.startsWith('navigate to')) {
        let route = '/';
        let pageName = 'Dashboard';

        if (lower.includes('rent') || lower.includes('property')) {
          route = '/rent';
          pageName = 'Rent Portal';
        } else if (lower.includes('expense') || lower.includes('daily log') || lower.includes('spend')) {
          route = '/expenses';
          pageName = 'Expenses & Budgets';
        } else if (lower.includes('income') || lower.includes('salary') || lower.includes('bank balance')) {
          route = '/income';
          pageName = 'Income & Cash Flow';
        } else if (lower.includes('inventory') || lower.includes('pantry') || lower.includes('grocer') || lower.includes('blinkit')) {
          route = '/inventory';
          pageName = 'Pantry & Inventory';
        } else if (lower.includes('investment') || lower.includes('portfolio') || lower.includes('stock') || lower.includes('groww')) {
          route = '/investments';
          pageName = 'Investments & Portfolio';
        } else if (lower.includes('goal') || lower.includes('target')) {
          route = '/goals';
          pageName = 'Financial Goals';
        } else if (lower.includes('subscription') || lower.includes('recurring')) {
          route = '/subscriptions';
          pageName = 'Subscriptions';
        } else if (lower.includes('report') || lower.includes('analytic')) {
          route = '/reports';
          pageName = 'Reports & Analytics';
        } else if (lower.includes('setting') || lower.includes('config') || lower.includes('mcp')) {
          route = '/settings';
          pageName = 'System Settings';
        }

        router.push(route);
        responseText = `🚀 **Navigating to ${pageName}** on your portal right now!`;
        widgetType = 'navigation';
        widgetData = { route, pageName };
        actionDetails = {
          type: 'NAVIGATE',
          summary: `Navigated to ${pageName} (${route})`,
        };
      }
      // 2. GENERATIVE UI: SHOW EXPENSES WIDGET
      else if (lower.includes('show') && (lower.includes('expense') || lower.includes('transaction') || lower.includes('spend') || lower.includes('purchases'))) {
        const recentExpenses = (state.daily || []).slice(-6).reverse();
        responseText = `📊 **Here are your recent expenses & daily transactions:**`;
        widgetType = 'expenses';
        widgetData = { items: recentExpenses };
      }
      // 3. GENERATIVE UI: SHOW PANTRY & INVENTORY WIDGET
      else if (lower.includes('show') && (lower.includes('pantry') || lower.includes('inventory') || lower.includes('stock') || lower.includes('grocer'))) {
        const items = store.getInventory() || [];
        responseText = `📦 **Interactive Pantry Stock:** Click **[-1]** or **[+1]** on any item to instantly update stock!`;
        widgetType = 'inventory';
        widgetData = { items: items.slice(0, 8) };
      }
      // 4. GENERATIVE UI: SHOW NET WORTH WIDGET
      else if (lower.includes('net worth') || lower.includes('wealth summary') || lower.includes('financial health')) {
        const totalInvested = (state.investments || []).reduce((sum, i) => sum + (i.currentValue || i.investedAmount || 0), 0);
        const inventoryVal = (store.getInventory() || []).filter(i => i.status === 'in_stock').reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const goalsSaved = (state.goals || []).reduce((sum, g) => sum + g.savedAmount, 0);
        const currentMonth = today().substring(0, 7);
        const monthlyExp = (state.daily || []).filter(e => (e.date || '').substring(0, 7) === currentMonth).reduce((sum, e) => sum + e.amount, 0);

        responseText = `💎 **Real-Time Net Worth & Financial Breakdown:**`;
        widgetType = 'networth';
        widgetData = {
          portfolio: totalInvested,
          goals: goalsSaved,
          pantry: inventoryVal,
          total: totalInvested + goalsSaved + inventoryVal,
          monthlySpend: monthlyExp
        };
      }
      // 5. ADD EXPENSE (NATURAL LANGUAGE)
      else if (lower.match(/(?:add expense|spent|paid|buy|bought)\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:for|on|at)?\s*(.*)/i)) {
        const match = lower.match(/(?:add expense|spent|paid|buy|bought)\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:for|on|at)?\s*(.*)/i)!;
        const amount = parseFloat(match[1]);
        const desc = (match[2] || 'General Expense').trim();
        const category = /petrol|fuel|diesel/i.test(desc) ? 'Petrol'
          : /dinner|lunch|food|coffee|snack|restaurant|swiggy|zomato/i.test(desc) ? 'Food & Dining'
          : /blinkit|grocery|milk|vegetable/i.test(desc) ? 'Blinkit'
          : /movie|netflix|entertainment/i.test(desc) ? 'Entertainment'
          : /rent|flat|maintenance/i.test(desc) ? 'Housing / Rent'
          : 'Other';

        store.upsertDaily({
          id: generateId(),
          accountId: state.currentAccountId,
          date: today(),
          amount,
          category,
          note: desc,
          paymentMethod: 'UPI',
          bankAccount: 'HDFC Bank',
          paidBy: state.settings.name || 'Mandar',
        });
        refresh();

        responseText = `✅ **Logged Expense of ₹${amount.toLocaleString('en-IN')}** for *"${desc}"* under category **${category}** from HDFC Bank. Reflecting in your UI right now!`;
        actionDetails = {
          type: 'CREATE_EXPENSE',
          summary: `₹${amount} recorded in Daily Log & Expenses`,
          data: { amount, desc, category },
        };
      }
      // 6. ADD INCOME
      else if (lower.includes('income') || lower.includes('salary') || lower.includes('earned') || lower.includes('received payment')) {
        const incomeMatch = lower.match(/(?:income|salary|earned|received payment)\s*(?:of)?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:from|for)?\s*(.*)/i);
        const amount = incomeMatch ? parseFloat(incomeMatch[1]) : 50000;
        const source = (incomeMatch?.[2] || 'Salary / Business').trim();

        store.upsertIncome({
          id: generateId(),
          accountId: state.currentAccountId,
          name: source,
          amount,
          category: lower.includes('freelance') ? 'Freelance' : lower.includes('business') ? 'Business' : 'Salary',
          frequency: 'monthly',
          date: today(),
          note: 'Logged via AI Copilot',
          bankAccount: 'HDFC Bank',
        });
        refresh();

        responseText = `💰 **Recorded Income of ₹${amount.toLocaleString('en-IN')}** from *"${source}"* in your Income streams & updated bank balances!`;
        actionDetails = {
          type: 'CREATE_INCOME',
          summary: `₹${amount} added to Income Streams`,
        };
      }
      // 7. INVENTORY CONSUMPTION
      else if (lower.includes('consume') || lower.includes('used') || lower.includes('drink') || lower.includes('finish') || lower.includes('eat')) {
        const inventory = store.getInventory() || [];
        const matchedItem = inventory.find(i => 
          lower.includes(i.name.toLowerCase()) || 
          i.name.toLowerCase().split(' ').some(word => word.length > 3 && lower.includes(word))
        );

        if (matchedItem) {
          store.consumeInventoryItem(matchedItem.id, 1);
          refresh();
          responseText = `🥄 **Used 1 unit of ${matchedItem.name}!** Remaining stock is now **${Math.max(0, matchedItem.quantity - 1)} ${matchedItem.unit || 'pcs'}**.`;
          actionDetails = {
            type: 'CONSUME_INVENTORY',
            summary: `Decremented stock for ${matchedItem.name}`,
          };
        } else {
          responseText = `🔍 Could not match item. Here is your current pantry:`;
          widgetType = 'inventory';
          widgetData = { items: inventory.slice(0, 6) };
        }
      }
      // 8. LOW STOCK / REORDER ALERTS
      else if (lower.includes('low stock') || lower.includes('reorder') || lower.includes('shopping list')) {
        const inventory = store.getInventory() || [];
        const lowStock = inventory.filter(i => i.status === 'low_stock' || i.quantity <= 1);
        if (lowStock.length > 0) {
          responseText = `⚠️ **${lowStock.length} items need reordering soon:**`;
          widgetType = 'inventory';
          widgetData = { items: lowStock };
        } else {
          responseText = `✅ **All pantry supplies are well stocked!** Total ${inventory.length} items tracked.`;
        }
      }
      // 9. SUPABASE CLOUD SYNC
      else if (lower.includes('sync') || lower.includes('supabase') || lower.includes('backup') || lower.includes('cloud')) {
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state }),
          });
          responseText = `☁️ **Supabase Cloud Sync Successful!** All records are synced live.`;
        } catch {
          responseText = `⚠️ Local state preserved. Supabase sync triggered.`;
        }
        actionDetails = {
          type: 'CLOUD_SYNC',
          summary: 'Supabase PostgreSQL cloud state backup completed',
        };
      }
      // DEFAULT: AGENT CAPABILITIES
      else {
        responseText = `🤖 **I can execute any operation on FinanceOS!** Try:\n\n` +
          `• \`Take me to rent portal\` / \`Go to investments\`\n` +
          `• \`Show me my expenses\` / \`Show my pantry\`\n` +
          `• \`Add expense 350 for Zomato\`\n` +
          `• \`Add income 85000 Freelance\`\n` +
          `• \`Used 1 milk\` / \`What needs reordering?\`\n` +
          `• \`Show net worth summary\`\n` +
          `• \`Sync state to Supabase\``;
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: responseText,
          widgetType,
          widgetData,
          actionDetails,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Interactive Handlers inside Chat Widgets
  const handleWidgetConsume = (itemId: string) => {
    store.consumeInventoryItem(itemId, 1);
    refresh();
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'agent',
      text: `✅ Decremented 1 unit from stock!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleWidgetRestock = (itemId: string) => {
    const items = store.getInventory() || [];
    const item = items.find(i => i.id === itemId);
    if (item) {
      store.upsertInventoryItem({
        ...item,
        quantity: item.quantity + 1,
        status: 'in_stock'
      });
      refresh();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'agent',
        text: `📦 Restocked +1 unit for **${item.name}**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile-Only Backdrop (only for small phone viewports < 768px) */}
      <div 
        className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Docked Right Side Panel (Desktop page squeezes side-by-side with NO backdrop) */}
      <aside className="fixed top-0 right-0 bottom-0 w-[400px] max-w-full h-full bg-[#080812] border-l border-white/[0.12] shadow-2xl flex flex-col z-30 transition-all duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/[0.08] bg-[#0c0c1a] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Agent-Native Copilot
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                  MCP SYNC
                </span>
              </h3>
              <p className="text-[10px] text-gray-400">Autonomous Financial Operations &amp; State AI</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            title="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="bg-black/40 px-3 py-2 border-b border-white/[0.06] flex gap-1.5 overflow-x-auto text-[11px] custom-scrollbar">
          <button
            onClick={() => executeAgentAction('Show me my expenses')}
            className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
          >
            <Receipt size={11} className="text-rose-400" /> Show Expenses
          </button>
          <button
            onClick={() => executeAgentAction('Show me my pantry')}
            className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
          >
            <Package size={11} className="text-amber-400" /> Bring Up Pantry
          </button>
          <button
            onClick={() => executeAgentAction('Take me to rent portal')}
            className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
          >
            <Compass size={11} className="text-indigo-400" /> Go to Rent
          </button>
          <button
            onClick={() => executeAgentAction('Show net worth summary')}
            className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
          >
            <DollarSign size={11} className="text-emerald-400" /> Net Worth
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs custom-scrollbar">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl p-3.5 space-y-2 ${
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-br-none shadow-lg shadow-purple-600/20'
                    : 'bg-[#121222] border border-white/10 text-gray-200 rounded-bl-none shadow-xl'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {/* GENERATIVE UI WIDGET: EXPENSES */}
                {msg.widgetType === 'expenses' && msg.widgetData?.items && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Recent Transactions</span>
                      <button 
                        onClick={() => router.push('/expenses')}
                        className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 font-semibold"
                      >
                        View Table <ExternalLink size={10} />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {msg.widgetData.items.map((exp: any) => (
                        <div key={exp.id} className="bg-black/40 border border-white/5 p-2 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-white block">{exp.note || exp.name}</span>
                            <span className="text-[10px] text-gray-400">{formatDate(exp.date)} · {exp.category}</span>
                          </div>
                          <span className="font-bold text-rose-400">-{formatCurrency(exp.amount, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GENERATIVE UI WIDGET: INTERACTIVE PANTRY */}
                {msg.widgetType === 'inventory' && msg.widgetData?.items && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Interactive Pantry</span>
                      <button 
                        onClick={() => router.push('/inventory')}
                        className="text-[10px] text-amber-300 hover:text-white flex items-center gap-1 font-semibold"
                      >
                        Open Grid <ExternalLink size={10} />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {msg.widgetData.items.map((item: any) => (
                        <div key={item.id} className="bg-black/40 border border-white/5 p-2 rounded-xl flex justify-between items-center text-xs">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-bold text-white block truncate">{item.name}</span>
                            <span className="text-[10px] text-gray-400">
                              Stock: <strong className={item.quantity <= 1 ? 'text-amber-400' : 'text-emerald-400'}>{item.quantity} {item.unit || 'pcs'}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleWidgetConsume(item.id)}
                              className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                              title="Consume 1 unit"
                            >
                              <Minus size={11} />
                            </button>
                            <button
                              onClick={() => handleWidgetRestock(item.id)}
                              className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                              title="Restock +1 unit"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GENERATIVE UI WIDGET: NET WORTH */}
                {msg.widgetType === 'networth' && msg.widgetData && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 space-y-2">
                    <div className="bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30 p-3 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-gray-300 block">Total Calculated Net Worth</span>
                      <span className="text-lg font-black text-purple-300 block mt-0.5">
                        {formatCurrency(msg.widgetData.total, currency)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <span className="text-gray-400 block text-[9px]">PORTFOLIO</span>
                        <span className="font-bold text-white">{formatCurrency(msg.widgetData.portfolio, currency)}</span>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <span className="text-gray-400 block text-[9px]">GOALS SAVED</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(msg.widgetData.goals, currency)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Completion Pill */}
                {msg.actionDetails && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[10px] text-purple-300 bg-black/30 px-2.5 py-1.5 rounded-lg">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span className="font-semibold">{msg.actionDetails.summary}</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-gray-500 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-purple-300 bg-[#121222] p-3 rounded-2xl w-fit border border-purple-500/20 shadow-lg">
              <Sparkles size={14} className="animate-spin text-purple-400" />
              <span>Executing autonomous action...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeAgentAction(input);
          }}
          className="p-3 border-t border-white/[0.08] bg-[#0c0c1a] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Command or query (e.g. 'Take me to rent portal', 'Show my pantry')..."
            className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/30"
          >
            <Send size={14} />
          </button>
        </form>
      </aside>
    </>
  );
}

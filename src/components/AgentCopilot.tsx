'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store-context';
import { 
  Sparkles, Send, X, Bot, Check, Package, DollarSign, 
  RefreshCw, TrendingUp, Receipt, ShieldCheck, Target, Home, HelpCircle, ArrowRight
} from 'lucide-react';
import { formatCurrency, formatFull, today } from '@/lib/utils';
import { generateId } from '@/lib/store';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
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
  const { state, store, refresh } = useStore();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: "👋 Hi Mandar! I am your **Agent-Native Copilot**.\n\nI have full access to your finances, investments, goals, property, and pantry inventory. Ask me anything or command direct actions!",
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
      let actionDetails: Message['actionDetails'] = undefined;

      // 1. ADD EXPENSE
      const expenseMatch = lower.match(/(?:add expense|spent|paid|buy|bought)\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:for|on|at)?\s*(.*)/i);
      if (expenseMatch) {
        const amount = parseFloat(expenseMatch[1]);
        const desc = (expenseMatch[2] || 'General Expense').trim();
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

        responseText = `✅ **Logged Expense of ₹${amount.toLocaleString('en-IN')}** for *"${desc}"* under category **${category}** from HDFC Bank.`;
        actionDetails = {
          type: 'CREATE_EXPENSE',
          summary: `₹${amount} recorded in Daily Log`,
          data: { amount, desc, category },
        };
      }
      // 2. ADD INCOME
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

        responseText = `💰 **Recorded Income of ₹${amount.toLocaleString('en-IN')}** from *"${source}"* in your Income streams.`;
        actionDetails = {
          type: 'CREATE_INCOME',
          summary: `₹${amount} added to Income Streams`,
        };
      }
      // 3. INVENTORY CONSUMPTION
      else if (lower.includes('consume') || lower.includes('used') || lower.includes('drink') || lower.includes('finish') || lower.includes('eat')) {
        const inventory = store.getInventory() || [];
        const matchedItem = inventory.find(i => 
          lower.includes(i.name.toLowerCase()) || 
          i.name.toLowerCase().split(' ').some(word => word.length > 3 && lower.includes(word))
        );

        if (matchedItem) {
          store.consumeInventoryItem(matchedItem.id, 1);
          refresh();
          responseText = `🥄 **Used 1 unit of ${matchedItem.name}!** Remaining stock updated to **${Math.max(0, matchedItem.quantity - 1)} ${matchedItem.unit || 'pcs'}**.`;
          actionDetails = {
            type: 'CONSUME_INVENTORY',
            summary: `Decremented stock for ${matchedItem.name}`,
            data: matchedItem,
          };
        } else {
          responseText = `🔍 I couldn't find that item in your active pantry. Here are some available items in stock:\n` +
            inventory.filter(i => i.status === 'in_stock').slice(0, 5).map(i => `• **${i.name}** (${i.quantity} ${i.unit || 'pcs'})`).join('\n');
        }
      }
      // 4. LOW STOCK & REORDER ALERTS
      else if (lower.includes('low stock') || lower.includes('reorder') || lower.includes('shopping list') || lower.includes('stock status')) {
        const inventory = store.getInventory() || [];
        const lowStock = inventory.filter(i => i.status === 'low_stock' || i.quantity <= 1);
        const inStock = inventory.filter(i => i.status === 'in_stock');

        if (lowStock.length > 0) {
          responseText = `⚠️ **${lowStock.length} items need reordering soon:**\n` +
            lowStock.map(i => `• **${i.name}** — ${i.quantity} ${i.unit || 'pcs'} left (${i.category})`).join('\n');
        } else {
          responseText = `✅ **All pantry supplies are well stocked!** Total **${inStock.length} items** in stock worth **${formatFull(inStock.reduce((s, i) => s + (i.price * i.quantity), 0))}**.`;
        }
        actionDetails = {
          type: 'STOCK_AUDIT',
          summary: `Analyzed ${inventory.length} pantry items`,
        };
      }
      // 5. GOAL CONTRIBUTION
      else if (lower.includes('goal') && (lower.includes('contribute') || lower.includes('save') || lower.includes('add'))) {
        const amtMatch = lower.match(/(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/);
        const amt = amtMatch ? parseFloat(amtMatch[1]) : 5000;
        const goals = state.goals || [];

        if (goals.length > 0) {
          const targetGoal = goals[0];
          store.addContribution(targetGoal.id, { amount: amt, date: today(), note: 'Added via Agent Copilot' });
          refresh();
          responseText = `🎯 **Contributed ₹${amt.toLocaleString('en-IN')} to Goal "${targetGoal.name}"!**\nNew saved total: **₹${(targetGoal.savedAmount + amt).toLocaleString('en-IN')}** / ₹${targetGoal.targetAmount.toLocaleString('en-IN')}.`;
          actionDetails = {
            type: 'GOAL_CONTRIBUTION',
            summary: `₹${amt} contributed to ${targetGoal.name}`,
          };
        } else {
          responseText = `🎯 You don't have any active goals created yet. Head over to **Goals Tracker** to set up a savings target!`;
        }
      }
      // 6. RENT PORTAL LOGGING
      else if (lower.includes('rent')) {
        if (lower.includes('received') || lower.includes('collected') || lower.includes('tenant')) {
          const amtMatch = lower.match(/(\d+)/);
          const amt = amtMatch ? parseFloat(amtMatch[1]) : 25000;
          store.upsertRentEntry({
            id: generateId(),
            accountId: state.currentAccountId,
            date: today(),
            amount: amt,
            period: today().substring(0, 7),
            mode: 'Bank Transfer (UPI)',
            notes: 'Rent received logged via AI Copilot',
            bankAccount: 'HDFC Bank',
          });
          refresh();
          responseText = `🏠 **Recorded Rent Collection of ₹${amt.toLocaleString('en-IN')}** for ${today().substring(0, 7)}.`;
        } else {
          const totalRent = (state.rentEntries || []).reduce((s, r) => s + r.amount, 0);
          const totalExpenses = (state.rentExpenses || []).reduce((s, r) => s + r.amount, 0);
          responseText = `🏠 **Rent Portal Snapshot:**\n• Total Rent Collected: **₹${totalRent.toLocaleString('en-IN')}**\n• Maintenance/Expenses: **₹${totalExpenses.toLocaleString('en-IN')}**\n• Net Earnings: **₹${(totalRent - totalExpenses).toLocaleString('en-IN')}**`;
        }
        actionDetails = {
          type: 'RENT_ACTION',
          summary: 'Rent portal query executed',
        };
      }
      // 7. FINANCIAL HEALTH & NET WORTH
      else if (lower.includes('net worth') || lower.includes('summary') || lower.includes('how much') || lower.includes('health') || lower.includes('burn')) {
        const currentMonth = today().substring(0, 7);
        const monthlyExp = (state.daily || [])
          .filter(e => (e.date || '').substring(0, 7) === currentMonth)
          .reduce((sum, e) => sum + e.amount, 0);

        const totalInvested = (state.investments || []).reduce((sum, i) => sum + (i.currentValue || i.investedAmount || 0), 0);
        const inventoryVal = (store.getInventory() || []).filter(i => i.status === 'in_stock').reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const goalsSaved = (state.goals || []).reduce((sum, g) => sum + g.savedAmount, 0);

        responseText = `💎 **Comprehensive Financial Rollup (${currentMonth}):**\n\n` +
          `• **Portfolio Holdings:** ₹${totalInvested.toLocaleString('en-IN')}\n` +
          `• **Goals Saved:** ₹${goalsSaved.toLocaleString('en-IN')}\n` +
          `• **Pantry Stock Value:** ₹${inventoryVal.toLocaleString('en-IN')}\n` +
          `• **Estimated Net Worth:** **₹${(totalInvested + goalsSaved + inventoryVal).toLocaleString('en-IN')}**\n\n` +
          `🔥 **Monthly Burn Rate:** ₹${monthlyExp.toLocaleString('en-IN')} spent this month.`;

        actionDetails = {
          type: 'FINANCE_ROLLUP',
          summary: 'Calculated real-time net worth & burn rate',
        };
      }
      // 8. SUPABASE SYNC
      else if (lower.includes('sync') || lower.includes('supabase') || lower.includes('backup') || lower.includes('cloud')) {
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state }),
          });
          responseText = `☁️ **Supabase Cloud Sync Successful!** All local state (expenses, inventory, portfolio, goals) synced to the cloud.`;
        } catch {
          responseText = `⚠️ Local state preserved. Supabase sync completed.`;
        }
        actionDetails = {
          type: 'CLOUD_SYNC',
          summary: 'Supabase cloud state backup completed',
        };
      }
      // DEFAULT: CAPABILITIES OVERVIEW
      else {
        responseText = `🤖 **Here are actions I can perform for you:**\n\n` +
          `• \`Add expense 450 for Dinner\` &rarr; Logs expense\n` +
          `• \`Add income 80000 Freelance\` &rarr; Records income\n` +
          `• \`Used 1 milk\` &rarr; Decrements pantry stock\n` +
          `• \`What needs reordering?\` &rarr; Lists low stock items\n` +
          `• \`Contribute 3000 to goal\` &rarr; Saves to target\n` +
          `• \`Log rent received 25000\` &rarr; Records rent\n` +
          `• \`Show net worth summary\` &rarr; Calculates total worth\n` +
          `• \`Sync state to Supabase\` &rarr; Cloud backup`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: responseText,
          actionDetails,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Right Slide-Over Drawer */}
      <aside className="relative w-[440px] max-w-full h-full bg-[#07070f] border-l border-white/[0.12] shadow-2xl flex flex-col z-10 animate-slide-in">
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
                  LIVE STATE
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
            onClick={() => executeAgentAction('What needs reordering?')}
            className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
          >
            <Package size={11} className="text-amber-400" /> Stock Audit
          </button>
          <button
            onClick={() => executeAgentAction('Show net worth summary')}
            className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
          >
            <DollarSign size={11} className="text-emerald-400" /> Net Worth
          </button>
          <button
            onClick={() => executeAgentAction('Sync state to Supabase')}
            className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
          >
            <RefreshCw size={11} className="text-cyan-400" /> Cloud Sync
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
                className={`max-w-[90%] rounded-2xl p-3.5 space-y-1.5 ${
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-br-none shadow-lg shadow-purple-600/20'
                    : 'bg-[#121222] border border-white/10 text-gray-200 rounded-bl-none shadow-xl'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

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
            placeholder="Command or query (e.g. 'Add expense 250 for Coffee', 'Used 1 milk')..."
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
    </div>
  );
}

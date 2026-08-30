'use client';

import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store-context";
import { Sparkles, Send, X, Bot, Check, Package, DollarSign, RefreshCw } from "lucide-react";
import { formatFull, today } from "@/lib/utils";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  actionDetails?: {
    type: string;
    summary: string;
    data?: any;
  };
  timestamp: string;
}

export default function AgentCopilot() {
  const { state, store, refresh } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "agent",
      text: "👋 Hi! I am your Agent-Native Copilot for FinanceOS. You can command actions in natural language or execute automated agent tasks.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const executeAgentAction = async (userPrompt: string) => {
    const prompt = userPrompt.trim();
    if (!prompt) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      const lower = prompt.toLowerCase();
      let responseText = "";
      let actionDetails: Message["actionDetails"] = undefined;

      const expenseMatch = lower.match(/(?:add expense|spent|paid|buy|bought)\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:for|on|at)?\s*(.*)/i);
      if (expenseMatch) {
        const amount = parseFloat(expenseMatch[1]);
        const desc = (expenseMatch[2] || "General Expense").trim();
        const category = /petrol|fuel|diesel/i.test(desc) ? "Fuel & Petrol"
          : /dinner|lunch|food|coffee|snack|restaurant|swiggy|zomato/i.test(desc) ? "Food & Dining"
          : /blinkit|grocery|milk|vegetable/i.test(desc) ? "Blinkit"
          : /movie|netflix|entertainment/i.test(desc) ? "Entertainment"
          : "Personal";

        store.upsertDaily({
          id: "",
          accountId: "default",
          date: today(),
          amount,
          category,
          note: desc,
          paymentMethod: "UPI",
          bankAccount: "HDFC Bank",
          paidBy: state.settings.name || "Mandar",
        });
        refresh();

        responseText = `✅ Added expense of **₹${amount}** for **${desc}** under *${category}*.`;
        actionDetails = {
          type: "CREATE_EXPENSE",
          summary: `₹${amount} recorded in Daily Log`,
          data: { amount, desc, category },
        };
      }
      else if (lower.includes("consume") || lower.includes("used") || lower.includes("drink") || lower.includes("finish")) {
        const inventory = store.getInventory() || [];
        const matchedItem = inventory.find(i => 
          lower.includes(i.name.toLowerCase()) || 
          i.name.toLowerCase().split(" ").some(word => word.length > 3 && lower.includes(word))
        );

        if (matchedItem) {
          store.consumeInventoryItem(matchedItem.id, 1);
          refresh();
          responseText = `🥄 Used 1 unit of **${matchedItem.name}**! Remaining stock updated.`;
          actionDetails = {
            type: "CONSUME_INVENTORY",
            summary: `Stock decremented for ${matchedItem.name}`,
            data: matchedItem,
          };
        } else {
          responseText = `🔍 I looked in your inventory, but could not find that item. Items in stock: ` +
            inventory.slice(0, 4).map(i => `**${i.name}** (${i.quantity} left)`).join(", ");
        }
      }
      else if (lower.includes("low stock") || lower.includes("what needs reordering") || lower.includes("stock status")) {
        const inventory = store.getInventory() || [];
        const lowStock = inventory.filter(i => i.status === "low_stock" || i.quantity <= 1);
        const inStock = inventory.filter(i => i.status === "in_stock");

        if (lowStock.length > 0) {
          responseText = `⚠️ **${lowStock.length} items** are low on stock and need reordering:\n` +
            lowStock.map(i => `• **${i.name}** — ${i.quantity} ${i.unit || "pcs"} left`).join("\n");
        } else {
          responseText = `✅ All pantry items are well stocked! Total **${inStock.length} items** in stock worth **${formatFull(inStock.reduce((s, i) => s + (i.price * i.quantity), 0))}**.`;
        }
        actionDetails = {
          type: "STOCK_CHECK",
          summary: `Evaluated ${inventory.length} inventory items`,
        };
      }
      else if (lower.includes("net worth") || lower.includes("summary") || lower.includes("balance") || lower.includes("how much")) {
        const currentMonth = today().substring(0, 7);
        const totalExpenses = (state.daily || [])
          .filter(e => (e.date || "").substring(0, 7) === currentMonth)
          .reduce((sum, e) => sum + e.amount, 0);

        const totalInvested = (state.investments || []).reduce((sum, i) => sum + (i.currentValue || i.investedAmount || 0), 0);
        const inventoryValue = (store.getInventory() || []).filter(i => i.status === "in_stock").reduce((sum, i) => sum + (i.price * i.quantity), 0);

        responseText = `📊 **Monthly Financial Overview (${currentMonth}):**\n` +
          `• **Total Expenses:** ₹${totalExpenses.toLocaleString("en-IN")}\n` +
          `• **Portfolio Value:** ₹${totalInvested.toLocaleString("en-IN")}\n` +
          `• **Pantry Stock Worth:** ₹${inventoryValue.toLocaleString("en-IN")}\n` +
          `• **Connected Member:** ${state.settings.name || "Mandar"}`;

        actionDetails = {
          type: "FINANCE_SUMMARY",
          summary: "Real-time financial roll-up calculated",
        };
      }
      else if (lower.includes("sync") || lower.includes("supabase") || lower.includes("backup")) {
        try {
          await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state }),
          });
          responseText = `☁️ **Cloud Sync Successful!** All local state (expenses, inventory, investments, goals) synced to Supabase.`;
        } catch (e) {
          responseText = `⚠️ Cloud sync attempted. State saved locally.`;
        }
        actionDetails = {
          type: "CLOUD_SYNC",
          summary: "Supabase real-time synchronization",
        };
      }
      else {
        responseText = `💡 I can execute actions across your finance OS! Try typing:\n` +
          `• \`Add expense 250 for Coffee\`\n` +
          `• \`Used 1 milk\` or \`Consume 1 coffee\`\n` +
          `• \`What needs reordering?\`\n` +
          `• \`Show net worth summary\`\n` +
          `• \`Sync state to Supabase\``;
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "agent",
          text: responseText,
          actionDetails,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3.5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 transition-all hover:scale-105 group backdrop-blur-md"
        title="Agent-Native Copilot (Cmd+K)"
      >
        <Sparkles size={16} className="text-purple-200 group-hover:text-yellow-300" />
        <span className="text-xs font-bold tracking-wide">Agent Copilot</span>
        <kbd className="hidden sm:inline-block text-[10px] bg-black/40 px-1.5 py-0.5 rounded border border-white/10 text-purple-200">
          ⌘K
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e1c] border border-purple-500/30 rounded-2xl max-w-xl w-full h-[560px] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-white/10 bg-[#141426] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Agent-Native Copilot
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">
                      Live State
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">Natural language actions &amp; state automation</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-black/30 px-4 py-2 border-b border-white/5 flex gap-2 overflow-x-auto text-[11px]">
              <button
                onClick={() => executeAgentAction("What needs reordering?")}
                className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1.5"
              >
                <Package size={11} className="text-amber-400" /> Check Stock
              </button>
              <button
                onClick={() => executeAgentAction("Show net worth summary")}
                className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1.5"
              >
                <DollarSign size={11} className="text-emerald-400" /> Net Worth
              </button>
              <button
                onClick={() => executeAgentAction("Sync state to Supabase")}
                className="bg-white/5 hover:bg-purple-600/30 text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={11} className="text-cyan-400" /> Cloud Sync
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                      msg.sender === "user"
                        ? "bg-purple-600 text-white rounded-br-none"
                        : "bg-[#18182e] border border-white/10 text-gray-200 rounded-bl-none shadow-lg"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                    {msg.actionDetails && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[10px] text-purple-300 bg-black/20 px-2.5 py-1.5 rounded-lg">
                        <Check size={12} className="text-emerald-400 shrink-0" />
                        <span className="font-semibold">{msg.actionDetails.summary}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-purple-400 bg-[#18182e] p-3 rounded-2xl w-fit border border-purple-500/20">
                  <Sparkles size={14} className="animate-spin" />
                  <span>Agent executing action...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeAgentAction(input);
              }}
              className="p-3 border-t border-white/10 bg-[#141426] flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask or command (e.g. 'Add expense 250 for Coffee', 'Used 1 milk')..."
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

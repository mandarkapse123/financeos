// FinanceOS v2 — Formatting and utility helpers

export {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INVESTMENT_TYPES,
  PAYMENT_METHODS,
  SUBSCRIPTION_CATEGORIES,
  RENT_EXPENSE_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  CHART_PALETTE,
} from './types';

export function formatCurrency(n: number, currency: string = '₹'): string {
  const abs = Math.abs(n);
  if (abs >= 10000000) return currency + (n / 10000000).toFixed(2) + 'Cr';
  if (abs >= 100000) return currency + (n / 100000).toFixed(2) + 'L';
  if (abs >= 1000) return currency + (n / 1000).toFixed(1) + 'K';
  return currency + Math.round(n).toLocaleString('en-IN');
}

export function formatFull(n: number, currency: string = '₹'): string {
  return currency + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function thisMonth(): string {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}

export function getMonthLabel(m: string): string {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function getLast6Months(): string[] {
  const r: string[] = [];
  const n = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(n.getFullYear(), n.getMonth() - i, 1);
    r.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return r;
}

export function filterByMonth<T extends { date: string }>(arr: T[], month: string): T[] {
  return arr.filter(x => (x.date || '').startsWith(month));
}

export function sumAmounts<T extends { amount: number }>(arr: T[]): number {
  return arr.reduce((s, x) => s + (parseFloat(String(x.amount)) || 0), 0);
}

export function monthlyAmount(item: { amount: number; frequency?: string; cycle?: string }): number {
  const a = item.amount || 0;
  const f = (item.frequency || item.cycle || 'monthly').toLowerCase();
  if (f === 'monthly') return a;
  if (f === 'weekly') return a * 4.33;
  if (f === 'yearly' || f === 'annual') return a / 12;
  if (f === 'quarterly') return a / 3;
  return a;
}

export function daysBetween(a: string, b: string): number {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function estimateTimeRemaining(remaining: number, monthlyContrib: number): string {
  if (remaining <= 0) return '🎉 Completed!';
  if (!monthlyContrib || monthlyContrib <= 0) return 'Set monthly contribution';
  const ms = remaining / monthlyContrib;
  if (ms < 1) { const d = Math.ceil(ms * 30); return '~' + d + ' day' + (d > 1 ? 's' : ''); }
  if (ms < 1.5) return '~1 month';
  if (ms < 12) { const m = Math.round(ms); return '~' + m + ' months'; }
  const y = Math.floor(ms / 12), rm = Math.round(ms % 12);
  return rm > 0 ? '~' + y + 'y ' + rm + 'm' : '~' + y + ' year' + (y > 1 ? 's' : '');
}

export function estimateCompletionDate(remaining: number, monthlyContrib: number): string | null {
  if (remaining <= 0 || !monthlyContrib || monthlyContrib <= 0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + Math.ceil(remaining / monthlyContrib));
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getGreeting(): string {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

export function downloadFile(name: string, content: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

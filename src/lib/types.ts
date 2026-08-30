// FinanceOS v2 — Core Data Types

export interface Profile {
  id: string;
  name: string;
  email?: string;
  currency: string;
  avatar?: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'personal' | 'business' | 'joint' | 'other';
  isDefault: boolean;
  currency: string;
  createdAt: string;
}

export interface IncomeEntry {
  id: string;
  accountId: string;
  bankAccount?: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'monthly' | 'weekly' | 'yearly' | 'quarterly' | 'one-time';
  date: string;
  note: string;
}

export interface ExpenseEntry {
  id: string;
  accountId: string;
  bankAccount?: string;
  paidBy?: string; // Member name (e.g. 'Mandar', 'Pooja', 'Family Member')
  name: string;
  amount: number;
  category: string;
  date: string;
  note: string;
  kmReading?: number;
}

export interface Subscription {
  id: string;
  accountId: string;
  name: string;
  amount: number;
  cycle: 'monthly' | 'yearly' | 'quarterly' | 'weekly';
  renewalDate: string;
  category: string;
  icon: string;
  note: string;
}

export interface Investment {
  id: string;
  accountId: string;
  name: string;
  type: string;
  investedAmount: number;
  currentValue: number;
  date: string;
  goalId: string;
  note: string;
  tickerSymbol?: string;
  lastPriceUpdate?: string;
  // Groww & CAS fields
  isin?: string;
  quantity?: number;
  avgBuyPrice?: number;
  closingPrice?: number;
  clientCode?: string;
  unrealisedPnl?: number;
}

export interface Goal {
  id: string;
  accountId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContrib: number;
  targetDate: string;
  color: string;
  note: string;
  contributions: GoalContribution[];
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface DailyExpense {
  id: string;
  accountId: string;
  bankAccount?: string;
  paidBy?: string; // Member name
  amount: number;
  category: string;
  paymentMethod: string;
  date: string;
  note: string;
  kmReading?: number;
}

export interface RentEntry {
  id: string;
  accountId: string;
  bankAccount?: string;
  date: string;
  amount: number;
  period: string;
  mode: string;
  notes: string;
}

export interface RentExpense {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
}

export interface RentReceipt {
  id: string;
  accountId: string;
  name: string;
  data: string; // base64 or URL
  size: number;
  date: string;
}

export interface Budget {
  [category: string]: number;
}

export interface AppSettings {
  name: string;
  currency: string;
  endpoint: string;
  budgets: Budget;
  customCategories?: string[];
  deletedIds?: string[];
  openingBalances?: Record<string, number>;
  theme?: 'dark' | 'light';
  tickerPreferences?: string[];
}

export const AVAILABLE_TICKER_OPTIONS = [
  { id: 'nifty', label: 'NIFTY 50 Index' },
  { id: 'petrol', label: 'Pune Petrol Price' },
  { id: 'spend', label: 'Monthly Expense Spend' },
  { id: 'portfolio', label: 'Portfolio Value' },
  { id: 'pantry', label: 'Pantry Stock Count & Value' },
  { id: 'bitcoin', label: 'Bitcoin Price' },
  { id: 'sync', label: 'Supabase Cloud Sync Status' },
  { id: 'user', label: 'Active User Profile' },
];

export interface InventoryItem {
  id: string;
  accountId: string;
  name: string;
  category: string; // 'Dairy & Eggs', 'Pantry & Staples', 'Fruits & Vegetables', 'Snacks & Munchies', 'Beverages', 'Personal Care', 'Cleaning & Household', 'Health & Supplements', 'Other'
  quantity: number;
  unit?: string; // 'pcs', 'kg', 'g', 'L', 'ml', 'pack', 'bottle'
  price: number;
  totalAmount: number;
  purchaseDate: string;
  orderId?: string;
  status: 'in_stock' | 'low_stock' | 'consumed';
  notes?: string;
  expiryDate?: string;
}

export interface AppState {
  settings: AppSettings;
  accounts: Account[];
  currentAccountId: string;
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  subscriptions: Subscription[];
  investments: Investment[];
  goals: Goal[];
  daily: DailyExpense[];
  rentEntries: RentEntry[];
  rentExpenses: RentExpense[];
  rentReceipts: RentReceipt[];
  inventory?: InventoryItem[];
}

// Constants
export const INVENTORY_CATEGORIES = [
  'Dairy & Eggs',
  'Pantry & Staples',
  'Fruits & Vegetables',
  'Snacks & Munchies',
  'Beverages',
  'Personal Care',
  'Cleaning & Household',
  'Health & Supplements',
  'Other'
] as string[];

export const EXPENSE_CATEGORIES = [
  'Petrol', 'Blinkit', 'Food & Dining', 'Medical', 'Clothing & Shopping', 'Health Supplements',
  'Transport', 'Housing / Rent', 'Entertainment', 'Education',
  'Utilities', 'Personal Care', 'Other'
] as string[];

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Dividends', 'Rental Income',
  'Interest', 'Bonus', 'Gift', 'Other'
] as string[];

export const INVESTMENT_TYPES = [
  'Stocks / Equity', 'Mutual Funds', 'Crypto', 'Fixed Deposit',
  'Gold', 'Real Estate', 'PPF / EPF', 'NPS', 'Bonds', 'Other'
] as string[];

export const PAYMENT_METHODS = [
  'UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking', 'Other'
] as string[];

export const BANK_ACCOUNTS = [
  'HDFC Bank', 'ICICI Bank', 'SBI Bank'
] as string[];

export const SUBSCRIPTION_CATEGORIES = [
  'Streaming', 'Music', 'Cloud Storage', 'Productivity',
  'News', 'Gaming', 'Fitness', 'Other'
] as string[];

export const RENT_EXPENSE_CATEGORIES = [
  'Plumbing', 'Electrical', 'Painting', 'Carpentry',
  'Pest Control', 'Cleaning', 'Other'
] as string[];

export const CATEGORY_ICONS: Record<string, string> = {
  'Petrol': '⛽', 'Blinkit': '🛍️', 'Food & Dining': '🍔', 'Medical': '🏥', 'Clothing & Shopping': '👗',
  'Health Supplements': '💊', 'Transport': '🚗', 'Housing / Rent': '🏠',
  'Entertainment': '🎬', 'Education': '📚', 'Utilities': '💡',
  'Personal Care': '💆', 'Other': '📦', 'Salary': '💼',
  'Freelance': '💻', 'Business': '🏢', 'Dividends': '📈',
  'Rental Income': '🏡', 'Interest': '🏦', 'Bonus': '🎁', 'Gift': '🎀',
  'Stocks / Equity': '📈', 'Mutual Funds': '🏦', 'Crypto': '₿',
  'Fixed Deposit': '🏛️', 'Gold': '🏅', 'Real Estate': '🏠',
  'PPF / EPF': '🛡️', 'NPS': '🎯', 'Bonds': '📜',
  'Plumbing': '🔧', 'Electrical': '⚡', 'Painting': '🎨',
  'Carpentry': '🪚', 'Pest Control': '🐛', 'Cleaning': '🧹',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Petrol': '#ef4444', 'Food & Dining': '#f59e0b', 'Medical': '#ef4444', 'Clothing & Shopping': '#ec4899',
  'Health Supplements': '#84cc16', 'Transport': '#a855f7', 'Housing / Rent': '#14b8a6',
  'Entertainment': '#3b82f6', 'Education': '#6366f1', 'Utilities': '#eab308',
  'Personal Care': '#10b981', 'Other': '#94a3b8',
};

export const CHART_PALETTE = [
  '#7c3aed', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6',
  '#ec4899', '#14b8a6', '#84cc16', '#f97316', '#a855f7',
];

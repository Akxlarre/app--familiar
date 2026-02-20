// =============================================================================
// FamilyApp — Finance module models (v2)
// =============================================================================

export type AccountType = 'bank' | 'cash' | 'credit_card' | 'debit_card' | 'savings';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'expense' | 'income' | 'both';
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Account {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  household_id: string | null;
  parent_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  children?: Category[];
}

export interface Transaction {
  id: string;
  household_id: string;
  profile_id: string;
  account_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  transfer_to_account_id: string | null;
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
  profile_name?: string;
  receipt?: Receipt;
}

export interface Receipt {
  id: string;
  transaction_id: string | null;
  household_id: string;
  storage_path: string;
  merchant: string | null;
  raw_ocr_text: string | null;
  raw_ocr_data: Record<string, unknown> | null;
  created_at: string;
  items?: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  product_name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  product_id: string | null;
  sort_order: number;
}

export interface Budget {
  id: string;
  household_id: string;
  category_id: string;
  year: number;
  month: number;
  amount: number;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface RecurringTransaction {
  id: string;
  household_id: string;
  profile_id: string;
  account_id: string;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  next_due_date: string;
  is_active: boolean;
  auto_create: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  budgetUsedPercent: number;
  totalBudget: number;
  totalSpent: number;
  topCategories: { categoryId: string; categoryName: string; value: number }[];
  incomeVsLastMonth?: number;
  expensesVsLastMonth?: number;
}

export interface CreateReceiptInput {
  household_id: string;
  storage_path: string;
  merchant?: string | null;
  raw_ocr_text?: string | null;
  raw_ocr_data?: Record<string, unknown> | null;
}

export interface OcrResult {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  rawText?: string;
}

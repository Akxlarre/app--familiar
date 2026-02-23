// =============================================================================
// FamilyApp — Finance module models (v2)
// =============================================================================

export type AccountType = 'bank' | 'cash' | 'credit_card' | 'debit_card' | 'savings' | 'digital_wallet';
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
  owner_profile_id?: string | null;
  purpose?: string | null;
  bank_name?: string | null;
  card_last4?: string | null;
  linked_email?: string | null;
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

/** Presupuesto por propósito: balance y gastos sincronizados con totales de cuentas. */
export interface BudgetByPurpose {
  purpose: string;
  purposeLabel: string;
  balance: number;
  spent: number;
  transfersIn: number;
  accountIds: string[];
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

export type EmailTransactionLogStatus = 'auto_created' | 'pending_review' | 'rejected' | 'failed';

export interface EmailTransactionLog {
  id: string;
  email_id: string;
  profile_id: string;
  household_id: string;
  bank_parser_id: string | null;
  raw_subject: string | null;
  raw_snippet: string | null;
  extracted_data: { amount?: number; merchant?: string; date?: string; [key: string]: unknown };
  confidence_score: number;
  status: EmailTransactionLogStatus;
  transaction_id: string | null;
  inbox_email?: string | null;
  processed_at: string;
  created_at: string;
}

export type BankEmailType = 'purchase_alert' | 'statement' | 'payment_confirmation' | 'payment_received' | 'installment_notice';

export interface BankEmailParser {
  id: string;
  household_id: string;
  bank_name: string;
  sender_pattern: string;
  subject_pattern: string | null;
  body_rules: Record<string, string>;
  email_type: BankEmailType;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  default_account_id?: string | null;
}

export interface CreditCardDetails {
  id: string;
  account_id: string;
  credit_limit: number;
  billing_cycle_day: number;
  payment_due_day: number;
  current_statement_balance: number;
  minimum_payment: number;
  created_at: string;
  updated_at: string;
}

export interface InstallmentPurchase {
  id: string;
  household_id: string;
  account_id: string;
  category_id: string;
  description: string;
  total_amount: number;
  installment_count: number;
  installments_paid: number;
  installment_amount: number;
  interest_rate: number;
  purchase_date: string;
  first_installment_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  account?: Pick<Account, 'id' | 'name' | 'color'>;
  category?: Pick<Category, 'id' | 'name'>;
}

export interface SavingsGoal {
  id: string;
  household_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  account_id: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  account?: Account;
}

export interface Tag {
  id: string;
  household_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface TransactionSplit {
  id: string;
  transaction_id: string;
  profile_id: string;
  amount: number;
  note: string | null;
  created_at: string;
  profile_name?: string;
}

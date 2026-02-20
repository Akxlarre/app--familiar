import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Transaction, Category, Account } from '@core/models/finance.model';

export interface TransactionsFilter {
  householdId: string;
  fromDate?: string;
  toDate?: string;
  type?: 'income' | 'expense' | 'transfer';
  categoryId?: string;
  profileId?: string;
  accountId?: string;
  search?: string;
}

export interface CreateTransactionInput {
  householdId: string;
  profileId: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  note?: string | null;
  transferToAccountId?: string | null;
  recurringId?: string | null;
}

export interface UpdateTransactionInput {
  accountId?: string;
  categoryId?: string;
  type?: 'income' | 'expense' | 'transfer';
  amount?: number;
  date?: string;
  note?: string | null;
  transferToAccountId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private supabase = inject(SupabaseService);

  async getTransactions(filter: TransactionsFilter): Promise<{ data: Transaction[]; error: Error | null }> {
    let query = this.supabase.client
      .from('transactions')
      .select(`
        id,
        household_id,
        profile_id,
        account_id,
        category_id,
        type,
        amount,
        date,
        note,
        transfer_to_account_id,
        recurring_id,
        created_at,
        updated_at,
        categories (id, name, icon, color, type, parent_id),
        accounts (id, name, type, icon, color),
        profiles (display_name)
      `)
      .eq('household_id', filter.householdId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter.fromDate) query = query.gte('date', filter.fromDate);
    if (filter.toDate) query = query.lte('date', filter.toDate);
    if (filter.type) query = query.eq('type', filter.type);
    if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
    if (filter.profileId) query = query.eq('profile_id', filter.profileId);
    if (filter.accountId) query = query.eq('account_id', filter.accountId);
    if (filter.search?.trim()) query = query.ilike('note', `%${filter.search.trim()}%`);

    const { data, error } = await query;

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map(row => this.mapRow(row)), error: null };
  }

  async getTransaction(id: string): Promise<{ data: Transaction | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('transactions')
      .select(`
        *,
        categories (id, name, icon, color, type, parent_id),
        accounts (id, name, type, icon, color),
        profiles (display_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async createTransaction(input: CreateTransactionInput): Promise<{ data?: Transaction; error: Error | null }> {
    const payload: Record<string, unknown> = {
      household_id: input.householdId,
      profile_id: input.profileId,
      account_id: input.accountId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      date: input.date,
      note: input.note ?? null,
      transfer_to_account_id: input.transferToAccountId ?? null,
      recurring_id: input.recurringId ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.client
      .from('transactions')
      .insert(payload)
      .select(`
        *,
        categories (id, name, icon, color, type, parent_id),
        accounts (id, name, type, icon, color),
        profiles (display_name)
      `)
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateTransaction(id: string, input: UpdateTransactionInput): Promise<{ data?: Transaction; error: Error | null }> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.accountId !== undefined) payload['account_id'] = input.accountId;
    if (input.categoryId !== undefined) payload['category_id'] = input.categoryId;
    if (input.type !== undefined) payload['type'] = input.type;
    if (input.amount !== undefined) payload['amount'] = input.amount;
    if (input.date !== undefined) payload['date'] = input.date;
    if (input.note !== undefined) payload['note'] = input.note;
    if (input.transferToAccountId !== undefined) payload['transfer_to_account_id'] = input.transferToAccountId;

    const { data, error } = await this.supabase.client
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        categories (id, name, icon, color, type, parent_id),
        accounts (id, name, type, icon, color),
        profiles (display_name)
      `)
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async deleteTransaction(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('transactions').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  /** Expense total by category in a date range (for budget comparison). */
  async getExpensesByCategoryForMonth(
    householdId: string,
    year: number,
    month: number
  ): Promise<{ data: { category_id: string; total: number }[]; error: Error | null }> {
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0);
    const toDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    const { data: list, error } = await this.getTransactions({
      householdId,
      fromDate: firstDay,
      toDate,
      type: 'expense',
    });
    if (error) return { data: [], error };

    const byCategory = new Map<string, number>();
    for (const t of list) {
      const prev = byCategory.get(t.category_id) ?? 0;
      byCategory.set(t.category_id, prev + t.amount);
    }
    return {
      data: Array.from(byCategory.entries()).map(([category_id, total]) => ({ category_id, total })),
      error: null,
    };
  }

  /** Aggregated by category for charts (expense type in range). */
  async getExpensesAggregatedByCategory(
    householdId: string,
    fromDate: string,
    toDate: string
  ): Promise<{ data: { categoryId: string; categoryName: string; value: number }[]; error: Error | null }> {
    const { data: list, error } = await this.getTransactions({
      householdId,
      fromDate,
      toDate,
      type: 'expense',
    });
    if (error) return { data: [], error };

    const byCategory = new Map<string, { name: string; value: number }>();
    for (const t of list) {
      const name = t.category?.name ?? 'Sin categoría';
      const prev = byCategory.get(t.category_id) ?? { name, value: 0 };
      prev.value += t.amount;
      byCategory.set(t.category_id, prev);
    }
    return {
      data: Array.from(byCategory.entries()).map(([categoryId, { name, value }]) => ({
        categoryId,
        categoryName: name,
        value,
      })),
      error: null,
    };
  }

  /** Aggregated by month (last N months). */
  async getExpensesAggregatedByMonth(
    householdId: string,
    months: number
  ): Promise<{ data: { name: string; value: number; year: number; month: number }[]; error: Error | null }> {
    const end = new Date();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const result: { name: string; value: number; year: number; month: number }[] = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0);
      const toDate = `${year}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const { data: list } = await this.getTransactions({
        householdId,
        fromDate: firstDay,
        toDate,
        type: 'expense',
      });
      const total = list.reduce((s, t) => s + t.amount, 0);
      result.push({
        name: `${monthNames[d.getMonth()]} ${year}`,
        value: total,
        year,
        month,
      });
    }
    result.reverse();
    return { data: result, error: null };
  }

  private mapRow(row: Record<string, unknown>): Transaction {
    const cat = row['categories'] as Record<string, unknown> | null;
    const acc = row['accounts'] as Record<string, unknown> | null;
    const prof = row['profiles'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      profile_id: row['profile_id'] as string,
      account_id: row['account_id'] as string,
      category_id: row['category_id'] as string,
      type: row['type'] as Transaction['type'],
      amount: Number(row['amount']),
      date: row['date'] as string,
      note: (row['note'] as string) ?? null,
      transfer_to_account_id: (row['transfer_to_account_id'] as string) ?? null,
      recurring_id: (row['recurring_id'] as string) ?? null,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
      category: cat
        ? {
            id: cat['id'] as string,
            name: cat['name'] as string,
            icon: (cat['icon'] as string) ?? null,
            color: (cat['color'] as string) ?? null,
            type: cat['type'] as Category['type'],
            household_id: (cat['household_id'] as string) ?? null,
            parent_id: (cat['parent_id'] as string) ?? null,
            is_system: (cat['is_system'] as boolean) ?? false,
            sort_order: Number(cat['sort_order'] ?? 0),
            created_at: (cat['created_at'] as string) ?? '',
          }
        : undefined,
      account: acc
        ? {
            id: acc['id'] as string,
            household_id: acc['household_id'] as string,
            name: acc['name'] as string,
            type: acc['type'] as Account['type'],
            currency: (acc['currency'] as string) ?? 'CLP',
            initial_balance: Number(acc['initial_balance'] ?? 0),
            icon: (acc['icon'] as string) ?? null,
            color: (acc['color'] as string) ?? null,
            is_active: (acc['is_active'] as boolean) ?? true,
            sort_order: Number(acc['sort_order'] ?? 0),
            created_at: acc['created_at'] as string,
            updated_at: acc['updated_at'] as string,
          }
        : undefined,
      profile_name: prof ? (prof['display_name'] as string) : undefined,
    };
  }
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { RecurringTransaction, Category, Account } from '@core/models/finance.model';

export interface CreateRecurringInput {
  householdId: string;
  profileId: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  description?: string | null;
  frequency: RecurringTransaction['frequency'];
  dayOfMonth?: number | null;
  nextDueDate: string;
  autoCreate?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RecurringService {
  private supabase = inject(SupabaseService);

  async getRecurring(householdId: string): Promise<{ data: RecurringTransaction[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('recurring_transactions')
      .select(`
        *,
        categories (id, name, icon, color, type),
        accounts (id, name, type, icon, color)
      `)
      .eq('household_id', householdId)
      .order('next_due_date', { ascending: true });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map(row => this.mapRow(row)), error: null };
  }

  async getRecurringById(id: string): Promise<{ data: RecurringTransaction | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('recurring_transactions')
      .select('*, categories (*), accounts (*)')
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async createRecurring(input: CreateRecurringInput): Promise<{ data?: RecurringTransaction; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('recurring_transactions')
      .insert({
        household_id: input.householdId,
        profile_id: input.profileId,
        account_id: input.accountId,
        category_id: input.categoryId,
        type: input.type,
        amount: input.amount,
        description: input.description ?? null,
        frequency: input.frequency,
        day_of_month: input.dayOfMonth ?? null,
        next_due_date: input.nextDueDate,
        auto_create: input.autoCreate ?? false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateRecurring(
    id: string,
    updates: Partial<Pick<RecurringTransaction, 'type' | 'amount' | 'description' | 'frequency' | 'day_of_month' | 'next_due_date' | 'is_active' | 'auto_create' | 'account_id' | 'category_id'>>
  ): Promise<{ data?: RecurringTransaction; error: Error | null }> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.type !== undefined) payload['type'] = updates.type;
    if (updates.amount !== undefined) payload['amount'] = updates.amount;
    if (updates.description !== undefined) payload['description'] = updates.description;
    if (updates.frequency !== undefined) payload['frequency'] = updates.frequency;
    if (updates.day_of_month !== undefined) payload['day_of_month'] = updates.day_of_month;
    if (updates.next_due_date !== undefined) payload['next_due_date'] = updates.next_due_date;
    if (updates.is_active !== undefined) payload['is_active'] = updates.is_active;
    if (updates.auto_create !== undefined) payload['auto_create'] = updates.auto_create;
    if (updates.account_id !== undefined) payload['account_id'] = updates.account_id;
    if (updates.category_id !== undefined) payload['category_id'] = updates.category_id;

    const { data, error } = await this.supabase.client
      .from('recurring_transactions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async deleteRecurring(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('recurring_transactions').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  /** Recurring due in the next N days. */
  async getUpcoming(householdId: string, days = 30): Promise<{ data: RecurringTransaction[]; error: Error | null }> {
    const from = new Date().toISOString().slice(0, 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + days);
    const to = toDate.toISOString().slice(0, 10);

    const { data, error } = await this.supabase.client
      .from('recurring_transactions')
      .select('*, categories (*), accounts (*)')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .gte('next_due_date', from)
      .lte('next_due_date', to)
      .order('next_due_date', { ascending: true });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map(row => this.mapRow(row)), error: null };
  }

  private mapCategory(cat: Record<string, unknown>): Category {
    return {
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
    };
  }

  private mapAccount(acc: Record<string, unknown>): Account {
    return {
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
    };
  }

  private mapRow(row: Record<string, unknown>): RecurringTransaction {
    const cat = row['categories'] as Record<string, unknown> | null;
    const acc = row['accounts'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      profile_id: row['profile_id'] as string,
      account_id: row['account_id'] as string,
      category_id: row['category_id'] as string,
      type: row['type'] as RecurringTransaction['type'],
      amount: Number(row['amount']),
      description: (row['description'] as string) ?? null,
      frequency: row['frequency'] as RecurringTransaction['frequency'],
      day_of_month: (row['day_of_month'] as number) ?? null,
      next_due_date: row['next_due_date'] as string,
      is_active: (row['is_active'] as boolean) ?? true,
      auto_create: (row['auto_create'] as boolean) ?? false,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
      category: cat ? this.mapCategory(cat) : undefined,
      account: acc ? this.mapAccount(acc) : undefined,
    };
  }
}

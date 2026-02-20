import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Account } from '@core/models/finance.model';

export interface CreateAccountInput {
  householdId: string;
  name: string;
  type: Account['type'];
  currency?: string;
  initialBalance?: number;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
}

export interface UpdateAccountInput {
  name?: string;
  type?: Account['type'];
  initial_balance?: number;
  icon?: string | null;
  color?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private supabase = inject(SupabaseService);

  async getAccounts(householdId: string, activeOnly = true): Promise<{ data: Account[]; error: Error | null }> {
    let query = this.supabase.client
      .from('accounts')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map(row => this.mapRow(row)), error: null };
  }

  async getAccount(id: string): Promise<{ data: Account | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async createAccount(input: CreateAccountInput): Promise<{ data?: Account; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('accounts')
      .insert({
        household_id: input.householdId,
        name: input.name,
        type: input.type,
        currency: input.currency ?? 'CLP',
        initial_balance: input.initialBalance ?? 0,
        icon: input.icon ?? null,
        color: input.color ?? null,
        sort_order: input.sortOrder ?? 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateAccount(id: string, input: UpdateAccountInput): Promise<{ data?: Account; error: Error | null }> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload['name'] = input.name;
    if (input.type !== undefined) payload['type'] = input.type;
    if (input.initial_balance !== undefined) payload['initial_balance'] = input.initial_balance;
    if (input.icon !== undefined) payload['icon'] = input.icon;
    if (input.color !== undefined) payload['color'] = input.color;
    if (input.is_active !== undefined) payload['is_active'] = input.is_active;
    if (input.sort_order !== undefined) payload['sort_order'] = input.sort_order;

    const { data, error } = await this.supabase.client
      .from('accounts')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async deleteAccount(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('accounts').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  /**
   * Balance = initial_balance + sum(income) - sum(expense) for that account.
   * Transfers out subtract, transfers in add.
   */
  async getAccountBalance(
    accountId: string,
    asOfDate?: string
  ): Promise<{ data: number; error: Error | null }> {
    const { data: account, error: accError } = await this.getAccount(accountId);
    if (accError || !account) return { data: 0, error: accError ?? new Error('Account not found') };

    let queryOut = this.supabase.client
      .from('transactions')
      .select('type, amount, transfer_to_account_id')
      .eq('account_id', accountId);
    if (asOfDate) queryOut = queryOut.lte('date', asOfDate);
    const { data: outList, error: outErr } = await queryOut;
    if (outErr) return { data: Number(account.initial_balance), error: outErr as unknown as Error };

    let queryIn = this.supabase.client
      .from('transactions')
      .select('amount')
      .eq('transfer_to_account_id', accountId)
      .eq('type', 'transfer');
    if (asOfDate) queryIn = queryIn.lte('date', asOfDate);
    const { data: inList, error: inErr } = await queryIn;
    if (inErr) return { data: Number(account.initial_balance), error: inErr as unknown as Error };

    let balance = Number(account.initial_balance);
    for (const tx of outList ?? []) {
      const amount = Number(tx.amount);
      const type = tx.type as string;
      if (type === 'income') balance += amount;
      else if (type === 'expense') balance -= amount;
      else if (type === 'transfer') balance -= amount;
    }
    for (const tx of inList ?? []) {
      balance += Number(tx.amount);
    }
    return { data: balance, error: null };
  }

  /**
   * Balances for all accounts of a household (as of today).
   */
  async getBalancesForHousehold(
    householdId: string,
    asOfDate?: string
  ): Promise<{ data: { accountId: string; balance: number }[]; error: Error | null }> {
    const { data: accounts, error: accError } = await this.getAccounts(householdId, false);
    if (accError) return { data: [], error: accError };

    const result: { accountId: string; balance: number }[] = [];
    for (const acc of accounts) {
      const { data: balance, error } = await this.getAccountBalance(acc.id, asOfDate);
      if (!error) result.push({ accountId: acc.id, balance });
    }
    return { data: result, error: null };
  }

  private mapRow(row: Record<string, unknown>): Account {
    return {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      name: row['name'] as string,
      type: row['type'] as Account['type'],
      currency: (row['currency'] as string) ?? 'CLP',
      initial_balance: Number(row['initial_balance'] ?? 0),
      icon: (row['icon'] as string) ?? null,
      color: (row['color'] as string) ?? null,
      is_active: (row['is_active'] as boolean) ?? true,
      sort_order: Number(row['sort_order'] ?? 0),
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
    };
  }
}

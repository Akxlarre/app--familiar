import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { SavingsGoal, Account } from '@core/models/finance.model';

export interface CreateSavingsGoalInput {
  householdId: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string | null;
  accountId?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string | null;
  accountId?: string | null;
  icon?: string | null;
  color?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SavingsGoalService {
  private supabase = inject(SupabaseService);

  async getGoals(householdId: string): Promise<{ data: SavingsGoal[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('savings_goals')
      .select(`
        *,
        accounts (id, name, type, icon, color)
      `)
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async createGoal(input: CreateSavingsGoalInput): Promise<{ data?: SavingsGoal; error: Error | null }> {
    const payload = {
      household_id: input.householdId,
      name: input.name,
      target_amount: input.targetAmount,
      current_amount: input.currentAmount ?? 0,
      deadline: input.deadline ?? null,
      account_id: input.accountId ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.client
      .from('savings_goals')
      .insert(payload)
      .select('*, accounts (id, name, type, icon, color)')
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateGoal(id: string, input: UpdateSavingsGoalInput): Promise<{ data?: SavingsGoal; error: Error | null }> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload['name'] = input.name;
    if (input.targetAmount !== undefined) payload['target_amount'] = input.targetAmount;
    if (input.currentAmount !== undefined) payload['current_amount'] = input.currentAmount;
    if (input.deadline !== undefined) payload['deadline'] = input.deadline;
    if (input.accountId !== undefined) payload['account_id'] = input.accountId;
    if (input.icon !== undefined) payload['icon'] = input.icon;
    if (input.color !== undefined) payload['color'] = input.color;

    const { data, error } = await this.supabase.client
      .from('savings_goals')
      .update(payload)
      .eq('id', id)
      .select('*, accounts (id, name, type, icon, color)')
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async addToGoal(id: string, amount: number): Promise<{ data?: SavingsGoal; error: Error | null }> {
    const { data: goal } = await this.supabase.client
      .from('savings_goals')
      .select('current_amount')
      .eq('id', id)
      .single();

    if (!goal) return { error: new Error('Meta no encontrada') };
    const newAmount = Number(goal.current_amount) + amount;
    return this.updateGoal(id, { currentAmount: Math.min(newAmount, 999999999) });
  }

  async deleteGoal(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('savings_goals').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): SavingsGoal {
    const acc = row['accounts'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      name: row['name'] as string,
      target_amount: Number(row['target_amount']),
      current_amount: Number(row['current_amount']),
      deadline: (row['deadline'] as string) ?? null,
      account_id: (row['account_id'] as string) ?? null,
      icon: (row['icon'] as string) ?? null,
      color: (row['color'] as string) ?? null,
      sort_order: Number(row['sort_order'] ?? 0),
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
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
            owner_profile_id: (acc['owner_profile_id'] as string) ?? null,
            purpose: (acc['purpose'] as string) ?? null,
            bank_name: (acc['bank_name'] as string) ?? null,
            card_last4: (acc['card_last4'] as string) ?? null,
          }
        : undefined,
    };
  }
}

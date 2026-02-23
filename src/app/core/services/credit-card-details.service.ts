import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { CreditCardDetails } from '@core/models/finance.model';

export interface UpsertCreditCardDetailsInput {
  accountId: string;
  creditLimit: number;
  billingCycleDay: number;
  paymentDueDay: number;
  currentStatementBalance?: number;
  minimumPayment?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CreditCardDetailsService {
  private supabase = inject(SupabaseService);

  async getByAccountId(accountId: string): Promise<{ data: CreditCardDetails | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('credit_card_details')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async upsert(input: UpsertCreditCardDetailsInput): Promise<{ data?: CreditCardDetails; error: Error | null }> {
    const payload = {
      account_id: input.accountId,
      credit_limit: input.creditLimit,
      billing_cycle_day: input.billingCycleDay,
      payment_due_day: input.paymentDueDay,
      current_statement_balance: input.currentStatementBalance ?? 0,
      minimum_payment: input.minimumPayment ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.client
      .from('credit_card_details')
      .upsert(payload, { onConflict: 'account_id', ignoreDuplicates: false })
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateStatementBalance(accountId: string, balance: number, minimumPayment: number): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('credit_card_details')
      .update({
        current_statement_balance: balance,
        minimum_payment: minimumPayment,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId);

    return { error: error ? (error as unknown as Error) : null };
  }

  /** Resta el monto pagado del saldo del estado de cuenta (para registro de pago a la TC). */
  async applyPayment(accountId: string, amount: number): Promise<{ error: Error | null }> {
    const { data: row, error: fetchErr } = await this.supabase.client
      .from('credit_card_details')
      .select('current_statement_balance')
      .eq('account_id', accountId)
      .single();

    if (fetchErr || !row) return { error: (fetchErr as Error) ?? new Error('No hay detalle de tarjeta') };
    const current = Number(row.current_statement_balance ?? 0);
    const newBalance = Math.max(0, current - amount);
    const { error } = await this.supabase.client
      .from('credit_card_details')
      .update({ current_statement_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('account_id', accountId);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): CreditCardDetails {
    return {
      id: row['id'] as string,
      account_id: row['account_id'] as string,
      credit_limit: Number(row['credit_limit'] ?? 0),
      billing_cycle_day: Number(row['billing_cycle_day'] ?? 1),
      payment_due_day: Number(row['payment_due_day'] ?? 10),
      current_statement_balance: Number(row['current_statement_balance'] ?? 0),
      minimum_payment: Number(row['minimum_payment'] ?? 0),
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
    };
  }
}

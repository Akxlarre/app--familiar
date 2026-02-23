import { Injectable, signal, inject, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { TransactionService } from './transaction.service';
import type { EmailTransactionLog } from '@core/models/finance.model';

export interface ApproveInput {
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  note?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class EmailTransactionLogService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private transactionService = inject(TransactionService);

  /** Número de sugerencias pendientes de revisión para el hogar actual. */
  readonly pendingCount = signal<number>(0);

  constructor() {
    effect(() => {
      const householdId = this.auth.currentUser()?.householdId;
      if (householdId) {
        this.refreshPendingCount(householdId);
      } else {
        this.pendingCount.set(0);
      }
    });
  }

  /** Actualiza el signal pendingCount para el hogar dado. */
  async refreshPendingCount(householdId: string): Promise<void> {
    const { count, error } = await this.supabase.client
      .from('email_transactions_log')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('status', 'pending_review');

    if (error) {
      this.pendingCount.set(0);
      return;
    }
    this.pendingCount.set(count ?? 0);
  }

  /** Obtiene los logs recientes (todos los estados) para visualización. */
  async getRecentLogs(householdId: string, limit = 50): Promise<{ data: EmailTransactionLog[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('email_transactions_log')
      .select('*, bank_email_parsers(bank_name)')
      .eq('household_id', householdId)
      .order('processed_at', { ascending: false })
      .limit(limit);

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map(row => this.mapRowWithBank(row)), error: null };
  }

  /** Obtiene las sugerencias pendientes de revisión (incluye default_account_id y email_type del parser). */
  async getPending(householdId: string): Promise<{ data: (EmailTransactionLog & { parser_default_account_id?: string | null; parser_email_type?: string })[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('email_transactions_log')
      .select('*, bank_email_parsers(bank_name, default_account_id, email_type)')
      .eq('household_id', householdId)
      .eq('status', 'pending_review')
      .order('processed_at', { ascending: false });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map(row => this.mapRowWithParser(row)), error: null };
  }

  private mapRowWithParser(row: Record<string, unknown>): EmailTransactionLog & { parser_default_account_id?: string | null; parser_email_type?: string } {
    const base = this.mapRow(row);
    const parser = row['bank_email_parsers'] as { default_account_id?: string; email_type?: string } | null;
    return {
      ...base,
      parser_default_account_id: parser?.default_account_id ?? null,
      parser_email_type: parser?.email_type ?? 'purchase_alert',
    };
  }

  /** Aprueba una sugerencia y crea la transacción. */
  async approveAndCreateTransaction(
    logId: string,
    input: ApproveInput
  ): Promise<{ error: Error | null }> {
    const user = this.auth.currentUser();
    const householdId = user?.householdId;
    const profileId = user?.id;
    if (!householdId || !profileId) {
      return { error: new Error('Usuario no autenticado o sin hogar') };
    }

    const { data: tx, error: createError } = await this.transactionService.createTransaction({
      householdId,
      profileId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      date: input.date,
      note: input.note ?? null,
    });

    if (createError || !tx) return { error: createError ?? new Error('Error al crear transacción') };

    const { error: updateError } = await this.supabase.client
      .from('email_transactions_log')
      .update({
        status: 'auto_created',
        transaction_id: tx.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', logId);

    if (updateError) return { error: updateError as unknown as Error };

    await this.refreshPendingCount(householdId);
    return { error: null };
  }

  /** Rechaza una sugerencia. */
  async reject(logId: string): Promise<{ error: Error | null }> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return { error: new Error('Usuario no autenticado o sin hogar') };

    const { error } = await this.supabase.client
      .from('email_transactions_log')
      .update({ status: 'rejected' })
      .eq('id', logId);

    if (error) return { error: error as unknown as Error };
    await this.refreshPendingCount(householdId);
    return { error: null };
  }

  private mapRowWithBank(row: Record<string, unknown>): EmailTransactionLog & { bank_name?: string } {
    const base = this.mapRow(row);
    const parser = row['bank_email_parsers'] as { bank_name?: string } | null;
    return { ...base, bank_name: parser?.bank_name };
  }

  private mapRow(row: Record<string, unknown>): EmailTransactionLog {
    const extracted = (row['extracted_data'] as Record<string, unknown>) ?? {};
    return {
      id: row['id'] as string,
      email_id: row['email_id'] as string,
      profile_id: row['profile_id'] as string,
      household_id: row['household_id'] as string,
      bank_parser_id: (row['bank_parser_id'] as string) ?? null,
      raw_subject: (row['raw_subject'] as string) ?? null,
      raw_snippet: (row['raw_snippet'] as string) ?? null,
      extracted_data: extracted as EmailTransactionLog['extracted_data'],
      confidence_score: (row['confidence_score'] as number) ?? 0,
      status: (row['status'] as EmailTransactionLog['status']) ?? 'pending_review',
      transaction_id: (row['transaction_id'] as string) ?? null,
      inbox_email: (row['inbox_email'] as string) ?? null,
      processed_at: row['processed_at'] as string,
      created_at: row['created_at'] as string,
    };
  }
}

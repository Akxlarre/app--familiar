import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { TransactionSplit } from '@core/models/finance.model';

export interface CreateSplitInput {
  transactionId: string;
  profileId: string;
  amount: number;
  note?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionSplitService {
  private supabase = inject(SupabaseService);

  async getSplitsForTransaction(transactionId: string): Promise<{ data: TransactionSplit[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('transaction_splits')
      .select(`
        *,
        profiles (display_name)
      `)
      .eq('transaction_id', transactionId);

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async upsert(transactionId: string, splits: { profileId: string; amount: number; note?: string }[]): Promise<{ error: Error | null }> {
    const { error: delError } = await this.supabase.client
      .from('transaction_splits')
      .delete()
      .eq('transaction_id', transactionId);

    if (delError) return { error: delError as unknown as Error };
    if (splits.length === 0) return { error: null };

    const rows = splits.map((s) => ({
      transaction_id: transactionId,
      profile_id: s.profileId,
      amount: s.amount,
      note: s.note ?? null,
    }));

    const { error: insError } = await this.supabase.client.from('transaction_splits').insert(rows);
    return { error: insError ? (insError as unknown as Error) : null };
  }

  async deleteAllForTransaction(transactionId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('transaction_splits')
      .delete()
      .eq('transaction_id', transactionId);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): TransactionSplit {
    const prof = row['profiles'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      transaction_id: row['transaction_id'] as string,
      profile_id: row['profile_id'] as string,
      amount: Number(row['amount']),
      note: (row['note'] as string) ?? null,
      created_at: row['created_at'] as string,
      profile_name: prof ? (prof['display_name'] as string) : undefined,
    };
  }
}

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { InstallmentPurchase } from '@core/models/finance.model';

export interface CreateInstallmentPurchaseInput {
  householdId: string;
  profileId: string;
  accountId: string;
  categoryId: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  installmentAmount: number;
  interestRate?: number;
  purchaseDate: string;
  firstInstallmentDate?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class InstallmentPurchaseService {
  private supabase = inject(SupabaseService);

  async getActiveByHousehold(householdId: string): Promise<{ data: InstallmentPurchase[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('installment_purchases')
      .select('*, accounts(id, name, color), categories(id, name)')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('purchase_date', { ascending: false });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((row) => this.mapRow(row)), error: null };
  }

  async create(input: CreateInstallmentPurchaseInput): Promise<{ data?: InstallmentPurchase; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('installment_purchases')
      .insert({
        household_id: input.householdId,
        account_id: input.accountId,
        category_id: input.categoryId,
        description: input.description,
        total_amount: input.totalAmount,
        installment_count: input.installmentCount,
        installments_paid: 0,
        installment_amount: input.installmentAmount,
        interest_rate: input.interestRate ?? 0,
        purchase_date: input.purchaseDate,
        first_installment_date: input.firstInstallmentDate ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async registerPayment(
    installmentId: string,
    profileId: string,
    date: string
  ): Promise<{ error: Error | null }> {
    const { data: row, error: fetchErr } = await this.supabase.client
      .from('installment_purchases')
      .select('household_id, account_id, category_id, installment_amount, installments_paid, installment_count')
      .eq('id', installmentId)
      .single();

    if (fetchErr || !row) return { error: (fetchErr as Error) ?? new Error('No encontrado') };

    const paid = Number(row.installments_paid) + 1;
    const maxCount = Number(row.installment_count);
    const isActive = paid < maxCount;

    const { error: txErr } = await this.supabase.client.from('transactions').insert({
      household_id: row.household_id,
      profile_id: profileId,
      account_id: row.account_id,
      category_id: row.category_id,
      type: 'expense',
      amount: row.installment_amount,
      date,
      note: `Cuota ${paid}/${maxCount}`,
      updated_at: new Date().toISOString(),
    });

    if (txErr) return { error: txErr as unknown as Error };

    const { error: updateErr } = await this.supabase.client
      .from('installment_purchases')
      .update({
        installments_paid: paid,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', installmentId);

    return { error: updateErr ? (updateErr as unknown as Error) : null };
  }

  async delete(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('installment_purchases').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): InstallmentPurchase {
    const acc = row['accounts'] as Record<string, unknown> | null;
    const cat = row['categories'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      account_id: row['account_id'] as string,
      category_id: row['category_id'] as string,
      description: row['description'] as string,
      total_amount: Number(row['total_amount'] ?? 0),
      installment_count: Number(row['installment_count'] ?? 0),
      installments_paid: Number(row['installments_paid'] ?? 0),
      installment_amount: Number(row['installment_amount'] ?? 0),
      interest_rate: Number(row['interest_rate'] ?? 0),
      purchase_date: row['purchase_date'] as string,
      first_installment_date: (row['first_installment_date'] as string) ?? null,
      is_active: (row['is_active'] as boolean) ?? true,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
      account: acc ? { id: acc['id'] as string, name: acc['name'] as string, color: (acc['color'] as string) ?? null } : undefined,
      category: cat ? { id: cat['id'] as string, name: cat['name'] as string } : undefined,
    };
  }
}

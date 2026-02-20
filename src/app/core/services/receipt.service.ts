import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Receipt, CreateReceiptInput, OcrResult } from '@core/models/finance.model';
import { environment } from '../../../../environments/environment';

const BUCKET = 'receipts';

export interface GetReceiptsFilter {
  householdId: string;
  transactionId?: string | null;
  unlinkedOnly?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ReceiptService {
  private supabase = inject(SupabaseService);

  async uploadReceiptImage(
    householdId: string,
    file: File
  ): Promise<{ path: string; error: Error | null }> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const id = crypto.randomUUID();
    const path = `${householdId}/${id}.${ext}`;

    const { error } = await this.supabase.client.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) return { path: '', error: error as unknown as Error };
    return { path, error: null };
  }

  async createReceipt(input: CreateReceiptInput): Promise<{ data?: Receipt; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('receipts')
      .insert({
        household_id: input.household_id,
        storage_path: input.storage_path,
        merchant: input.merchant ?? null,
        raw_ocr_text: input.raw_ocr_text ?? null,
        raw_ocr_data: input.raw_ocr_data ?? null,
      })
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: data as Receipt, error: null };
  }

  async getReceipts(filter: GetReceiptsFilter): Promise<{ data: Receipt[]; error: Error | null }> {
    let query = this.supabase.client
      .from('receipts')
      .select('*')
      .eq('household_id', filter.householdId)
      .order('created_at', { ascending: false });

    if (filter.transactionId !== undefined) {
      if (filter.transactionId === null) query = query.is('transaction_id', null);
      else query = query.eq('transaction_id', filter.transactionId);
    }
    if (filter.unlinkedOnly) query = query.is('transaction_id', null);

    const { data, error } = await query;

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []) as Receipt[], error: null };
  }

  async linkReceiptToTransaction(
    receiptId: string,
    transactionId: string
  ): Promise<{ data?: Receipt; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('receipts')
      .update({ transaction_id: transactionId })
      .eq('id', receiptId)
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: data as Receipt, error: null };
  }

  getReceiptImageUrl(storagePath: string): { data: string; error: null } {
    const { data } = this.supabase.client.storage.from(BUCKET).getPublicUrl(storagePath);
    return { data: data.publicUrl, error: null };
  }

  async processOcr(storagePath: string): Promise<{ data?: OcrResult; error: Error | null }> {
    const url = `${environment.supabase.url}/functions/v1/ocr-receipt`;
    const { data: { session } } = await this.supabase.client.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ storage_path: storagePath }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: new Error(text || `OCR failed: ${res.status}`) };
    }

    const json = (await res.json()) as OcrResult;
    return { data: json, error: null };
  }
}

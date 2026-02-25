import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { PriceRecord } from '@core/models/inventory.model';

@Injectable({
  providedIn: 'root',
})
export class PriceHistoryService {
  private supabase = inject(SupabaseService);

  async getHistory(productId: string): Promise<{ data: PriceRecord[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error as unknown as Error };

    return {
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        product_id: row.product_id as string,
        price_clp: Number(row.price_clp ?? 0),
        purchase_date: row.purchase_date as string,
        store_name: (row.store_name as string) ?? null,
        store_location: (row.store_location as string) ?? null,
        receipt_id: (row.receipt_id as string) ?? null,
        units_in_pack: row.units_in_pack != null ? Number(row.units_in_pack) : null,
        created_at: row.created_at as string,
      })),
      error: null,
    };
  }

  async createRecord(input: {
    productId: string;
    priceClp: number;
    purchaseDate?: string | null;
    storeName?: string | null;
    storeLocation?: string | null;
    receiptId?: string | null;
    unitsInPack?: number | null;
  }): Promise<{ data?: PriceRecord; error: Error | null }> {
    const payload: Record<string, unknown> = {
      product_id: input.productId,
      price_clp: input.priceClp,
      purchase_date: input.purchaseDate ?? null,
      store_name: input.storeName ?? null,
      store_location: input.storeLocation ?? null,
      receipt_id: input.receiptId ?? null,
      units_in_pack: input.unitsInPack ?? null,
    };

    const { data, error } = await this.supabase.client
      .from('price_history')
      .insert(payload)
      .select('*')
      .single();

    if (error) return { error: error as unknown as Error };

    const row = data as Record<string, unknown>;
    const record: PriceRecord = {
      id: row['id'] as string,
      product_id: row['product_id'] as string,
      price_clp: Number(row['price_clp'] ?? 0),
      purchase_date: row['purchase_date'] as string,
      store_name: (row['store_name'] as string) ?? null,
      store_location: (row['store_location'] as string) ?? null,
      receipt_id: (row['receipt_id'] as string) ?? null,
      units_in_pack: row['units_in_pack'] != null ? Number(row['units_in_pack']) : null,
      created_at: row['created_at'] as string,
    };

    return { data: record, error: null };
  }
}


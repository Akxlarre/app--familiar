import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { InventoryLog } from '@core/models/inventory.model';

export interface CreateInventoryLogInput {
  productId: string;
  profileId: string;
  quantityBefore: number;
  quantityAfter: number;
  changeType: InventoryLog['change_type'];
  note?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryLogService {
  private supabase = inject(SupabaseService);

  async getLogsByProduct(productId: string): Promise<{ data: InventoryLog[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('inventory_logs')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error as unknown as Error };
    return {
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        product_id: row.product_id as string,
        profile_id: row.profile_id as string,
        quantity_before: Number(row.quantity_before ?? 0),
        quantity_after: Number(row.quantity_after ?? 0),
        change_type: row.change_type as InventoryLog['change_type'],
        note: (row.note as string) ?? null,
        created_at: row.created_at as string,
      })),
      error: null,
    };
  }

  async createLog(input: CreateInventoryLogInput): Promise<{ data?: InventoryLog; error: Error | null }> {
    const payload: Record<string, unknown> = {
      product_id: input.productId,
      profile_id: input.profileId,
      quantity_before: input.quantityBefore,
      quantity_after: input.quantityAfter,
      change_type: input.changeType,
      note: input.note ?? null,
    };

    const { data, error } = await this.supabase.client
      .from('inventory_logs')
      .insert(payload)
      .select('*')
      .single();

    if (error) return { error: error as unknown as Error };

    const row = data as Record<string, unknown>;
    const log: InventoryLog = {
      id: row['id'] as string,
      product_id: row['product_id'] as string,
      profile_id: row['profile_id'] as string,
      quantity_before: Number(row['quantity_before'] ?? 0),
      quantity_after: Number(row['quantity_after'] ?? 0),
      change_type: row['change_type'] as InventoryLog['change_type'],
      note: (row['note'] as string) ?? null,
      created_at: row['created_at'] as string,
    };

    return { data: log, error: null };
  }
}


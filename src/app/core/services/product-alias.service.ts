import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { ProductNameAlias } from '@core/models/inventory.model';

@Injectable({
  providedIn: 'root',
})
export class ProductAliasService {
  private supabase = inject(SupabaseService);

  async findAlias(
    householdId: string,
    alias: string,
  ): Promise<{ data: ProductNameAlias | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('product_name_aliases')
      .select('*')
      .eq('household_id', householdId)
      .ilike('alias', alias)
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    if (!data) return { data: null, error: null };

    const row = data as Record<string, unknown>;
    const mapped: ProductNameAlias = {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      alias: row['alias'] as string,
      product_id: row['product_id'] as string,
      created_at: row['created_at'] as string,
    };
    return { data: mapped, error: null };
  }

  async listAliasesForProduct(
    productId: string,
  ): Promise<{ data: ProductNameAlias[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('product_name_aliases')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error as unknown as Error };

    return {
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        household_id: row.household_id as string,
        alias: row.alias as string,
        product_id: row.product_id as string,
        created_at: row.created_at as string,
      })),
      error: null,
    };
  }

  async createAlias(
    householdId: string,
    productId: string,
    alias: string,
  ): Promise<{ data?: ProductNameAlias; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('product_name_aliases')
      .insert({
        household_id: householdId,
        product_id: productId,
        alias,
      })
      .select('*')
      .single();

    if (error) return { error: error as unknown as Error };

    const row = data as Record<string, unknown>;
    const mapped: ProductNameAlias = {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      alias: row['alias'] as string,
      product_id: row['product_id'] as string,
      created_at: row['created_at'] as string,
    };
    return { data: mapped, error: null };
  }
}


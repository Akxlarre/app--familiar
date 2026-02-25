import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { ProductCategory } from '@core/models/inventory.model';

@Injectable({
  providedIn: 'root',
})
export class ProductCategoryService {
  private supabase = inject(SupabaseService);

  async getCategories(): Promise<{ data: ProductCategory[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('product_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) return { data: [], error: error as unknown as Error };
    return {
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        sort_order: Number(row.sort_order ?? 0),
      })),
      error: null,
    };
  }
}


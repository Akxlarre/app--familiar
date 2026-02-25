import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Product, ProductLocation, StockStatus } from '@core/models/inventory.model';

export interface GetProductsFilter {
  householdId: string;
  categoryId?: string;
  location?: ProductLocation;
  search?: string;
  stockStatus?: StockStatus;
}

export interface CreateProductInput {
  householdId: string;
  categoryId: string;
  name: string;
  nameNormalized?: string | null;
  quantity: number;
  unit: string;
  defaultUnit?: string;
  stockMinimum?: number;
  location: ProductLocation;
  expiryDate?: string | null;
  barcode?: string | null;
}

export interface UpdateProductInput {
  categoryId?: string;
  name?: string;
  nameNormalized?: string | null;
  quantity?: number;
  unit?: string;
  defaultUnit?: string;
  stockMinimum?: number;
  location?: ProductLocation;
  expiryDate?: string | null;
  barcode?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private supabase = inject(SupabaseService);

  async getProducts(filter: GetProductsFilter): Promise<{ data: Product[]; error: Error | null }> {
    let query = this.supabase.client
      .from('products')
      .select(
        `
        id,
        household_id,
        category_id,
        name,
        name_normalized,
        quantity,
        unit,
        default_unit,
        stock_minimum,
        location,
        expiry_date,
        barcode,
        image_url,
        created_at,
        updated_at,
        product_categories (id, name, sort_order)
      `,
      )
      .eq('household_id', filter.householdId)
      .order('name', { ascending: true });

    if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
    if (filter.location) query = query.eq('location', filter.location);
    if (filter.search?.trim()) {
      const term = filter.search.trim();
      query = query.or(
        `name.ilike.%${term}%,name_normalized.ilike.%${term}%,barcode.ilike.%${term}%`,
      );
    }

    const { data, error } = await query;

    if (error) return { data: [], error: error as unknown as Error };

    const mapped = (data ?? []).map((row: Record<string, unknown>) => {
      const category = row['product_categories'] as Record<string, unknown> | null;
      const quantity = Number(row['quantity'] ?? 0);
      const min = Number(row['stock_minimum'] ?? 0);
      let stockStatus: StockStatus = 'ok';
      if (quantity <= 0) stockStatus = 'out';
      else if (quantity <= min) stockStatus = 'low';

      const product: Product = {
        id: row['id'] as string,
        household_id: row['household_id'] as string,
        category_id: row['category_id'] as string,
        name: row['name'] as string,
        name_normalized: (row['name_normalized'] as string) ?? null,
        quantity,
        unit: (row['unit'] as string) ?? 'unidad',
        default_unit: (row['default_unit'] as string) ?? (row['unit'] as string) ?? 'unidad',
        stock_minimum: min,
        location: (row['location'] as ProductLocation) ?? 'despensa',
        expiry_date: (row['expiry_date'] as string) ?? null,
        barcode: (row['barcode'] as string) ?? null,
        image_url: (row['image_url'] as string) ?? null,
        created_at: row['created_at'] as string,
        updated_at: row['updated_at'] as string,
        category_name: category ? (category['name'] as string) : undefined,
        stock_status: stockStatus,
      };
      return product;
    });

    let final = mapped;
    if (filter.stockStatus) {
      final = mapped.filter((p) => p.stock_status === filter.stockStatus);
    }

    return { data: final, error: null };
  }

  async getProduct(id: string): Promise<{ data: Product | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('products')
      .select(
        `
        id,
        household_id,
        category_id,
        name,
        name_normalized,
        quantity,
        unit,
        default_unit,
        stock_minimum,
        location,
        expiry_date,
        barcode,
        image_url,
        created_at,
        updated_at,
        product_categories (id, name, sort_order)
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    if (!data) return { data: null, error: null };

    const row = data as Record<string, unknown>;
    const quantity = Number(row['quantity'] ?? 0);
    const min = Number(row['stock_minimum'] ?? 0);
    let stockStatus: StockStatus = 'ok';
    if (quantity <= 0) stockStatus = 'out';
    else if (quantity <= min) stockStatus = 'low';

    const category = row['product_categories'] as Record<string, unknown> | null;

    const product: Product = {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      category_id: row['category_id'] as string,
      name: row['name'] as string,
      name_normalized: (row['name_normalized'] as string) ?? null,
      quantity,
      unit: (row['unit'] as string) ?? 'unidad',
      default_unit: (row['default_unit'] as string) ?? (row['unit'] as string) ?? 'unidad',
      stock_minimum: min,
      location: (row['location'] as ProductLocation) ?? 'despensa',
      expiry_date: (row['expiry_date'] as string) ?? null,
      barcode: (row['barcode'] as string) ?? null,
      image_url: (row['image_url'] as string) ?? null,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
      category_name: category ? (category['name'] as string) : undefined,
      stock_status: stockStatus,
    };

    return { data: product, error: null };
  }

  async createProduct(input: CreateProductInput): Promise<{ data?: Product; error: Error | null }> {
    const payload: Record<string, unknown> = {
      household_id: input.householdId,
      category_id: input.categoryId,
      name: input.name,
      name_normalized: input.nameNormalized ?? null,
      quantity: input.quantity,
      unit: input.unit,
      default_unit: input.defaultUnit ?? input.unit,
      stock_minimum: input.stockMinimum ?? 0,
      location: input.location,
      expiry_date: input.expiryDate ?? null,
      barcode: input.barcode ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.client
      .from('products')
      .insert(payload)
      .select(
        `
        id,
        household_id,
        category_id,
        name,
        name_normalized,
        quantity,
        unit,
        default_unit,
        stock_minimum,
        location,
        expiry_date,
        barcode,
        image_url,
        created_at,
        updated_at,
        product_categories (id, name, sort_order)
      `,
      )
      .single();

    if (error) return { error: error as unknown as Error };

    const mapped = await this.getProduct((data as Record<string, unknown>)['id'] as string);
    if (mapped.error) return { error: mapped.error };
    return { data: mapped.data ?? undefined, error: null };
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<{ data?: Product; error: Error | null }> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.categoryId !== undefined) payload['category_id'] = input.categoryId;
    if (input.name !== undefined) payload['name'] = input.name;
    if (input.nameNormalized !== undefined) payload['name_normalized'] = input.nameNormalized;
    if (input.quantity !== undefined) payload['quantity'] = input.quantity;
    if (input.unit !== undefined) payload['unit'] = input.unit;
    if (input.defaultUnit !== undefined) payload['default_unit'] = input.defaultUnit;
    if (input.stockMinimum !== undefined) payload['stock_minimum'] = input.stockMinimum;
    if (input.location !== undefined) payload['location'] = input.location;
    if (input.expiryDate !== undefined) payload['expiry_date'] = input.expiryDate;
    if (input.barcode !== undefined) payload['barcode'] = input.barcode;

    const { error } = await this.supabase.client.from('products').update(payload).eq('id', id);
    if (error) return { error: error as unknown as Error };

    const { data, error: fetchError } = await this.getProduct(id);
    if (fetchError) return { error: fetchError };
    return { data: data ?? undefined, error: null };
  }

  async deleteProduct(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('products').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }
}


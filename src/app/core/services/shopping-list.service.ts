import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type {
  ShoppingList,
  ShoppingListItem,
  ShoppingListItemSource,
  ShoppingListStatus,
} from '../models/inventory.model';

export interface CreateShoppingListInput {
  householdId: string;
  name?: string;
  createdBy?: string | null;
}

export interface AddShoppingListItemInput {
  listId: string;
  productId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  addedBy?: string | null;
  source?: ShoppingListItemSource;
}

@Injectable({
  providedIn: 'root',
})
export class ShoppingListService {
  private supabase = inject(SupabaseService);

  async getActiveList(householdId: string): Promise<{ data: ShoppingList | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    if (!data) return { data: null, error: null };
    return { data: this.mapList(data), error: null };
  }

  async createList(input: CreateShoppingListInput): Promise<{ data?: ShoppingList; error: Error | null }> {
    const payload: Record<string, unknown> = {
      household_id: input.householdId,
      name: input.name ?? 'Lista de compras',
      created_by: input.createdBy ?? null,
    };

    const { data, error } = await this.supabase.client
      .from('shopping_lists')
      .insert(payload)
      .select('*')
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapList(data), error: null };
  }

  async ensureActiveList(
    householdId: string,
    createdBy?: string | null,
  ): Promise<{ data?: ShoppingList; error: Error | null }> {
    const existing = await this.getActiveList(householdId);
    if (existing.error) return { error: existing.error };
    if (existing.data) return { data: existing.data, error: null };
    return this.createList({ householdId, createdBy });
  }

  async getItems(listId: string): Promise<{ data: ShoppingListItem[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('is_checked', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((row) => this.mapItem(row)), error: null };
  }

  async addItem(input: AddShoppingListItemInput): Promise<{ data?: ShoppingListItem; error: Error | null }> {
    const payload: Record<string, unknown> = {
      list_id: input.listId,
      product_id: input.productId ?? null,
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      added_by: input.addedBy ?? null,
      source: input.source ?? 'manual',
    };

    const { data, error } = await this.supabase.client
      .from('shopping_list_items')
      .insert(payload)
      .select('*')
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapItem(data), error: null };
  }

  async updateItem(
    id: string,
    input: Partial<Pick<ShoppingListItem, 'name' | 'quantity' | 'unit' | 'is_checked' | 'price_at_purchase'>>,
  ): Promise<{ data?: ShoppingListItem; error: Error | null }> {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload['name'] = input.name;
    if (input.quantity !== undefined) payload['quantity'] = input.quantity;
    if (input.unit !== undefined) payload['unit'] = input.unit;
    if (input.is_checked !== undefined) payload['is_checked'] = input.is_checked;
    if (input.price_at_purchase !== undefined) payload['price_at_purchase'] = input.price_at_purchase;

    const { data, error } = await this.supabase.client
      .from('shopping_list_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapItem(data), error: null };
  }

  async deleteItem(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('shopping_list_items')
      .delete()
      .eq('id', id);

    return { error: error as unknown as Error };
  }

  async toggleItemChecked(
    id: string,
    isChecked: boolean,
    profileId: string | null,
  ): Promise<{ data?: ShoppingListItem; error: Error | null }> {
    const payload: Record<string, unknown> = {
      is_checked: isChecked,
      checked_by: isChecked ? profileId : null,
      checked_at: isChecked ? new Date().toISOString() : null,
    };

    const { data, error } = await this.supabase.client
      .from('shopping_list_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapItem(data), error: null };
  }

  async closeList(id: string, status: Exclude<ShoppingListStatus, 'active'> = 'closed'): Promise<{
    data?: ShoppingList;
    error: Error | null;
  }> {
    const payload: Record<string, unknown> = {
      status,
      closed_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.client
      .from('shopping_lists')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapList(data), error: null };
  }

  private mapList(row: Record<string, unknown>): ShoppingList {
    return {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      name: row['name'] as string,
      status: row['status'] as ShoppingListStatus,
      closed_at: (row['closed_at'] as string) ?? null,
      created_by: (row['created_by'] as string) ?? null,
      created_at: row['created_at'] as string,
    };
  }

  private mapItem(row: Record<string, unknown>): ShoppingListItem {
    return {
      id: row['id'] as string,
      list_id: row['list_id'] as string,
      product_id: (row['product_id'] as string) ?? null,
      name: row['name'] as string,
      quantity: Number(row['quantity'] ?? 0),
      unit: (row['unit'] as string) ?? 'unidad',
      is_checked: (row['is_checked'] as boolean) ?? false,
      checked_by: (row['checked_by'] as string) ?? null,
      checked_at: (row['checked_at'] as string) ?? null,
      price_at_purchase: row['price_at_purchase'] != null ? Number(row['price_at_purchase']) : null,
      added_by: (row['added_by'] as string) ?? null,
      source: (row['source'] as ShoppingListItemSource) ?? 'manual',
      sort_order: Number(row['sort_order'] ?? 0),
      created_at: row['created_at'] as string,
    };
  }
}


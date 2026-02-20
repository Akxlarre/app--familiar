import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Category } from '@core/models/finance.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private supabase = inject(SupabaseService);

  /**
   * Categories available for a household: global (household_id NULL) + household-specific.
   * Returns flat list ordered by sort_order; build tree in UI if needed.
   */
  async getCategories(householdId: string | null, type?: 'expense' | 'income' | 'both'): Promise<{ data: Category[]; error: Error | null }> {
    const orFilter = householdId
      ? `or(household_id.is.null,household_id.eq.${householdId})`
      : 'household_id.is.null';

    let query = this.supabase.client
      .from('categories')
      .select('*')
      .or(orFilter)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (type) query = query.or(`type.eq.${type},type.eq.both`);
    const { data, error } = await query;

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map(row => this.mapRow(row)), error: null };
  }

  /**
   * Categories as tree (roots with children).
   */
  async getCategoriesTree(householdId: string | null, type?: 'expense' | 'income' | 'both'): Promise<{ data: Category[]; error: Error | null }> {
    const { data: flat, error } = await this.getCategories(householdId, type);
    if (error) return { data: [], error };

    const byId = new Map<string, Category>();
    const roots: Category[] = [];
    for (const c of flat) {
      byId.set(c.id, { ...c, children: [] });
    }
    for (const c of flat) {
      const node = byId.get(c.id)!;
      if (!c.parent_id) {
        roots.push(node);
      } else {
        const parent = byId.get(c.parent_id);
        if (parent) {
          parent.children = parent.children ?? [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }
    return { data: roots, error: null };
  }

  async getCategory(id: string): Promise<{ data: Category | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async createCategory(input: {
    householdId: string;
    parentId?: string | null;
    name: string;
    icon?: string | null;
    color?: string | null;
    type: Category['type'];
    sortOrder?: number;
  }): Promise<{ data?: Category; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('categories')
      .insert({
        household_id: input.householdId,
        parent_id: input.parentId ?? null,
        name: input.name,
        icon: input.icon ?? null,
        color: input.color ?? null,
        type: input.type,
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateCategory(id: string, input: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'type' | 'sort_order'>>): Promise<{ data?: Category; error: Error | null }> {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload['name'] = input.name;
    if (input.icon !== undefined) payload['icon'] = input.icon;
    if (input.color !== undefined) payload['color'] = input.color;
    if (input.type !== undefined) payload['type'] = input.type;
    if (input.sort_order !== undefined) payload['sort_order'] = input.sort_order;
    if (Object.keys(payload).length === 0) {
      const res = await this.getCategory(id);
      return { data: res.data ?? undefined, error: res.error };
    }

    const { data, error } = await this.supabase.client
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async deleteCategory(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('categories').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): Category {
    return {
      id: row['id'] as string,
      household_id: (row['household_id'] as string) ?? null,
      parent_id: (row['parent_id'] as string) ?? null,
      name: row['name'] as string,
      icon: (row['icon'] as string) ?? null,
      color: (row['color'] as string) ?? null,
      type: row['type'] as Category['type'],
      is_system: (row['is_system'] as boolean) ?? false,
      sort_order: Number(row['sort_order'] ?? 0),
      created_at: row['created_at'] as string,
    };
  }
}

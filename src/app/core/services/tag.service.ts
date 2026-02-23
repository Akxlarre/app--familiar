import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Tag } from '@core/models/finance.model';

@Injectable({
  providedIn: 'root',
})
export class TagService {
  private supabase = inject(SupabaseService);

  async getTags(householdId: string): Promise<{ data: Tag[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('tags')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async createTag(householdId: string, name: string, color?: string | null): Promise<{ data?: Tag; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('tags')
      .insert({
        household_id: householdId,
        name: name.trim(),
        color: color ?? null,
      })
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async getTagsForTransaction(transactionId: string): Promise<{ data: Tag[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('transaction_tags')
      .select('tags (*)')
      .eq('transaction_id', transactionId);

    if (error) return { data: [], error: error as unknown as Error };
    const rows = (data ?? []) as Record<string, unknown>[];
    const tags = rows
      .map((r) => r['tags'])
      .filter((t): t is Record<string, unknown> => t != null && typeof t === 'object' && !Array.isArray(t))
      .map((t) => this.mapRow(t));
    return { data: tags, error: null };
  }

  async setTransactionTags(transactionId: string, tagIds: string[]): Promise<{ error: Error | null }> {
    const { error: delError } = await this.supabase.client
      .from('transaction_tags')
      .delete()
      .eq('transaction_id', transactionId);

    if (delError) return { error: delError as unknown as Error };
    if (tagIds.length === 0) return { error: null };

    const rows = tagIds.map((tag_id) => ({ transaction_id: transactionId, tag_id }));
    const { error: insError } = await this.supabase.client.from('transaction_tags').insert(rows);

    return { error: insError ? (insError as unknown as Error) : null };
  }

  async deleteTag(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('tags').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): Tag {
    return {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      name: row['name'] as string,
      color: (row['color'] as string) ?? null,
      sort_order: Number(row['sort_order'] ?? 0),
      created_at: row['created_at'] as string,
    };
  }
}

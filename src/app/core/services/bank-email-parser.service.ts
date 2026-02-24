import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { BankEmailParser, BankEmailType } from '@core/models/finance.model';

export interface CreateBankEmailParserInput {
  householdId: string;
  bankName: string;
  senderPattern: string;
  subjectPattern?: string | null;
  bodyRules: Record<string, string>;
  emailType: BankEmailType;
  sortOrder?: number;
  defaultAccountId?: string | null;
}

export interface UpdateBankEmailParserInput {
  bank_name?: string;
  sender_pattern?: string;
  subject_pattern?: string | null;
  body_rules?: Record<string, string>;
  email_type?: BankEmailType;
  is_active?: boolean;
  sort_order?: number;
  default_account_id?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class BankEmailParserService {
  private supabase = inject(SupabaseService);

  async getParsers(householdId: string): Promise<{ data: BankEmailParser[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('bank_email_parsers')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order', { ascending: true })
      .order('bank_name', { ascending: true });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((row) => this.mapRow(row)), error: null };
  }

  async getParser(id: string): Promise<{ data: BankEmailParser | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('bank_email_parsers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async createParser(input: CreateBankEmailParserInput): Promise<{ data?: BankEmailParser; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('bank_email_parsers')
      .insert({
        household_id: input.householdId,
        bank_name: input.bankName,
        sender_pattern: input.senderPattern,
        subject_pattern: input.subjectPattern ?? null,
        body_rules: input.bodyRules ?? {},
        email_type: input.emailType,
        sort_order: input.sortOrder ?? 0,
        default_account_id: input.defaultAccountId ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateParser(id: string, input: UpdateBankEmailParserInput): Promise<{ data?: BankEmailParser; error: Error | null }> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.bank_name !== undefined) payload['bank_name'] = input.bank_name;
    if (input.sender_pattern !== undefined) payload['sender_pattern'] = input.sender_pattern;
    if (input.subject_pattern !== undefined) payload['subject_pattern'] = input.subject_pattern;
    if (input.body_rules !== undefined) payload['body_rules'] = input.body_rules;
    if (input.email_type !== undefined) payload['email_type'] = input.email_type;
    if (input.is_active !== undefined) payload['is_active'] = input.is_active;
    if (input.sort_order !== undefined) payload['sort_order'] = input.sort_order;
    if (input.default_account_id !== undefined) payload['default_account_id'] = input.default_account_id;

    const { data, error } = await this.supabase.client
      .from('bank_email_parsers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async deleteParser(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('bank_email_parsers').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): BankEmailParser {
    return {
      id: row['id'] as string,
      household_id: row['household_id'] as string,
      bank_name: row['bank_name'] as string,
      sender_pattern: row['sender_pattern'] as string,
      subject_pattern: (row['subject_pattern'] as string) ?? null,
      body_rules: (row['body_rules'] as Record<string, string>) ?? {},
      email_type: row['email_type'] as BankEmailType,
      is_active: (row['is_active'] as boolean) ?? true,
      sort_order: Number(row['sort_order'] ?? 0),
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
      default_account_id: (row['default_account_id'] as string) ?? null,
    };
  }
}

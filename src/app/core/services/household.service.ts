import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateInviteCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < CODE_LENGTH; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

export interface CreateHouseholdResult {
  householdId: string;
  inviteCode: string;
}

export interface HouseholdInfo {
  id: string;
  name: string;
  inviteCode: string;
}

export interface HouseholdMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class HouseholdService {
  private supabase = inject(SupabaseService);

  /**
   * Crea un hogar y asigna al usuario actual como admin.
   * Usa RPC (función create_household) para evitar problemas con RLS en INSERT.
   */
  async createHousehold(name: string): Promise<{ data?: CreateHouseholdResult; error: Error | null }> {
    const { data: { user } } = await this.supabase.getUser();
    if (!user) return { error: new Error('No hay sesión') };

    let inviteCode = generateInviteCode();
    const { data: result, error } = await this.supabase.client.rpc('create_household', {
      p_name: name,
      p_invite_code: inviteCode,
    });

    if (error) {
      if (error.code === '23505') {
        inviteCode = generateInviteCode();
        const retry = await this.supabase.client.rpc('create_household', {
          p_name: name,
          p_invite_code: inviteCode,
        });
        if (retry.error) return { data: undefined, error: retry.error as unknown as Error };
        const r = retry.data as { household_id: string; invite_code: string };
        return { data: { householdId: r.household_id, inviteCode: r.invite_code }, error: null };
      }
      return { data: undefined, error: error as unknown as Error };
    }

    const r = result as { household_id: string; invite_code: string };
    return { data: { householdId: r.household_id, inviteCode: r.invite_code }, error: null };
  }

  /**
   * Obtiene los datos del hogar (nombre, código de invitación).
   */
  async getHousehold(householdId: string): Promise<{ data?: HouseholdInfo; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('households')
      .select('id, name, invite_code')
      .eq('id', householdId)
      .maybeSingle();

    if (error) return { error: error as unknown as Error };
    if (!data) return { error: new Error('Hogar no encontrado') };

    const h = data as { id: string; name: string; invite_code: string | null };
    return {
      data: { id: h.id, name: h.name, inviteCode: h.invite_code ?? '' },
      error: null,
    };
  }

  /**
   * Obtiene los miembros del hogar (perfiles con id, display_name, avatar_url).
   */
  async getHouseholdMembers(householdId: string): Promise<{
    data: HouseholdMember[];
    error: Error | null;
  }> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('household_id', householdId)
      .order('display_name', { ascending: true, nullsFirst: false });

    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []) as HouseholdMember[], error: null };
  }

  /**
   * Une al usuario actual a un hogar usando el código de invitación.
   */
  async joinWithCode(code: string): Promise<{ error: Error | null }> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { error: new Error('El código es requerido') };

    const { data: household, error: fetchError } = await this.supabase.client
      .from('households')
      .select('id')
      .eq('invite_code', normalized)
      .maybeSingle();

    if (fetchError) return { error: fetchError as unknown as Error };
    if (!household) return { error: new Error('Código no válido') };

    const updateError = await this.updateProfileHousehold((household as { id: string }).id, 'member');
    return { error: updateError };
  }

  private async updateProfileHousehold(householdId: string, role: 'admin' | 'member'): Promise<Error | null> {
    const { data: { user } } = await this.supabase.getUser();
    if (!user) return new Error('No hay sesión');

    const { error } = await this.supabase.client
      .from('profiles')
      .update({ household_id: householdId, role, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    return error ? (error as unknown as Error) : null;
  }
}

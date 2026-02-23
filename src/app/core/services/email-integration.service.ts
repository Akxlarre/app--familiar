import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../../environments/environment';

export interface EmailIntegration {
  id: string;
  profile_id: string;
  household_id: string;
  provider: string;
  is_active: boolean;
  inbox_email: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailIntegrationService {
  private supabase = inject(SupabaseService);

  /** Obtiene la integración Gmail del perfil actual (si existe). */
  async getGmailIntegration(profileId: string): Promise<{ data: EmailIntegration | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('email_integrations')
      .select('id, profile_id, household_id, provider, is_active, inbox_email, last_sync_at, last_error, created_at, updated_at')
      .eq('profile_id', profileId)
      .eq('provider', 'gmail')
      .maybeSingle();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  /** Redirige a Google OAuth. Requiere googleClientId en environment. */
  connectGmail(): void {
    const clientId = (environment as { googleClientId?: string }).googleClientId;
    if (!clientId) {
      console.warn('googleClientId no configurado en environment');
      return;
    }
    const redirectUri = `${window.location.origin}/app/configuracion/email`;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    window.location.href = url;
  }

  /** Intercambia el código OAuth por tokens y los guarda. Llamar tras el redirect de Google. */
  async completeGmailConnect(code: string): Promise<{ error: Error | null }> {
    const redirectUri = `${window.location.origin}/app/configuracion/email`;
    const { data: { session } } = await this.supabase.client.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { error: new Error('Sesión no válida. Inicia sesión de nuevo.') };
    }

    const url = `${environment.supabase.url}/functions/v1/gmail-oauth`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      return { error: new Error(json.error ?? `Error ${res.status}`) };
    }
    return { error: null };
  }

  /** Reprocesa logs pendientes: intenta crear transacciones con la configuración actual de cuentas. */
  async reprocessPendingLogs(): Promise<{
    data?: { ok: boolean; processed: number; stillPending: number; message?: string };
    error: Error | null;
  }> {
    const { data: { session } } = await this.supabase.client.auth.getSession();
    if (!session) {
      return { error: new Error('Sesión no válida. Inicia sesión de nuevo.') };
    }

    const { data, error } = await this.supabase.client.functions.invoke('reprocess-pending-logs', {
      method: 'POST',
      body: {},
    });

    if (error) {
      return { error };
    }

    const json = (data ?? {}) as {
      ok?: boolean;
      processed?: number;
      stillPending?: number;
      message?: string;
      error?: string;
    };

    if (json.error) {
      return { error: new Error(json.error) };
    }

    return {
      data: {
        ok: json.ok ?? true,
        processed: json.processed ?? 0,
        stillPending: json.stillPending ?? 0,
        message: json.message,
      },
      error: null,
    };
  }

  /** Invoca process-bank-emails para procesar correos y crear transacciones automáticamente. */
  async processBankEmails(): Promise<{ data?: { ok: boolean; processed: number }; error: Error | null }> {
    const { data: { session } } = await this.supabase.client.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { error: new Error('Sesión no válida. Inicia sesión de nuevo.') };
    }

    const url = `${environment.supabase.url}/functions/v1/process-bank-emails`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const json = (await res.json()) as { ok?: boolean; processed?: number; error?: string };
    if (!res.ok) {
      return { error: new Error(json.error ?? `Error ${res.status}`) };
    }
    return { data: { ok: json.ok ?? true, processed: json.processed ?? 0 }, error: null };
  }

  /** Desconecta Gmail (elimina la integración). */
  async disconnectGmail(profileId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('email_integrations')
      .delete()
      .eq('profile_id', profileId)
      .eq('provider', 'gmail');

    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): EmailIntegration {
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      household_id: row['household_id'] as string,
      provider: row['provider'] as string,
      is_active: (row['is_active'] as boolean) ?? true,
      inbox_email: (row['inbox_email'] as string) ?? null,
      last_sync_at: (row['last_sync_at'] as string) ?? null,
      last_error: (row['last_error'] as string) ?? null,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
    };
  }
}

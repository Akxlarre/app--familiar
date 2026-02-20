import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from '@core/models/user.model';
import { getInitialsFromDisplayName } from '@core/models/user.model';
import { SupabaseService } from './supabase.service';

/**
 * AuthService - Gestión de autenticación con Supabase.
 * Mantiene currentUser desde auth.users + profiles, login, logout y escucha cambios de sesión.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  private _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /** Mantener por compatibilidad con SchoolSelector (oculto en FamilyApp). */
  readonly canSwitchSchool = computed(() => false);

  /** Resuelve cuando la comprobación inicial de sesión ha terminado (para guards). */
  readonly whenReady: Promise<void>;

  constructor() {
    let resolveReady!: () => void;
    this.whenReady = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    this.supabase.client.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        this.loadUserFromSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        this._currentUser.set(null);
      }
    });

    this.supabase.getUser().then(({ data: { user } }) => {
      if (user) this.loadUserFromSession(user);
    }).finally(() => resolveReady());
  }

  private async loadUserFromSession(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<void> {
    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('display_name, avatar_url, role, household_id')
      .eq('id', authUser.id)
      .maybeSingle();

    const name =
      (profile?.display_name as string) ??
      (authUser.user_metadata?.['display_name'] as string) ??
      (authUser.email ? authUser.email.split('@')[0] : 'Usuario');

    const user: User = {
      id: authUser.id,
      name,
      email: authUser.email ?? '',
      role: profile?.role === 'admin' ? 'admin' : 'member',
      initials: getInitialsFromDisplayName(name),
      avatarUrl: profile?.avatar_url ?? undefined,
      householdId: profile?.household_id ?? undefined,
    };
    this._currentUser.set(user);
  }

  async login(email: string, password: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.signIn(email, password);
    return { error: error ?? null };
  }

  logout(): void {
    this.supabase.signOut();
    this._currentUser.set(null);
    this.router.navigate(['/']);
  }

  setUser(user: User | null): void {
    this._currentUser.set(user);
  }

  /** Vuelve a cargar el perfil desde Supabase (útil tras crear/unirse a un hogar). */
  async refreshProfile(): Promise<void> {
    const { data: { user } } = await this.supabase.getUser();
    if (user) await this.loadUserFromSession(user);
  }
}

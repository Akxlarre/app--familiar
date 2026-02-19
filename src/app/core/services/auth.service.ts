import { Injectable, signal, computed } from '@angular/core';
import type { User } from '@core/models/user.model';

/**
 * AuthService - Gestión de autenticación
 *
 * Stub para implementación futura con Supabase/backend.
 * Actualmente provee datos de usuario mock para desarrollo.
 *
 * TODO: Integrar con Supabase Auth cuando esté disponible
 * - login(email, password)
 * - logout() -> limpiar sesión, redirigir
 * - currentUser desde sesión real
 * - isAuthenticated
 * - permissions desde backend (canSwitchSchool por secretaria)
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _currentUser = signal<User | null>({
    id: '1',
    name: 'Jorge Administrador',
    email: 'jorge@autoescuela.cl',
    role: 'Administrador',
    initials: 'JA',
    permissions: { canSwitchSchool: true },
  });

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /**
   * Indica si el usuario puede cambiar de escuela.
   * Administrador: siempre. Secretaria: solo si permissions.canSwitchSchool.
   */
  readonly canSwitchSchool = computed(() => {
    const user = this._currentUser();
    if (!user) return false;
    if (user.role === 'Administrador') return true;
    return user.permissions?.canSwitchSchool === true;
  });

  /**
   * Cerrar sesión - stub para implementación futura
   * TODO: Llamar a Supabase auth.signOut(), limpiar tokens, redirigir a /login
   */
  logout(): void {
    this._currentUser.set(null);
    // TODO: router.navigate(['/login']);
    // TODO: supabase.auth.signOut();
  }

  /**
   * Establecer usuario (para cuando se implemente login real)
   */
  setUser(user: User | null): void {
    this._currentUser.set(user);
  }
}

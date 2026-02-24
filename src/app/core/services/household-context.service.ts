import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { HouseholdService, type HouseholdInfo } from './household.service';

/**
 * Contexto del hogar actual: datos cacheados y zona horaria.
 * Se carga automáticamente cuando el usuario tiene un hogar asignado.
 * Usar timezone() para formatear fechas en la zona del hogar.
 */
@Injectable({
  providedIn: 'root',
})
export class HouseholdContextService {
  private auth = inject(AuthService);
  private householdService = inject(HouseholdService);

  private _household = signal<HouseholdInfo | null>(null);

  readonly household = this._household.asReadonly();
  readonly timezone = computed(() => this._household()?.timezone ?? 'America/Santiago');

  /**
   * Carga el hogar actual si el usuario tiene householdId.
   * Llamar tras login o cuando se necesite refrescar (ej. tras cambiar timezone en Mi hogar).
   */
  async load(): Promise<void> {
    const hhId = this.auth.currentUser()?.householdId;
    if (!hhId) {
      this._household.set(null);
      return;
    }
    const { data } = await this.householdService.getHousehold(hhId);
    this._household.set(data ?? null);
  }

  /** Actualiza el hogar en caché (útil tras editar en Mi hogar). */
  setHousehold(info: HouseholdInfo | null): void {
    this._household.set(info);
  }
}

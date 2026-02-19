import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { School } from '@core/models/school.model';
import { ThemeService } from '@core/services/theme.service';

/**
 * SchoolService - Gestión de la escuela activa
 *
 * La escuela activa determina el tema visual (rojo/azul).
 * Orquesta ThemeService al cambiar de escuela.
 *
 * TODO: Cargar escuelas desde backend/Supabase
 */
@Injectable({
  providedIn: 'root',
})
export class SchoolService {
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(ThemeService);

  private readonly STORAGE_KEY = 'app-current-school';

  /** Escuelas disponibles — mock para desarrollo */
  private readonly SCHOOLS: School[] = [
    { id: 'a', name: 'Autoescuela Chillán', theme: 'red' },
    { id: 'b', name: 'Autoescuela Concepción', theme: 'blue' },
  ];

  private _currentSchool = signal<School | null>(null);

  readonly currentSchool = this._currentSchool.asReadonly();
  readonly availableSchools = computed(() => this.SCHOOLS);

  constructor() {
    this.initializeSchool();
  }

  private initializeSchool(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const savedId = localStorage.getItem(this.STORAGE_KEY);
    const school = this.SCHOOLS.find((s) => s.id === savedId) ?? this.SCHOOLS[0];

    this._currentSchool.set(school);
    this.themeService.setTheme(school.theme, false);
  }

  /**
   * Cambiar escuela activa — actualiza tema automáticamente
   */
  setCurrentSchool(school: School): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this._currentSchool()?.id === school.id) {
      return;
    }

    this._currentSchool.set(school);
    this.themeService.setTheme(school.theme);
    localStorage.setItem(this.STORAGE_KEY, school.id);
  }

  /**
   * Obtener escuela por ID
   */
  getSchoolById(id: string): School | undefined {
    return this.SCHOOLS.find((s) => s.id === id);
  }
}

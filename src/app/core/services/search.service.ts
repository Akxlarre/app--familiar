import { Injectable, signal, computed } from '@angular/core';
import type { SearchResult } from '@core/models/search-result.model';

/**
 * Servicio de búsqueda global.
 * Por ahora usa datos mock; cuando exista API, reemplazar por llamada HTTP.
 */
@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private _results = signal<SearchResult[]>([]);
  private _loading = signal(false);
  private _query = signal('');

  readonly results = this._results.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly query = this._query.asReadonly();
  readonly hasResults = computed(() => this._results().length > 0);

  /**
   * Busca alumnos, clases, pagos y certificados.
   * TODO: Integrar con API real cuando esté disponible.
   */
  search(query: string): void {
    const q = query.trim().toLowerCase();
    this._query.set(query);
    this._loading.set(true);

    if (q.length === 0) {
      this._results.set([]);
      this._loading.set(false);
      return;
    }

    // Simular latencia de red
    setTimeout(() => {
      const mock = this.getMockResults(q);
      this._results.set(mock);
      this._loading.set(false);
    }, 200);
  }

  clear(): void {
    this._query.set('');
    this._results.set([]);
  }

  private getMockResults(query: string): SearchResult[] {
    const all: SearchResult[] = [
      { id: 'dash', type: 'student', title: 'Dashboard', subtitle: 'Inicio', routerLink: '/app/dashboard' },
      { id: 'p1', type: 'student', title: 'Página 1', subtitle: 'Inicio', routerLink: '/app/pagina-1' },
      { id: 'p2', type: 'class', title: 'Página 2', subtitle: 'Operación', routerLink: '/app/pagina-2' },
      { id: 'p3', type: 'class', title: 'Página 3', subtitle: 'Operación', routerLink: '/app/pagina-3' },
      { id: 'p4', type: 'student', title: 'Página 4', subtitle: 'Alumnos', routerLink: '/app/pagina-4' },
      { id: 'p5', type: 'student', title: 'Página 5', subtitle: 'Alumnos', routerLink: '/app/pagina-5' },
      { id: 'p6', type: 'certificate', title: 'Página 6', subtitle: 'Administración', routerLink: '/app/pagina-6' },
      { id: 'p7', type: 'certificate', title: 'Página 7', subtitle: 'Administración', routerLink: '/app/pagina-7' },
    ];

    return all.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        (r.subtitle?.toLowerCase().includes(query) ?? false)
    );
  }
}

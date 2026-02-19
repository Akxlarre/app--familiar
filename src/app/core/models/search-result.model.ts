export type SearchResultType = 'student' | 'class' | 'payment' | 'certificate';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  /** Ruta para navegar al hacer clic o Enter */
  routerLink?: string;
  /** Datos adicionales para acciones */
  metadata?: Record<string, unknown>;
}

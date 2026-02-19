import type { Theme } from '@core/services/theme.service';

/**
 * School - Representa una autoescuela del sistema
 *
 * Cada escuela tiene un tema visual asociado (rojo/azul).
 * TODO: Extender cuando exista backend (slug, logo, etc.)
 */
export interface School {
  id: string;
  name: string;
  theme: Theme;
}

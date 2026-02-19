/**
 * Datos para una categoría en el breakdown.
 *
 * @example
 * ```ts
 * { id: '1', label: 'Clase B', value: 5040000, count: 18 }
 * ```
 */
export interface CategoryBreakdownItem {
  id: string;
  label: string;
  value: number;
  /** Cantidad de operaciones/registros. Ej: 18 para "18 operaciones" */
  count?: number;
  /** Porcentaje (0-100). Si no se pasa, se calcula respecto al total */
  percentage?: number;
}

/** Variante de color para barras y montos */
export type CategoryBreakdownVariant = 'success' | 'expense' | 'primary' | 'neutral';

/** Tamaños soportados en bento-grid */
export type CategoryBreakdownSize =
  | '1x1'
  | '1x2'
  | '2x1'
  | '3x1'
  | '4x1'
  | '2x2'
  | '3x2'
  | 'hero';

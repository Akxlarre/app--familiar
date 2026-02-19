/**
 * Configuración de columna para DataTableCard.
 * Genérica para cualquier entidad.
 */
export interface DataTableColumnConfig<T = unknown> {
  /** Propiedad del objeto (soporta path: 'nested.prop') */
  field: string;
  /** Encabezado de la columna */
  header: string;
  /** Si la columna es ordenable */
  sortable?: boolean;
  /** Clases CSS estáticas para la celda (ej: 'text-muted rut-cell', 'font-semibold text-primary') */
  cellClass?: string;
  /**
   * Tipo de celda:
   * - 'text': valor plano
   * - 'badge': chip con clases dinámicas (estados)
   * - 'badge-icon': chip con icono + texto (ej: método de pago)
   * - 'chip': chip con colores por concepto (Clase B, Profesional, etc.)
   * - 'progress': porcentaje + barra de progreso
   * - 'currency': moneda formateada (ej: $1.230.000)
   */
  cellType?: 'text' | 'badge' | 'badge-icon' | 'chip' | 'progress' | 'currency';
  /** Para cellType='badge' | 'chip': función que retorna clases CSS según el valor */
  badgeClassFn?: (value: unknown) => string;
  /** Para cellType='badge-icon': función que retorna clase PrimeIcons (ej: 'pi pi-wallet') */
  badgeIconFn?: (value: unknown) => string;
  /** Para cellType='currency': prefijo opcional ('+' | '-' | '') */
  currencyPrefix?: '+' | '-' | '';
  /** Para cellType='currency': formateador personalizado. Por defecto CLP. */
  currencyFormat?: (value: number) => string;
}

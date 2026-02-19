import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { FeatureCardComponent } from '@shared/components/feature-card/feature-card.component';
import type { DataTableColumnConfig } from './data-table-column.config';

/** Formatea número como CLP (ej: $1.200.000) */
function formatClp(value: number): string {
  return (
    '$' +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  );
}

export interface DataTableEmptyConfig {
  icon?: string;
  message: string;
  subtitle?: string;
  actionLabel?: string;
}

@Component({
  selector: 'app-data-table-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule, ButtonModule, FeatureCardComponent],
  templateUrl: './data-table-card.component.html',
  styleUrl: './data-table-card.component.scss',
  host: {
    '[class]': 'hostClasses()',
  },
})
export class DataTableCardComponent<T extends object = object> {
  /** Título del card */
  title = input.required<string>();
  /** Datos a mostrar */
  data = input.required<T[]>();
  /** Configuración de columnas */
  columns = input.required<DataTableColumnConfig<T>[]>();
  /** Clave única por fila (requerido si selection=true) */
  dataKey = input<string>('id');
  /** Paginación */
  paginator = input(false);
  /** Filas por página */
  rows = input(10);
  /** Opciones del dropdown de filas por página */
  rowsPerPageOptions = input<number[]>([5, 10, 25, 50]);
  /** Ordenación por columnas */
  sortable = input(false);
  /** Filas alternadas */
  striped = input(false);
  /** Líneas de cuadrícula */
  gridlines = input(false);
  /** Selección múltiple */
  selection = input(false);
  /** Tamaño del card */
  size = input<'2x2' | '3x2' | 'hero'>('3x2');
  /** Borde accent (recomendado con selection) */
  accent = input(false);
  /** Dentro de bento-grid para animaciones */
  inGrid = input(false);
  /** Config del estado vacío */
  emptyConfig = input<DataTableEmptyConfig | null>(null);
  /** Etiqueta para "seleccionado(s)" en action bar */
  selectionLabel = input('seleccionado(s)');
  /** Valor de selección (controlado desde el padre) */
  selectionValue = input<T[]>([]);
  /** Fila de totales (ej: cuadratura SII). Se renderiza en tfoot. */
  totalRow = input<T | null>(null);
  /** Etiqueta de registros sobre la tabla (ej: "8 registros") */
  recordsLabel = input<string | null>(null);

  /** Emitido al cambiar la selección */
  selectionChange = output<T[]>();
  /** Emitido al clicar el botón del empty state */
  emptyAction = output<void>();
  /** Emitido al cambiar filas por página o página del paginador. { rows, first } */
  pageChange = output<{ rows: number; first: number }>();

  showActionBar = computed(() => this.selectionValue().length > 0);

  /** Clases para el host: bento-* para grid placement (el host es hijo directo del grid) */
  hostClasses = computed(() => `bento-${this.size()}`);

  /** Obtener valor por path (ej: 'nested.prop') */
  getValue(row: T, field: string): unknown {
    return field.split('.').reduce((obj: unknown, key) => (obj as Record<string, unknown>)?.[key], row);
  }

  /** Formatea valor como moneda según config de columna */
  formatCurrency(value: unknown, col: DataTableColumnConfig<T>): string {
    const num = Number(value);
    if (Number.isNaN(num)) return String(value ?? '');
    const formatted = col.currencyFormat ? col.currencyFormat(num) : formatClp(num);
    const prefix = col.currencyPrefix ?? '';
    return prefix ? `${prefix}${formatted}` : formatted;
  }

  /** Valor numérico para progress (0-100) */
  getProgressValue(row: T, field: string): number {
    const v = this.getValue(row, field);
    return typeof v === 'number' ? v : Number(v) || 0;
  }

  onSelectionChange(value: T[]): void {
    this.selectionChange.emit(value);
  }

  onEmptyAction(): void {
    this.emptyAction.emit();
  }

  onPageChange(event: { first?: number; rows?: number }): void {
    if (event.rows != null) {
      this.pageChange.emit({ rows: event.rows, first: event.first ?? 0 });
    }
  }

  /** Columnas con sortable habilitado */
  getSortableColumns(): DataTableColumnConfig<T>[] {
    return this.columns().filter((c) => c.sortable);
  }
}

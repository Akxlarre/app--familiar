import {
  Component,
  input,
  signal,
  ChangeDetectionStrategy,
  AfterViewInit,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DataTableCardComponent } from '@shared/components/data-table-card';
import type { DataTableColumnConfig, DataTableEmptyConfig } from '@shared/components/data-table-card';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { BentoGridLayoutDirective } from '@core/directives/bento-grid-layout.directive';

/** Variantes de tabla para la galería */
export type TableVariant =
  | 'basic'
  | 'paginator'
  | 'sortable'
  | 'striped'
  | 'gridlines'
  | 'selection'
  | 'empty'
  | 'cuadratura'
  | 'detalle-ingresos';

export interface AlumnoRow {
  id: string;
  nombre: string;
  rut: string;
  categoria: string;
  estado: string;
  fechaInscripcion: string;
}

const SAMPLE_ALUMNOS: AlumnoRow[] = [
  { id: '1', nombre: 'María González', rut: '18.234.567-8', categoria: 'Clase B', estado: 'Activo', fechaInscripcion: '15/01/2025' },
  { id: '2', nombre: 'Juan Pérez', rut: '19.456.789-1', categoria: 'Clase C', estado: 'Activo', fechaInscripcion: '22/01/2025' },
  { id: '3', nombre: 'Ana Martínez', rut: '20.123.456-7', categoria: 'Clase B', estado: 'En práctica', fechaInscripcion: '08/02/2025' },
  { id: '4', nombre: 'Carlos López', rut: '17.987.654-3', categoria: 'Clase A', estado: 'Examen pendiente', fechaInscripcion: '10/01/2025' },
  { id: '5', nombre: 'Laura Fernández', rut: '21.345.678-9', categoria: 'Clase B', estado: 'Activo', fechaInscripcion: '01/02/2025' },
];

/** Helper para badges de estado - reutilizable en cualquier tabla */
function getEstadoBadgeClass(estado: unknown): string {
  const baseClass = 'estado-badge';
  const v = String(estado ?? '');
  if (v === 'Activo') return `${baseClass} estado-success`;
  if (v === 'En práctica') return `${baseClass} estado-primary`;
  if (v === 'Examen pendiente') return `${baseClass} estado-warning`;
  return baseClass;
}

const COLUMNS_BASIC: DataTableColumnConfig<AlumnoRow>[] = [
  { field: 'nombre', header: 'Nombre', cellClass: 'font-semibold text-primary' },
  { field: 'rut', header: 'RUT', cellClass: 'text-muted rut-cell' },
  { field: 'categoria', header: 'Categoría', cellClass: 'text-secondary' },
  { field: 'estado', header: 'Estado', cellType: 'badge', badgeClassFn: getEstadoBadgeClass },
  { field: 'fechaInscripcion', header: 'Inscripción', cellClass: 'text-muted' },
];

const COLUMNS_4: DataTableColumnConfig<AlumnoRow>[] = [
  { field: 'nombre', header: 'Nombre', cellClass: 'font-semibold text-primary' },
  { field: 'rut', header: 'RUT', cellClass: 'text-muted rut-cell' },
  { field: 'categoria', header: 'Categoría', cellClass: 'text-secondary' },
  { field: 'estado', header: 'Estado', cellType: 'badge', badgeClassFn: getEstadoBadgeClass },
];

const COLUMNS_SORTABLE: DataTableColumnConfig<AlumnoRow>[] = [
  { field: 'nombre', header: 'Nombre', sortable: true, cellClass: 'font-semibold text-primary' },
  { field: 'categoria', header: 'Categoría', sortable: true, cellClass: 'text-secondary' },
  { field: 'estado', header: 'Estado', sortable: true, cellType: 'badge', badgeClassFn: getEstadoBadgeClass },
  { field: 'fechaInscripcion', header: 'Inscripción', cellClass: 'text-muted' },
];

const COLUMNS_SELECTION: DataTableColumnConfig<AlumnoRow>[] = [
  { field: 'nombre', header: 'Nombre', cellClass: 'font-semibold text-primary' },
  { field: 'categoria', header: 'Categoría', cellClass: 'text-secondary' },
  { field: 'estado', header: 'Estado', cellType: 'badge', badgeClassFn: getEstadoBadgeClass },
];

const EMPTY_CONFIG: DataTableEmptyConfig = {
  icon: 'pi-inbox',
  message: 'No hay alumnos que coincidan con los filtros',
  subtitle: 'Intenta ajustar los criterios de búsqueda o agrega nuevos alumnos',
  actionLabel: 'Agregar alumno',
};

/** Cuadratura SII - Resumen por Concepto */
export interface CuadraturaRow {
  id: string;
  concepto: string;
  nOperaciones: number;
  total: number;
  porcentaje: number;
}

const CUADRATURA_DATA: CuadraturaRow[] = [
  { id: '1', concepto: 'Clase B', nOperaciones: 4, total: 815000, porcentaje: 50 },
  { id: '2', concepto: 'Profesional', nOperaciones: 2, total: 760000, porcentaje: 46.6 },
  { id: '3', concepto: 'Psicotécnico', nOperaciones: 1, total: 40000, porcentaje: 2.5 },
  { id: '4', concepto: 'Otro', nOperaciones: 1, total: 15000, porcentaje: 0.9 },
];

const CUADRATURA_TOTAL: CuadraturaRow = {
  id: 'total',
  concepto: 'Total',
  nOperaciones: 8,
  total: 1630000,
  porcentaje: 100,
};

function getConceptoChipClass(concepto: unknown): string {
  const v = String(concepto ?? '');
  if (v === 'Clase B') return 'chip-concepto-clase-b';
  if (v === 'Profesional') return 'chip-concepto-profesional';
  if (v === 'Psicotécnico') return 'chip-concepto-psicotecnico';
  return 'chip-concepto-otro';
}

const COLUMNS_CUADRATURA: DataTableColumnConfig<CuadraturaRow>[] = [
  { field: 'concepto', header: 'CONCEPTO', cellType: 'chip', badgeClassFn: getConceptoChipClass },
  { field: 'nOperaciones', header: 'N° OPERACIONES', cellClass: 'tabular-nums' },
  { field: 'total', header: 'TOTAL', cellType: 'currency' },
  { field: 'porcentaje', header: '% DEL TOTAL', cellType: 'progress' },
];

/** Detalle de Ingresos */
export interface DetalleIngresoRow {
  id: string;
  hora: string;
  tipo: string;
  conceptoSii: string;
  alumno: string;
  referencia: string;
  metodo: string;
  monto: number;
}

const DETALLE_INGRESOS_DATA: DetalleIngresoRow[] = [
  { id: '1', hora: '09:15', tipo: 'Matrícula', conceptoSii: 'Clase B', alumno: 'Juan Pérez', referencia: 'MAT-2026-0234', metodo: 'Efectivo', monto: 280000 },
  { id: '2', hora: '10:30', tipo: 'Clase práctica', conceptoSii: 'Clase B', alumno: 'María González', referencia: 'CLP-2026-0089', metodo: 'Transferencia', monto: 35000 },
  { id: '3', hora: '11:00', tipo: 'Psicotécnico', conceptoSii: 'Psicotécnico', alumno: 'Ana Martínez', referencia: 'PSI-2026-0012', metodo: 'Efectivo', monto: 40000 },
  { id: '4', hora: '14:20', tipo: 'Matrícula', conceptoSii: 'Profesional', alumno: 'Carlos López', referencia: 'MAT-2026-0235', metodo: 'Tarjeta', monto: 380000 },
  { id: '5', hora: '15:45', tipo: 'Certificado', conceptoSii: 'Otro', alumno: 'Laura Fernández', referencia: 'CERT-2026-0045', metodo: 'Transferencia', monto: 25000 },
];

function getMetodoBadgeClass(metodo: unknown): string {
  const v = String(metodo ?? '');
  if (v === 'Efectivo') return 'estado-success';
  if (v === 'Transferencia') return 'estado-info';
  if (v === 'Tarjeta') return 'estado-primary';
  return 'estado-warning';
}

function getMetodoIcon(metodo: unknown): string {
  const v = String(metodo ?? '');
  if (v === 'Efectivo') return 'pi-wallet';
  if (v === 'Transferencia') return 'pi-arrow-right-arrow-left';
  if (v === 'Tarjeta') return 'pi-credit-card';
  return 'pi-money-bill';
}

const COLUMNS_DETALLE_INGRESOS: DataTableColumnConfig<DetalleIngresoRow>[] = [
  { field: 'hora', header: 'HORA', cellClass: 'tabular-nums text-muted' },
  { field: 'tipo', header: 'TIPO', cellClass: 'text-secondary' },
  { field: 'conceptoSii', header: 'CONCEPTO SII', cellType: 'chip', badgeClassFn: getConceptoChipClass },
  { field: 'alumno', header: 'ALUMNO', cellClass: 'font-semibold text-primary' },
  { field: 'referencia', header: 'REFERENCIA', cellClass: 'text-muted' },
  { field: 'metodo', header: 'MÉTODO', cellType: 'badge-icon', badgeClassFn: getMetodoBadgeClass, badgeIconFn: getMetodoIcon },
  { field: 'monto', header: 'MONTO', cellType: 'currency', currencyPrefix: '+' },
];

@Component({
  selector: 'app-table-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, DataTableCardComponent, BentoGridLayoutDirective],
  templateUrl: './table-gallery.component.html',
  styleUrl: './table-gallery.component.scss',
})
export class TableGalleryComponent implements AfterViewInit {
  private gsap = inject(GsapAnimationsService);

  variants = input<TableVariant[]>(['basic', 'paginator', 'sortable', 'striped', 'gridlines', 'selection', 'empty', 'cuadratura', 'detalle-ingresos']);

  alumnos = SAMPLE_ALUMNOS;
  selectedAlumnos = signal<AlumnoRow[]>([]);
  emptyConfig = EMPTY_CONFIG;
  cuadraturaData = CUADRATURA_DATA;
  cuadraturaTotal = CUADRATURA_TOTAL;
  detalleIngresosData = DETALLE_INGRESOS_DATA;
  /** Filas por página para la variante paginator (controlado para FLIP) */
  paginatorRows = signal(3);
  grid = viewChild<ElementRef<HTMLElement>>('grid');

  getVariantTitle(variant: TableVariant): string {
    const titles: Record<TableVariant, string> = {
      basic: 'Tabla básica',
      paginator: 'Con paginación',
      sortable: 'Con ordenación',
      striped: 'Filas alternadas (striped)',
      gridlines: 'Con líneas de cuadrícula',
      selection: 'Con selección múltiple',
      empty: 'Estado vacío',
      cuadratura: 'Cuadratura SII - Resumen por Concepto',
      'detalle-ingresos': 'Detalle de Ingresos',
    };
    return titles[variant];
  }

  getVariantSize(variant: TableVariant): '2x2' | '3x2' | 'hero' {
    if (variant === 'selection' || variant === 'detalle-ingresos') return 'hero';
    if (variant === 'paginator' || variant === 'sortable' || variant === 'cuadratura') return '3x2';
    return '2x2';
  }

  getColumns(variant: TableVariant): DataTableColumnConfig<AlumnoRow>[] | DataTableColumnConfig<CuadraturaRow>[] | DataTableColumnConfig<DetalleIngresoRow>[] {
    switch (variant) {
      case 'sortable':
        return COLUMNS_SORTABLE;
      case 'selection':
        return COLUMNS_SELECTION;
      case 'basic':
        return COLUMNS_BASIC;
      case 'cuadratura':
        return COLUMNS_CUADRATURA;
      case 'detalle-ingresos':
        return COLUMNS_DETALLE_INGRESOS;
      default:
        return COLUMNS_4;
    }
  }

  clearSelection(): void {
    this.selectedAlumnos.set([]);
  }

  exportSelected(): void {
    console.log('Exportar:', this.selectedAlumnos());
  }

  onEmptyAction(): void {
    console.log('Empty action clicked');
  }

  onPaginatorPageChange(event: { rows: number; first: number }): void {
    const gridEl = this.grid();
    if (gridEl) {
      this.gsap.animateBentoLayoutChange(gridEl.nativeElement, () => {
        this.paginatorRows.set(event.rows);
      });
    } else {
      this.paginatorRows.set(event.rows);
    }
  }

  ngAfterViewInit(): void {
    const gridEl = this.grid();
    if (gridEl) {
      this.gsap.animateBentoGrid(gridEl.nativeElement);
      Array.from(gridEl.nativeElement.children).forEach((el) => {
        if (el instanceof HTMLElement) this.gsap.addCardHover(el);
      });
      setTimeout(() => {
        Array.from(gridEl.nativeElement.children).forEach((cardEl) => {
          if (cardEl instanceof HTMLElement) {
            const tableRows = cardEl.querySelectorAll('tbody tr');
            if (tableRows.length > 0) {
              this.gsap.staggerListItems(Array.from(tableRows));
            }
          }
        });
      }, 100);
    }
  }
}

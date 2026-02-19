import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagina-7',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-6 font-body">
      <div>
        <h1 class="text-3xl font-bold font-display text-primary">Página 7</h1>
        <p class="text-secondary text-lg">Categoría: Administración</p>
      </div>
      <div class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <p class="text-muted">Contenido de la séptima página — sección Administración.</p>
      </div>
    </div>
  `,
})
export class Pagina7Component {}

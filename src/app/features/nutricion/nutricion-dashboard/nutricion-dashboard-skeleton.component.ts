import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nutricion-dashboard-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-6">
      <div class="h-10 w-64 rounded bg-subtle animate-pulse"></div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="card card-tinted bento-1x1 h-28 rounded-xl animate-pulse bg-subtle"></div>
        <div class="card card-tinted bento-1x1 h-28 rounded-xl animate-pulse bg-subtle"></div>
        <div class="card card-tinted bento-1x1 h-28 rounded-xl animate-pulse bg-subtle"></div>
      </div>
      <div class="rounded-xl border border-default bg-surface p-4 space-y-3">
        <div class="h-4 w-32 rounded bg-subtle animate-pulse"></div>
        <div class="h-6 w-full rounded-full bg-subtle animate-pulse"></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="h-20 rounded-xl bg-subtle animate-pulse"></div>
        <div class="h-20 rounded-xl bg-subtle animate-pulse"></div>
        <div class="h-20 rounded-xl bg-subtle animate-pulse"></div>
      </div>
      <div class="h-48 rounded-xl bg-subtle animate-pulse"></div>
    </div>
  `,
})
export class NutricionDashboardSkeletonComponent {}

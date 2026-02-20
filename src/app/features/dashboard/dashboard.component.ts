import { Component, AfterViewInit, ElementRef, inject, viewChild, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FeatureCardComponent } from '@shared/components/feature-card/feature-card.component';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { BentoGridLayoutDirective } from '@core/directives/bento-grid-layout.directive';
import { AuthService } from '@core/services/auth.service';
import { FinanceSummaryService } from '@core/services/finance-summary.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    FeatureCardComponent,
    BentoGridLayoutDirective,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div>
        <h1 class="text-3xl font-bold font-display text-primary">Dashboard</h1>
        <p class="text-secondary text-lg">
          Bienvenido de vuelta, <span class="text-primary font-bold">{{ displayName() }}</span>
        </p>
      </div>

      <section #grid class="bento-grid" appBentoGridLayout aria-label="Panel principal">
        <app-feature-card
          title="Resumen"
          size="hero"
          [accent]="true"
          [hasIcon]="false"
          [inGrid]="true"
        >
          <p class="text-secondary">Vista general de tu hogar</p>
        </app-feature-card>

        <!-- Widget Finanzas -->
        <app-feature-card title="Finanzas del mes" size="2x2" [inGrid]="true">
          @if (budgetLoading()) {
            <div class="animate-pulse h-20 bg-subtle rounded"></div>
          } @else {
            <div class="flex flex-col gap-3">
              <div class="flex justify-between text-sm">
                <span class="text-secondary">Presupuesto consumido</span>
                <span class="font-semibold text-primary">{{ budgetPercent() }}%</span>
              </div>
              <div
                class="h-3 rounded-full bg-subtle overflow-hidden"
                role="progressbar"
                [attr.aria-valuenow]="budgetPercent()"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="h-full rounded-full transition-all"
                  [class.bg-primary]="budgetPercent() <= 100"
                  [class.bg-state-error]="budgetPercent() > 100"
                  [style.width.%]="budgetPercentDisplay()"
                ></div>
              </div>
              <div class="flex justify-between text-sm text-secondary">
                <span>{{ totalSpent() | number : '1.0-0' }} $ gastados</span>
                <span>{{ totalBudget() | number : '1.0-0' }} $ presupuestado</span>
              </div>
              <p class="text-sm text-muted">Balance: {{ balance() | number : '1.0-0' }} $ · Ahorro: {{ savingsRate() }}%</p>
              <a
                pButton
                [routerLink]="['/app/finanzas']"
                label="Ver finanzas"
                icon="pi pi-chart-pie"
                severity="secondary"
                class="w-full"
              ></a>
            </div>
          }
        </app-feature-card>

        <app-feature-card title="Accesos Rápidos" size="2x1" [inGrid]="true" [hasIcon]="false">
          <div class="flex flex-col gap-2">
            <a pButton [routerLink]="['/app/finanzas']" class="btn-primary w-full" routerLinkActive="router-link-active">
              <i class="pi pi-wallet"></i> Finanzas
            </a>
            <a pButton [routerLink]="['/app/configuracion/mi-hogar']" class="btn-secondary w-full">
              <i class="pi pi-home"></i> Mi hogar
            </a>
          </div>
        </app-feature-card>
      </section>
    </div>
  `,
  styles: [`
    .btn-primary {
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
      border-radius: var(--radius-full);
      padding: var(--space-3) var(--space-4);
      font-weight: var(--font-semibold);
      font-size: var(--text-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      cursor: pointer;
      transition: background 0.2s ease;
      text-decoration: none;
    }
    .btn-primary:hover {
      background: var(--color-primary-hover);
      color: var(--color-primary-text);
    }
    .btn-secondary {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      padding: var(--space-3) var(--space-4);
      font-weight: var(--font-semibold);
      font-size: var(--text-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      cursor: pointer;
      transition: background 0.2s ease;
      text-decoration: none;
    }
    .btn-secondary:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private gsap = inject(GsapAnimationsService);
  private auth = inject(AuthService);
  private financeSummary = inject(FinanceSummaryService);

  grid = viewChild.required<ElementRef<HTMLElement>>('grid');

  displayName = signal<string>('Usuario');
  budgetLoading = signal(true);
  totalBudget = signal(0);
  totalSpent = signal(0);
  balance = signal(0);
  savingsRate = signal(0);

  budgetPercent = signal(0);
  budgetPercentDisplay = signal(0);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.name) this.displayName.set(user.name);

    const householdId = user?.householdId;
    if (!householdId) {
      this.budgetLoading.set(false);
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    this.financeSummary.getSummary(householdId, year, month).then((res) => {
      this.budgetLoading.set(false);
      if (res.data) {
        this.totalBudget.set(res.data.totalBudget);
        this.totalSpent.set(res.data.totalSpent);
        this.balance.set(res.data.balance);
        this.savingsRate.set(Math.round(res.data.savingsRate * 10) / 10);
        this.budgetPercent.set(Math.round(res.data.budgetUsedPercent * 10) / 10);
        this.budgetPercentDisplay.set(Math.min(100, res.data.budgetUsedPercent));
      }
    });
  }

  ngAfterViewInit(): void {
    this.gsap.animateBentoGrid(this.grid().nativeElement);
  }
}

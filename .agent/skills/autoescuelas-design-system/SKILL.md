---
name: autoescuelas-design-system
description: >
  Activar SIEMPRE cuando el agente cree o modifique componentes Angular (.component.ts, .html),
  use clases Tailwind (bg-*, text-*, border-*), trabaje en dashboard, cards, KPIs, layouts o estilos.
  Sistema de tokens, Frosted Cards, bento grid, temas rojo/azul.
  NUNCA usar text-pink-500, bg-blue-50, text-red-700 ni colores Tailwind arbitrarios.
  Usar SIEMPRE var(--color-primary), bg-primary-muted, text-muted, bento-grid, card-tinted.
  Usar junto a angular-component y angular-signals.
---

# Skill: autoescuelas-design-system

## Cuándo activar esta skill

El agente debe usar esta skill cuando:
- Cree o modifique cualquier componente Angular de la app
- Trabaje con layouts de dashboard o páginas
- Implemente el tema rojo (Escuela A) o azul (Escuela B)
- Genere cards, KPIs, tablas, formularios o modales
- Añada animaciones, transiciones o motion
- Revise si un componente cumple el design system

---

## Stack técnico

- **Angular 20** — standalone components, signals, OnPush
- **Tailwind v4** — para utilidades de spacing/layout base
- **SCSS + CSS Variables** — para el sistema de temas y Frosted Cards
- **Angular CDK** — para overlays, portals, accesibilidad
- **GSAP 3** — para todas las animaciones y transiciones de entrada (ScrollTrigger, Flip, stagger)

---

## Reglas absolutas de implementación

### 1. Nunca usar colores hardcodeados
```scss
// ❌ INCORRECTO
color: #9B1D20;
background: #1B3F6E;

// ✅ CORRECTO
color: var(--color-primary);
background: var(--color-primary-muted);
```

### 2. Siempre fondo claro profesional
Todos los layouts usan `--bg-base` (`#F7F7F8`) como base de página.
Las superficies (cards, modales) usan `--bg-surface` (`#FFFFFF`).
**Nunca fondos oscuros.**

### 3. Todo componente usa `OnPush`
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### 4. El tema se inyecta con `ThemeService`
```typescript
readonly themeService = inject(ThemeService);
readonly theme = this.themeService.theme; // Signal<'red' | 'blue'>
```

### 5. Radios mínimos
- Cards y contenedores: `var(--radius-xl)` (24px) o mayor
- Botones: `var(--radius-full)` (pill)
- Elementos internos (chips, badges): `var(--radius-md)` (12px)

---

## Plantilla de Componente Card

```typescript
// feature-card.component.ts
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feature-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <article
      class="card"
      [class.card-accent]="accent()"
      [class.card-tinted]="tinted()"
      [class]="'bento-' + size()"
    >
      <header class="card__header">
        <div class="card__icon">
          <ng-content select="[slot=icon]" />
        </div>
        <div class="card__meta">
          <h3 class="card__title">{{ title() }}</h3>
          @if (badge()) {
            <span class="card__badge">{{ badge() }}</span>
          }
        </div>
      </header>
      <div class="card__body">
        <ng-content />
      </div>
      @if (hasFooter()) {
        <footer class="card__footer">
          <ng-content select="[slot=footer]" />
        </footer>
      }
    </article>
  `,
  styleUrl: './feature-card.component.scss'
})
export class FeatureCardComponent {
  title    = input.required<string>();
  badge    = input<string>();
  size     = input<'1x1' | '2x1' | '3x1' | '4x1' | '2x2' | '3x2' | 'hero'>('2x1');
  accent   = input(false);   // borde superior con color primario — 1 por sección
  tinted   = input(false);   // fondo tintado suave — para KPIs
  hasFooter = input(false);
}
```

```scss
// feature-card.component.scss
:host {
  display: contents;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);

  // Estado inicial para GSAP — animateBentoGrid() lo revela
  opacity: 0;
  transform: translateY(16px);

  // Hover: gestionado por GsapAnimationsService.addCardHover()

  // Elemento ancla de la sección (1 por sección máximo)
  &.card-accent {
    border: 1px solid var(--accent-border);
    border-top: 3px solid var(--color-primary);
    box-shadow: var(--shadow-md), 0 0 0 1px var(--accent-border) inset;
  }

  // KPIs y stats destacados
  &.card-tinted {
    background: color-mix(in srgb, var(--color-primary) 4%, white);
    border: 1px solid var(--accent-border);
    box-shadow: var(--shadow-sm);
  }

  &__header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--color-primary-muted);
    display: grid;
    place-items: center;
    color: var(--color-primary);
    flex-shrink: 0;
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    line-height: var(--leading-snug);
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    background: var(--color-primary-muted);
    color: var(--color-primary);
    border: 1px solid var(--accent-border);
  }

  &__body {
    flex: 1;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
  }

  &__footer {
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

// Animaciones de entrada: GsapAnimationsService.animateBentoGrid()
```

---

## Plantilla de Bento Dashboard Page

```html
<!-- dashboard.component.html -->
<main #container class="dashboard">
  <section #grid class="bento-grid" aria-label="Panel principal">

    <!-- Elemento ancla — 1 por sección, siempre card-accent -->
    <app-feature-card
      title="Resumen de la Escuela"
      size="hero"
      [accent]="true"
    >
      <!-- contenido hero -->
    </app-feature-card>

    <!-- KPIs — 4 × 1x1 con card-tinted -->
    @for (kpi of kpis(); track kpi.id) {
      <app-kpi-card [data]="kpi" />
    }

    <!-- Gráfico — 2x2 card base -->
    <app-feature-card title="Alumnos Activos" size="2x2">
      <!-- chart -->
    </app-feature-card>

    <!-- Agenda — 2x2 card base -->
    <app-feature-card title="Clases de Hoy" size="2x2">
      <!-- lista -->
    </app-feature-card>

  </section>
</main>
```

```scss
// dashboard.component.scss
.dashboard {
  min-height: 100vh;
  background: var(--bg-base);  // #F7F7F8 — nunca blanco puro, nunca oscuro
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: 140px;
  gap: var(--space-4);
  padding: var(--space-6);

  .bento-1x1  { grid-column: span 3; }
  .bento-2x1  { grid-column: span 6; }
  .bento-3x1  { grid-column: span 9; }
  .bento-4x1  { grid-column: span 12; }
  .bento-2x2  { grid-column: span 6;  grid-row: span 2; }
  .bento-3x2  { grid-column: span 9;  grid-row: span 2; }
  .bento-hero { grid-column: span 12; grid-row: span 2; }
}
```

---

## Tema y Escuela

El tema (rojo/azul) se inyecta con `ThemeService`. El selector de escuela activa está en `SchoolSelectorComponent` (topbar/sidebar).

---

## GSAP — Patrones de Animación

### Instalación
```bash
npm install gsap
npm install @types/gsap --save-dev
```

### Servicio central de animaciones

```typescript
// gsap-animations.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Injectable({ providedIn: 'root' })
export class GsapAnimationsService {
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
    }
  }

  /** Animación de entrada para celdas bento — stagger desde abajo */
  animateBentoGrid(containerEl: HTMLElement): void {
    const cells = containerEl.querySelectorAll<HTMLElement>('.bento-grid > *');
    gsap.fromTo(cells,
      { opacity: 0, y: 24, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        ease: 'power3.out',
        stagger: { amount: 0.4, from: 'start' },
        clearProps: 'transform',
      }
    );
  }

  /** Animación del hero card — entrada con blur + scale */
  animateHero(el: HTMLElement): void {
    gsap.fromTo(el,
      { opacity: 0, scale: 0.95, filter: 'blur(8px)' },
      {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.7,
        ease: 'expo.out',
        clearProps: 'filter,transform',
      }
    );
  }

  /** Números KPI — counter animado */
  animateCounter(el: HTMLElement, target: number, suffix = ''): void {
    gsap.fromTo({ val: 0 },
      { val: 0 },
      {
        val: target,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate() {
          el.textContent = Math.round(this.targets()[0].val) + suffix;
        }
      }
    );
  }

  /** Hover en cards — sombra elevada sobre fondo claro */
  addCardHover(el: HTMLElement): void {
    const enter = () => gsap.to(el, {
      boxShadow: [
        '0 2px 4px rgba(0,0,0,0.04)',
        '0 8px 32px rgba(0,0,0,0.12)',
        '0 24px 48px rgba(0,0,0,0.08)'
      ].join(', '),
      borderColor: 'rgba(0,0,0,0.16)',
      y: -2,
      duration: 0.22,
      ease: 'power2.out',
    });
    const leave = () => gsap.to(el, {
      boxShadow: [
        '0 1px 3px rgba(0,0,0,0.06)',
        '0 4px 16px rgba(0,0,0,0.06)'
      ].join(', '),
      borderColor: 'rgba(0,0,0,0.09)',
      y: 0,
      duration: 0.32,
      ease: 'power2.inOut',
    });
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
  }

  /** Transición de cambio de tema — fade out → swap → fade in */
  animateThemeChange(onSwap: () => void): void {
    gsap.to('body', {
      opacity: 0.6,
      duration: 0.15,
      ease: 'power1.in',
      onComplete: () => {
        onSwap();
        gsap.to('body', {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    });
  }

  /** Page route transition — salida */
  animatePageLeave(el: HTMLElement, onComplete: () => void): void {
    gsap.to(el, {
      opacity: 0,
      y: -12,
      duration: 0.25,
      ease: 'power2.in',
      onComplete,
    });
  }

  /** Page route transition — entrada */
  animatePageEnter(el: HTMLElement): void {
    gsap.fromTo(el,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform' }
    );
  }
}
```

### Uso en un componente Angular 20

```typescript
// dashboard.component.ts
import { Component, OnInit, AfterViewInit, ElementRef, inject,
         ChangeDetectionStrategy, viewChild } from '@angular/core';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main #container class="dashboard">
      <div class="dashboard__bg" aria-hidden="true"></div>
      <section #grid class="bento-grid">
        <!-- celdas -->
      </section>
    </main>
  `
})
export class DashboardComponent implements AfterViewInit {
  private gsap  = inject(GsapAnimationsService);
  private host  = inject(ElementRef<HTMLElement>);

  grid = viewChild.required<ElementRef<HTMLElement>>('grid');

  ngAfterViewInit(): void {
    // Animar hero primero, luego el resto del grid
    const hero = this.host.nativeElement.querySelector<HTMLElement>('.bento-hero');
    if (hero) this.gsap.animateHero(hero);
    this.gsap.animateBentoGrid(this.grid().nativeElement);
  }
}
```

### ThemeService con transición GSAP

```typescript
// theme.service.ts
setTheme(theme: 'red' | 'blue'): void {
  this.gsap.animateThemeChange(() => {
    document.documentElement.setAttribute('data-theme', theme);
    this.theme.set(theme);
    localStorage.setItem('app-theme', theme);
  });
}
```

### Reglas GSAP en este proyecto

- Siempre usar `clearProps: 'transform'` tras animaciones de movimiento para no bloquear `will-change`
- Registrar plugins (`ScrollTrigger`, `Flip`) **solo en browser** (guard con `isPlatformBrowser`)
- No usar `@angular/animations` en ningún componente — todo motion va por GSAP
- Manejar hover de cards con `addCardHover()` del servicio, no con CSS `transition` para colores de sombra
- Los contadores KPI usan siempre `animateCounter()` al entrar en viewport

---

## Checklist antes de entregar un componente

- [ ] Usa `ChangeDetectionStrategy.OnPush`
- [ ] Todos los colores son `var(--...)` — ningún color hardcodeado
- [ ] Usa `.card`, `.card-accent` o `.card-tinted` — nunca `.glass` ni `.glass-tinted`
- [ ] Fondo de página: `var(--bg-base)` | Superficies: `var(--bg-surface)` — nunca fondos oscuros
- [ ] Llama a `GsapAnimationsService` en `ngAfterViewInit` para la entrada
- [ ] El hover de cards usa `addCardHover()` del servicio
- [ ] No hay `@angular/animations` importado en ningún módulo/componente
- [ ] `.card-accent` aparece máximo 1 vez por sección
- [ ] `--state-error` solo en validación — nunca como color de marca del tema rojo
- [ ] Funciona en ambos temas sin modificaciones (test: alternar `data-theme`)
- [ ] Radios respetan el sistema (`--radius-xl` mínimo en cards)
- [ ] Tipografía usa variables `--text-*` y `--font-*`
- [ ] Contraste WCAG AA verificado (mínimo 4.5:1 en texto normal)

---

## Referencias

- **Animaciones**: `docs/ANIMATIONS.md` — API completa de GsapAnimationsService
- **Directivas**: `src/app/core/directives/DIRECTIVES.md` — appPressFeedback, appBentoGridLayout, appSearchShortcut

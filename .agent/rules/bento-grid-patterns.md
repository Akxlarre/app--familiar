# Bento Grid Layout Patterns

**Activar cuando**: El agente diseñe dashboards, páginas de resumen, o layouts con múltiples cards/widgets organizados en grid.

---

## Grid System Structure

```scss
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: 140px;
  gap: var(--space-4); // 16px
  padding: var(--space-6); // 24px
  background: var(--bg-base); // #F7F7F8
}
```

---

## Sizing Classes

Each cell can span multiple columns and/or rows:

| Class | Columns | Rows | Use Case |
|-------|---------|------|----------|
| `.bento-1x1` | 3 (span 3) | 1 | KPIs, stats, small widgets |
| `.bento-2x1` | 6 (span 6) | 1 | Medium cards, forms |
| `.bento-3x1` | 9 (span 9) | 1 | Wide content, charts |
| `.bento-4x1` | 12 (span 12) | 1 | Full-width elements |
| `.bento-2x2` | 6 (span 6) | 2 | Charts, tables, calendars |
| `.bento-3x2` | 9 (span 9) | 2 | Large content areas |
| `.bento-hero` | 12 (span 12) | 2 | Hero sections, main dashboards |

```scss
.bento-1x1  { grid-column: span 3; }
.bento-2x1  { grid-column: span 6; }
.bento-3x1  { grid-column: span 9; }
.bento-4x1  { grid-column: span 12; }
.bento-2x2  { grid-column: span 6;  grid-row: span 2; }
.bento-3x2  { grid-column: span 9;  grid-row: span 2; }
.bento-hero { grid-column: span 12; grid-row: span 2; }
```

---

## Composition Rules

### 1. Always One Anchor Per Section
Each bento grid section MUST have exactly **1 anchor element** using `.card-accent`:
- Usually the hero card (`.bento-hero`)
- Or a prominent 4x1 / 3x2 card
- Has primary-colored border-top (brand signature)

```html
<!-- ✅ CORRECTO: 1 card-accent por sección -->
<section class="bento-grid">
  <app-feature-card
    size="hero"
    [accent]="true"  <!-- Único elemento ancla -->
    title="Resumen de la Escuela"
  >
    <!-- content -->
  </app-feature-card>

  <!-- Resto de cards SIN accent -->
  <app-kpi-card [data]="kpi1" />
  <app-kpi-card [data]="kpi2" />
</section>

<!-- ❌ INCORRECTO: múltiples card-accent -->
<section class="bento-grid">
  <app-feature-card [accent]="true" /> <!-- mal -->
  <app-feature-card [accent]="true" /> <!-- demasiados anchors -->
</section>
```

### 2. KPI Row Pattern
Los KPIs siguen un patrón fijo:
- **4 cards** en fila
- Todas `.bento-1x1` (3 columns each = 12 total)
- Todas con `.card-tinted` (subtle primary background)
- Contadores animados con GSAP

```html
<section class="bento-grid">
  <!-- Hero ancla -->
  <app-feature-card size="hero" [accent]="true" />

  <!-- Fila KPI: 4 × 1x1 tinted -->
  @for (kpi of kpis(); track kpi.id) {
    <app-kpi-card
      [data]="kpi"
      size="1x1"
      [tinted]="true"
    />
  }
</section>
```

### 3. Color Primario Limitado
- Máximo **2-3 apariciones** del color primario por pantalla
- `.card-accent`: borde superior (1 vez por sección)
- `.card-tinted`: fondo KPIs (máximo 4)
- Botones primarios: solo CTAs principales

---

## Layout Examples

### Dashboard Principal
```
┌─────────────────────────────────────────────┐
│ HERO (12×2) .card-accent                    │
│ "Resumen de la Escuela"                     │
└─────────────────────────────────────────────┘
┌────────┬────────┬────────┬────────┐
│ KPI 1  │ KPI 2  │ KPI 3  │ KPI 4  │ (4 × 1x1 tinted)
│ (3×1)  │ (3×1)  │ (3×1)  │ (3×1)  │
└────────┴────────┴────────┴────────┘
┌──────────────────┬──────────────────┐
│ Gráfico Alumnos  │ Agenda Clases    │ (2 × 2x2)
│ (6×2)            │ (6×2)            │
└──────────────────┴──────────────────┘
```

### Página de Listado
```
┌─────────────────────────────────────────────┐
│ HEADER (12×1) .card-accent                  │
│ "Alumnos Activos" + filtros                 │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ TABLA (12×2+)                               │
│ PrimeNG p-table con paginación              │
└─────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

```scss
@media (max-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .bento-1x1  { grid-column: span 3; }  // 50% en tablet
  .bento-2x1  { grid-column: span 6; }  // full width
  .bento-3x1  { grid-column: span 6; }
  .bento-4x1  { grid-column: span 6; }
  .bento-2x2  { grid-column: span 6; grid-row: span 2; }
  .bento-3x2  { grid-column: span 6; grid-row: span 3; }
  .bento-hero { grid-column: span 6; grid-row: span 2; }
}

@media (max-width: 768px) {
  .bento-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
  }

  .bento-1x1,
  .bento-2x1,
  .bento-3x1,
  .bento-4x1,
  .bento-2x2,
  .bento-3x2,
  .bento-hero {
    grid-column: span 1;
    grid-row: span 1; // Reset en móvil
  }
}
```

---

## GSAP Animation Entry

Todas las celdas del bento grid se animan con **stagger** al entrar:

```typescript
ngAfterViewInit(): void {
  const grid = this.host.nativeElement.querySelector('.bento-grid');
  this.gsapService.animateBentoGrid(grid);
}
```

Patrón de animación:
- Stagger: 0.4s total (distribuido entre todas las celdas)
- From: `opacity: 0, y: 24px, scale: 0.97`
- To: `opacity: 1, y: 0, scale: 1`
- Ease: `power3.out`
- Orden: `from: 'start'` (de arriba abajo, izquierda a derecha)

---

## Accessibility

### ARIA Labels
```html
<section
  class="bento-grid"
  role="region"
  aria-label="Panel principal"
>
  <!-- cards -->
</section>
```

### Keyboard Navigation
- Cada card debe ser focusable si contiene acciones
- `tabindex="0"` solo en elementos interactivos
- Focus ring usa `--shadow-focus` (3px primary glow)

### Screen Readers
- Hero card usa `<h1>` o `<h2>` según jerarquía
- KPIs usan `<dt>` (término) y `<dd>` (valor)
- Gráficos incluyen `aria-label` descriptivo

---

## Don'ts

❌ **NO** múltiples `.card-accent` por sección  
❌ **NO** mezclar glassmorphism con frosted cards  
❌ **NO** hardcodear tamanños de grid (usar las clases `.bento-*`)  
❌ **NO** saturar con color primario (máximo 2-3 veces por vista)  
❌ **NO** olvidar animación GSAP al montar el grid  
❌ **NO** romper responsive (test en 1440px, 1024px, 768px, 375px)

---

## Do's

✅ **SÍ** 1 elemento ancla `.card-accent` por sección  
✅ **SÍ** usar `.card-tinted` para KPIs (máximo 4 por vista)  
✅ **SÍ** mantener jerarquía visual con sizing (`hero > 3x2 > 2x2 > 2x1 > 1x1`)  
✅ **SÍ** animar entrada con `GsapAnimationsService.animateBentoGrid()`  
✅ **SÍ** testear en ambos temas (rojo y azul) antes de entregar  
✅ **SÍ** verificar contraste WCAG AA en todos los cards

---

## Checklist de Implementación

- [ ] Grid usa 12 columnas base
- [ ] Gap de `var(--space-4)` (16px)
- [ ] Fondo de página: `var(--bg-base)` (#F7F7F8)
- [ ] 1 solo `.card-accent` por sección
- [ ] KPIs usan `.card-tinted` y animación de contador
- [ ] Hero card usa `.bento-hero` + `.card-accent`
- [ ] Animación GSAP en `ngAfterViewInit`
- [ ] Responsive funciona en tablet y móvil
- [ ] Accesibilidad: roles ARIA, focus management
- [ ] Color primario visible máximo 2-3 veces

# Arquitectura de Skeletons — Auto Escuelas

## Estructura de carpetas

Los skeletons se **colocan junto al componente** que imitan, siguiendo el patrón colocated:

```
shared/components/
  kpi-card/
    kpi-card.component.ts
    kpi-card.component.scss
    kpi-card-skeleton.component.ts      ← skeleton
    kpi-card-skeleton.component.scss
    index.ts

  feature-card/
    feature-card.component.ts
    feature-card.component.scss
    feature-card-skeleton.component.ts
    feature-card-skeleton.component.scss

  category-breakdown-card/
    category-breakdown-card.component.ts
    category-breakdown-card.component.scss
    category-breakdown-card-skeleton.component.ts
    category-breakdown-card-skeleton.component.scss

  data-table-card/
    data-table-card.component.ts
    data-table-card.component.html
    data-table-card.component.scss
    data-table-card-skeleton.component.ts
    data-table-card-skeleton.component.scss
    index.ts
```

## Convenciones

| Aspecto | Regla |
|---------|-------|
| **Nombre** | `{componente}-skeleton.component.ts` |
| **Selector** | `app-{componente}-skeleton` |
| **Host classes** | Mismas clases que el componente real (`card`, `bento-*`) |
| **Primitivo** | PrimeNG `p-skeleton` con `animation="wave"` |
| **Tokens** | Solo design system (`--bg-subtle`, `--radius-*`, etc.) |

## Uso

```html
@if (loading()) {
  <app-kpi-card-skeleton [size]="'1x1'" />
} @else {
  <app-kpi-card [data]="kpi" />
}
```

## Barrel exports

Los `index.ts` exportan componente + skeleton cuando tiene sentido agrupar:

```ts
// kpi-card/index.ts
export { KpiCardComponent } from './kpi-card.component';
export { KpiCardSkeletonComponent } from './kpi-card-skeleton.component';
export type { KpiData } from './kpi-card.component';
```

## Transición skeleton → contenido

`GsapAnimationsService.animateSkeletonToContent()` aplica la animación al contenido cuando reemplaza al skeleton:

- **Variante**: fade + slide suave (sin scale/zoom)
- **Duración**: 280ms
- **Movimiento**: translateY(8px) → 0
- **Easing**: power3.out

Alineado con las page transitions (híbrido premium) para consistencia visual.

## Referencia

- Design system: `src/styles/tokens/_variables.scss`
- Overrides skeleton: `src/styles/vendors/_primeng-overrides.scss`

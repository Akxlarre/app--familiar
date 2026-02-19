# Animaciones — GsapAnimationsService

> **Regla**: Usar SIEMPRE `GsapAnimationsService` para motion. NUNCA `@angular/animations` ni CSS `@keyframes`.

## Ubicación
`src/app/core/services/gsap-animations.service.ts`

## Reglas absolutas
- Todo el motion pasa por este servicio
- Respeta `prefers-reduced-motion` (el servicio lo comprueba internamente)
- Usar `clearProps: 'transform'` tras animaciones de movimiento
- Plugins GSAP solo en browser (el servicio ya lo hace)
- No usar el plugin Flip de GSAP — conflicto de casing en Windows. Ver `docs/GSAP-FLIP-CASING-ISSUE.md`

---

## API por categoría

### Entrada / Grid
| Método | Cuándo usar |
|--------|-------------|
| `animateBentoGrid(containerEl)` | Entrada stagger de celdas del bento-grid en ngAfterViewInit |
| `animateHero(el)` | Entrada del hero card (blur + scale) |
| `animateCounter(el, target, suffix)` | Contador animado en KPIs (app-kpi-card lo usa) |
| `animatePageEnter(el)` | Entrada de página tras cambio de ruta |
| `animatePageLeave(el, onComplete)` | Salida de página antes de navegar |
| `animateSkeletonToContent(el)` | Transición skeleton → contenido final |
| `fadeIn(el, delay)` | Fade in simple |
| `staggerListItems(items)` | Entrada de lista con stagger |

### Stepper
| Método | Cuándo usar |
|--------|-------------|
| `animateStepperPanelIn(el)` | Entrada del contenido al cambiar de paso en Stepper |

### Paneles / Overlays
| Método | Cuándo usar |
|--------|-------------|
| `animateToastIn(el)` | Entrada de toast — slide desde derecha + fade |
| `animateToastOut(el, onComplete)` | Salida de toast — slide hacia derecha + fade |
| `animatePanelIn(el)` | Entrada de dropdown, overlay, panel |
| `animatePanelOut(el, onComplete)` | Salida de panel |
| `animatePanelToDrawer(panel, onLayoutChange, onComplete)` | Panel → drawer lateral (ej. notificaciones) |
| `animateDrawerOut(drawerEl, onComplete)` | Cierre del drawer |
| `animateDrawer(backdrop, aside, open, onCloseComplete)` | Drawer móvil (sidebar) |

### Layout / Reflow
| Método | Cuándo usar |
|--------|-------------|
| `animateBentoLayoutChange(grid, onChange, onComplete)` | Reflow del bento-grid (FLIP manual). Usar vía `BENTO_GRID_LAYOUT_CONTEXT.runLayoutChange()` |

### Interacción (hover / press)
| Método | Cuándo usar |
|--------|-------------|
| `addInteractiveFeedback(el)` | Hover + press. Usado por `[appPressFeedback]` |
| `addPressFeedback(el)` | Solo press |
| `addCardHover(el)` | Hover en cards (sombra, elevación). Llamar en ngAfterViewInit |
| `addButtonHover(el)` | Hover en botones |
| `addPillHovers(containerEl)` | Hover en pills del sidebar (.p-menu-item-content) |

### Validación
| Método | Cuándo usar |
|--------|-------------|
| `animateInputError(el)` | Shake horizontal suave cuando un input tiene error de validación |

### Otros
| Método | Cuándo usar |
|--------|-------------|
| `animateThemeChange(onSwap)` | Transición al cambiar tema (rojo/azul) |
| `killAll()` | Cleanup — matar todas las animaciones activas |

---

## Patrones de uso

### Bento grid en página
```typescript
ngAfterViewInit(): void {
  const grid = this.gridRef()?.nativeElement;
  if (grid) this.gsap.animateBentoGrid(grid);
}
```

### Cards con hover
```typescript
ngAfterViewInit(): void {
  const cards = this.host.nativeElement.querySelectorAll('.card');
  cards.forEach(el => this.gsap.addCardHover(el as HTMLElement));
}
```

### Panel dropdown
```typescript
// Apertura
this.gsap.animatePanelIn(panelEl);

// Cierre
this.gsap.animatePanelOut(panelEl, () => this.isOpen.set(false));
```

### Skeleton → contenido
```typescript
// Tras cargar datos y reemplazar skeleton por contenido
this.gsap.animateSkeletonToContent(contentEl);
```

---

## Referencias
- Directivas: `src/app/core/directives/DIRECTIVES.md`
- FLIP en Windows: `docs/GSAP-FLIP-CASING-ISSUE.md`
- Skeletons: `docs/SKELETON-ARCHITECTURE.md`

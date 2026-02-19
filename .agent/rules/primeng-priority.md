# PrimeNG Component Priority Rule

**CRITICAL RULE**: Jerarquía de componentes — Design System → PrimeNG → Custom.

## Jerarquía de prioridad

1. **Componentes del Design System** — Si existe en `src/app/shared/components/` y cubre el caso, **usar siempre**. Ver `src/app/shared/components/COMPONENTS.md`.
2. **PrimeNG** — Para inputs, botones, tablas, diálogos, etc. sin equivalente propio.
3. **Custom nuevo** — Solo cuando no exista ni componente propio ni PrimeNG equivalente.

Antes de crear un componente nuevo: buscar en `COMPONENTS.md` y leer la documentación del componente si existe.

## Framework Stack
- **UI Framework**: PrimeNG (https://primeng.org/)
- **Icon Library**: PrimeIcons (https://primeng.org/icons)
- **Base Framework**: Angular 20 with standalone components

## Component Priority Guidelines

### 1. Siempre verificar en este orden
Antes de crear CUALQUIER componente custom:
1. **Buscar en** `src/app/shared/components/COMPONENTS.md` — ¿Existe un componente que cubra el caso? Si sí, usarlo y leer su README.
2. **Verificar PrimeNG** — ¿Tiene un componente equivalente? Si sí, usarlo.
3. **Crear custom** — Solo si no existe ni uno ni otro.

### 2. Common PrimeNG Components to Use

**Forms & Inputs**:
- `p-input-text`, `p-input-number`, `p-textarea`
- `p-dropdown`, `p-multiselect`, `p-autocomplete`
- `p-calendar`, `p-checkbox`, `p-radio-button`
- `p-input-switch`, `p-rating`

**Data Display**:
- `p-table` (with sorting, filtering, pagination)
- `p-data-view`, `p-card`, `p-panel`
- `p-accordion`, `p-tabview`

**Buttons & Menus**:
- `p-button`, `p-split-button`, `p-speed-dial`
- `p-menubar`, `p-menu`, `p-context-menu`
- `p-breadcrumb`, `p-steps`

**Overlays & Modals**:
- `p-dialog`, `p-sidebar`, `p-overlay-panel`
- `p-toast`, `p-confirm-dialog`

**Navigation**:
- `p-menu`, `p-menubar`, `p-panelmenu`
- `p-tabmenu`, `p-breadcrumb`

### 3. PrimeIcons Usage
- Always use PrimeIcons for icons: `pi pi-icon-name`
- Common icons: `pi-check`, `pi-times`, `pi-search`, `pi-plus`, `pi-trash`
- See full list: https://primeng.org/icons

### 4. Implementation Pattern

```typescript
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [ButtonModule, InputTextModule],
  template: `
    <input pInputText placeholder="Enter text" />
    <p-button label="Submit" icon="pi pi-check"></p-button>
  `
})
export class ExampleComponent {}
```

### 5. When to Create Custom Components
Only create custom components when:
- PrimeNG doesn't provide the specific functionality
- You need highly specialized behavior not available in PrimeNG
- You're extending or wrapping PrimeNG components with additional logic

### 6. Styling
- Use PrimeNG's theming system
- Leverage built-in severity variants: `primary`, `secondary`, `success`, `info`, `warning`, `danger`
- Use PrimeFlex for utilities if needed

## Examples

❌ **WRONG** - Creating custom button:
```typescript
// Don't do this!
<button class="custom-btn">Click Me</button>
```

✅ **CORRECT** - Using PrimeNG button:
```typescript
import { ButtonModule } from 'primeng/button';

<p-button label="Click Me" icon="pi pi-check"></p-button>
```

❌ **WRONG** - Custom table:
```typescript
// Don't do this!
<table>...</table>
```

✅ **CORRECT** - PrimeNG table:
```typescript
import { TableModule } from 'primeng/table';

<p-table [value]="data" [paginator]="true">
  <ng-template pTemplate="header">...</ng-template>
</p-table>
```

## Summary
**Jerarquía: 1) Componentes shared (COMPONENTS.md) → 2) PrimeNG → 3) Custom. Solo crear custom cuando no exista alternativa.**

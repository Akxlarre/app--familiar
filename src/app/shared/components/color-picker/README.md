# app-color-picker

Selector de colores del Design System — wrapper de PrimeNG ColorPicker con formato HEX y soporte para formularios reactivos.

## Propósito

Reemplazar inputs de texto manuales para colores (#3B82F6) por un selector visual con paleta, saturación y matiz. Usa PrimeNG ColorPicker internamente.

## Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `label` | `string` | — | Etiqueta opcional (ej: "Color (opcional)") |
| `inputId` | `string` | `'color'` | ID del input para asociar con el label |
| `styleClass` | `string` | `'w-full'` | Clases CSS del componente |
| `inline` | `boolean` | `false` | Si true, muestra el picker inline en lugar de popup |
| `disabled` | `boolean` | `false` | Deshabilitado |
| `defaultColor` | `string` | `'#3B82F6'` | Color por defecto cuando el valor está vacío |

## Formularios reactivos

Implementa `ControlValueAccessor`. Usar con `formControlName`:

```html
<form [formGroup]="form">
  <app-color-picker
    formControlName="color"
    label="Color (opcional)"
    inputId="color"
  />
</form>
```

El valor se almacena en formato HEX (ej: `#3B82F6`).

## Cuándo usarlo

- Formularios de cuentas, categorías, metas de ahorro u otros que requieran color opcional
- Cualquier input que actualmente use placeholder tipo `#3B82F6`

## Cuándo no usarlo

- Si necesitas formato RGB o HSB explícito (el componente usa HEX por defecto)
- Si necesitas el picker siempre visible (usar `[inline]="true"`)

# Guía de Marca y Estilo - Autoescuela Chillán

## 🎨 Identidad Visual

El sistema utiliza una identidad dual para representar a las dos instituciones:
- **Escuela A (Rojo)**: Tradicional, seria, prestigiosa.
- **Escuela B (Azul)**: Moderna, confiable, sólida.

## 🔤 Tipografía

La tipografía ha sido seleccionada priorizando la funcionalidad y legibilidad en interfaces de datos densos, sin sacrificar la personalidad institucional.

### Fuentes Principales
| Uso | Fuente | Origen | Características |
|-----|--------|--------|-----------------|
| **Display / Títulos** | **Bricolage Grotesque** | Google Fonts | Carácter institucional, peso visual, ideal para KPIs y encabezados. |
| **UI / Body / Tablas** | **Geist Sans** | Vercel / CDN | Diseñada para interfaces, excelente legibilidad a tamaños pequeños (12-13px). |
| **Código / Mono** | **Geist Mono** | Vercel / CDN | Alineación perfecta para datos crudos. |

### Implementación CSS
```css
:root {
  --font-display: "Bricolage Grotesque", system-ui, sans-serif;
  --font-body: "Geist Sans", "Geist", system-ui, sans-serif;
  --font-mono: "Geist Mono", "JetBrains Mono", monospace;
}
```

### Reglas de Uso
1.  **Números Tabulares**: Para tablas, contadores y cualquier dato comparativo, SIEMPRE usar la clase `.tabular` o `font-variant-numeric: tabular-nums`.
    ```html
    <!-- Correcto -->
    <span class="text-3xl font-bold tabular">$12.500</span>
    ```
2.  **Jerarquía**:
    - `h1`, `h2`, `h3`: Bricolage Grotesque (Bold/Extrabold).
    - Texto corrido, labels, inputs: Geist Sans (Regular/Medium).
3.  **Tamaños**:
    - Base: 14px (Geist es legible incluso a 13px).
    - Títulos de sección: 18px-24px.
    - KPIs: 32px-48px.

## 🎭 Color

### Sistema de Tema Dual
El color primario cambia según la escuela seleccionada. NUNCA usar valores hex hardcodeados para elementos de marca.

- **Variable**: `var(--color-primary)`
- **Escuela A**: `#9B1D20` (Rojo)
- **Escuela B**: `#1B3F6E` (Azul)

### Restricciones
- **No usar modo oscuro**: El sistema está diseñado para "papel digital" (fondos claros, alto contraste).
- **No usar glassmorphism**: Usar "Frosted Cards" (bordes sutiles, fondos sólidos o muy levemente tintados, sombras suaves).

## 🧩 Componentes

### Frosted Cards
- Fondo: `var(--bg-surface)` o tintado `var(--color-primary-50)`.
- Borde: Fino, `var(--border-default)`.
- Sombra: `var(--shadow-sm)` a `var(--shadow-md)`.
- **Variantes**:
    - `submit`: Botón de acción principal.
    - `tinted`: Para destacar secciones suavemente.
    - `accent`: Borde superior de color primario para énfasis.

---
*Documento generado por Antigravity - Última actualización: Febrero 2026*

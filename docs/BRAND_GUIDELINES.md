# Guía de Marca y Estilo - App Familiar

## 🎨 Identidad Visual

El sistema utiliza una identidad dual para personalizar la experiencia:
- **Tema A (Rojo)**: Cálido, acogedor, hogareño.
- **Tema B (Azul)**: Fresco, ordenado, tranquilo.

## 🔤 Tipografía

La tipografía ha sido seleccionada priorizando la funcionalidad y legibilidad en interfaces de datos densos, sin sacrificar la personalidad acogedora.

### Fuentes Principales
| Uso | Fuente | Origen | Características |
|-----|--------|--------|-----------------|
| **Display / Títulos** | **Bricolage Grotesque** | Google Fonts | Carácter amigable, peso visual, ideal para KPIs y encabezados. |
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
El color primario cambia según el tema seleccionado. NUNCA usar valores hex hardcodeados para elementos de marca.

- **Variable**: `var(--color-primary)`
- **Tema A**: `#9B1D20` (Rojo)
- **Tema B**: `#1B3F6E` (Azul)

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
*Documento generado — Última actualización: Febrero 2026*

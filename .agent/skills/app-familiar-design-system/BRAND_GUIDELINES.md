# 🏠 Design System — App Familiar
> Versión: 2.0 | Stack: Angular 20 + Tailwind v4 + SCSS + GSAP 3

---

## 📌 Contexto del Proyecto

Aplicación familiar para gestionar **inventario, recetas, comidas y organización del hogar**.
El sistema soporta dos temas visuales para personalizar la experiencia.

| Tema | Color primario | Personalidad |
|------|----------------|--------------|
| Tema A (rojo) | `#9B1D20` borgoña | Cálido, acogedor, hogareño |
| Tema B (azul) | `#1B3F6E` marino | Fresco, ordenado, tranquilo |

El cambio de tema se aplica a nivel `<html data-theme="red | blue">` y afecta únicamente las **CSS variables de color**. Todo lo demás es idéntico en ambos temas.

---

## 🎨 Filosofía de Diseño

**Referencia estética**: Apple (precisión, aire, jerarquía) + Frosted Cards (profundidad sobre blanco) + Bento Grid (densidad informativa organizada)

### Principios irrenunciables

- **Claridad y usabilidad** — interfaz pensada para el día a día familiar
- **Legibilidad ante todo** — usuarios de 35-60 años, uso diurno intensivo 8+ horas
- **Profundidad sin oscuridad** — sombras y bordes crean capas, no dark mode
- **Color como acento** — el color primario se reserva para CTAs, iconos activos y highlights. El resto es neutro
- **Densidad con respiro** — bento grid organiza información sin aglomerar
- **Motion con propósito** — GSAP anima con intención, nunca como decoración

---

## 🎨 Sistema de Color

### Tokens base (CSS Variables)

```css
/* ============================================
   Raíz compartida — fondo claro profesional
   ============================================ */
:root {
  /* Fondos en capas */
  --bg-base:      #F7F7F8;  /* fondo base — blanco cálido, no clínico */
  --bg-surface:   #FFFFFF;  /* superficies: tarjetas, modales, sidebar */
  --bg-elevated:  #F0F0F2;  /* hover de filas, secciones diferenciadas */
  --bg-subtle:    #EAEAEC;  /* inputs, chips, separadores */

  /* Tipografía */
  --text-primary:   #1A1A2E; /* casi negro — máximo contraste */
  --text-secondary: #52526B; /* gris azulado — datos secundarios */
  --text-muted:     #9090A8; /* placeholders, metadata */
  --text-disabled:  #C0C0D0; /* estados deshabilitados */

  /* Bordes */
  --border-subtle:  rgba(0, 0, 0, 0.05);
  --border-default: rgba(0, 0, 0, 0.09);
  --border-strong:  rgba(0, 0, 0, 0.16);

  /* Sombras — sistema de 3 niveles */
  --shadow-sm:
    0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:
    0 1px 3px rgba(0,0,0,0.06),
    0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg:
    0 2px 4px rgba(0,0,0,0.04),
    0 8px 32px rgba(0,0,0,0.10),
    0 24px 48px rgba(0,0,0,0.06);
  --shadow-focus:
    0 0 0 3px var(--color-primary-muted);

  /* Estados — diferenciados del color primario */
  --state-success:        #16A34A;
  --state-success-bg:     #F0FDF4;
  --state-success-border: #BBF7D0;
  --state-warning:        #D97706;
  --state-warning-bg:     #FFFBEB;
  --state-warning-border: #FDE68A;
  --state-error:          #DC2626; /* rojo SOLO para errores, nunca como marca */
  --state-error-bg:       #FEF2F2;
  --state-error-border:   #FECACA;
  --state-info:           #0284C7;
  --state-info-bg:        #F0F9FF;
  --state-info-border:    #BAE6FD;

  /* Radius — sistema Apple */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-2xl:  28px;
  --radius-full: 9999px;

  /* Espaciado base 4px */
  --space-1:  4px;  --space-2:  8px;   --space-3:  12px;
  --space-4:  16px; --space-5:  20px;  --space-6:  24px;
  --space-8:  32px; --space-10: 40px;  --space-12: 48px;
  --space-16: 64px;
}

/* ============================================
   TEMA ROJO — Tema A
   Personalidad: cálido, acogedor, hogareño
   ============================================ */
[data-theme="red"] {
  --color-primary:       #9B1D20;
  --color-primary-hover: #C42B2F;
  --color-primary-dark:  #6B1214;
  --color-primary-muted: rgba(155, 29, 32, 0.08);
  --color-primary-tint:  rgba(155, 29, 32, 0.04);
  --color-primary-text:  #FFFFFF;

  --gradient-primary: linear-gradient(135deg, #9B1D20 0%, #C42B2F 100%);
  --gradient-subtle:  linear-gradient(135deg, rgba(155,29,32,0.06) 0%, rgba(155,29,32,0.02) 100%);

  --accent-border:    rgba(155, 29, 32, 0.20);
  --accent-glow:      rgba(155, 29, 32, 0.10);
}

/* ============================================
   TEMA AZUL — Tema B
   Personalidad: fresco, ordenado, tranquilo
   ============================================ */
[data-theme="blue"] {
  --color-primary:       #1B3F6E;
  --color-primary-hover: #2557A0;
  --color-primary-dark:  #102440;
  --color-primary-muted: rgba(27, 63, 110, 0.08);
  --color-primary-tint:  rgba(27, 63, 110, 0.04);
  --color-primary-text:  #FFFFFF;

  --gradient-primary: linear-gradient(135deg, #1B3F6E 0%, #2557A0 100%);
  --gradient-subtle:  linear-gradient(135deg, rgba(27,63,110,0.06) 0%, rgba(27,63,110,0.02) 100%);

  --accent-border:    rgba(27, 63, 110, 0.20);
  --accent-glow:      rgba(27, 63, 110, 0.10);
}
```

---

## 🔤 Tipografía

```css
--font-display: "SF Pro Display", "Plus Jakarta Sans", system-ui, sans-serif;
--font-body:    "SF Pro Text",    "Plus Jakarta Sans", system-ui, sans-serif;
--font-mono:    "SF Mono", "JetBrains Mono", monospace;

--text-xs:   0.75rem;   /* 12px */   --text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px */   --text-lg:   1.125rem;  /* 18px */
--text-xl:   1.25rem;   /* 20px */   --text-2xl:  1.5rem;    /* 24px */
--text-3xl:  1.875rem;  /* 30px */   --text-4xl:  2.25rem;   /* 36px */
--text-5xl:  3rem;      /* 48px */

--font-regular: 400;  --font-medium: 500;
--font-semibold: 600; --font-bold: 700;

--leading-tight: 1.25;  --leading-snug: 1.375;
--leading-normal: 1.5;  --leading-relaxed: 1.625;
```

---

## 🪟 Frosted Card System

> ⚠️ Glassmorphism (`backdrop-filter: blur`) fue diseñado para fondos oscuros.
> Sobre fondo blanco produce tarjetas grises y sucias sin profundidad real.
> Usamos **Frosted Cards**: capas definidas con sombras, bordes y tints sutiles.

### Capa 1 — Card Base
```css
.card {
  background:    var(--bg-surface);
  border:        1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow:    var(--shadow-md);
}
/* Hover: gestionado por GsapAnimationsService.addCardHover() */
```

### Capa 2 — Card Accent (elemento ancla del bento)
```css
.card-accent {
  background:  var(--bg-surface);
  border:      1px solid var(--accent-border);
  border-top:  3px solid var(--color-primary); /* firma visual del tema */
  border-radius: var(--radius-xl);
  box-shadow:
    var(--shadow-md),
    0 0 0 1px var(--accent-border) inset;
}
```

### Capa 3 — Card Tinted (KPIs, stats, highlights)
```css
.card-tinted {
  background: color-mix(in srgb, var(--color-primary) 4%, white);
  border:     1px solid var(--accent-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}
```

### Capa 4 — Panel / Sidebar
```css
.panel {
  background:   var(--bg-surface);
  border-right: 1px solid var(--border-default);
  box-shadow:   var(--shadow-lg);
}
```

---

## 🔲 Bento Grid

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: 140px;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--bg-base);
}

.bento-1x1  { grid-column: span 3; }
.bento-2x1  { grid-column: span 6; }
.bento-3x1  { grid-column: span 9; }
.bento-4x1  { grid-column: span 12; }
.bento-2x2  { grid-column: span 6;  grid-row: span 2; }
.bento-3x2  { grid-column: span 9;  grid-row: span 2; }
.bento-hero { grid-column: span 12; grid-row: span 2; }
```

**Reglas de composición:**
- 1 elemento ancla por sección (`bento-hero` o `bento-4x1`) siempre con `.card-accent`
- Fila de KPIs: 4 × `bento-1x1` con `.card-tinted`
- `.card-accent` máximo 1 por sección
- Color primario visible máximo 2-3 veces por pantalla

---

## 🧱 Componentes

### Botón Primario
```css
.btn-primary {
  background:    var(--gradient-primary);
  color:         var(--color-primary-text);
  border-radius: var(--radius-full);
  padding:       var(--space-3) var(--space-6);
  font-size:     var(--text-sm);
  font-weight:   var(--font-semibold);
  border:        none;
  box-shadow:    0 2px 8px var(--accent-glow);
}
```

### Botón Secundario
```css
.btn-secondary {
  background:    transparent;
  color:         var(--color-primary);
  border:        1.5px solid var(--color-primary);
  border-radius: var(--radius-full);
  padding:       var(--space-3) var(--space-6);
  font-weight:   var(--font-semibold);
}
```

### Input
```css
.input {
  background:  var(--bg-surface);
  border:      1.5px solid var(--border-default);
  border-radius: var(--radius-md);
  padding:     var(--space-3) var(--space-4);
  font-size:   var(--text-sm);
  color:       var(--text-primary);
}
.input:focus {
  border-color: var(--color-primary);
  box-shadow:   var(--shadow-focus);
  outline:      none;
}
```

---

## 🎬 Motion — GSAP

> No usar `@angular/animations` ni `@keyframes` en componentes.
> Todo motion usa `GsapAnimationsService`.

| Acción | Método | Ease |
|--------|--------|------|
| Entrada bento | `animateBentoGrid(el)` | `power3.out` stagger |
| Hero card | `animateHero(el)` | `expo.out` |
| KPI counter | `animateCounter(el, value)` | `power2.out` |
| Hover card | `addCardHover(el)` | `power2.out/inOut` |
| Hover botón | `addButtonHover(el)` | `power2.out` |
| Cambio de tema | `animateThemeChange(fn)` | fade |
| Ruta entrada | `animatePageEnter(el)` | `power3.out` |
| Ruta salida | `animatePageLeave(el, fn)` | `power2.in` |

**El único CSS de transición permitido:**
```css
/* Solo texto plano — nada más */
* { transition: color 0.18s ease; }
```

---

## 📐 Reglas Do / Don't

### ✅ DO
- Siempre variables CSS — ningún color hardcodeado
- `--state-error` (`#DC2626`) **exclusivamente** para errores de validación
- `--bg-base` (`#F7F7F8`) como fondo de página siempre
- `.card-accent` solo en el elemento ancla de cada sección
- Mínimo WCAG AA (ratio 4.5:1) en todo texto
- Color primario máximo 2-3 apariciones por vista

### ❌ DON'T
- No usar `--color-primary` del tema rojo en mensajes de error — confusión semántica crítica
- No usar `#FFFFFF` puro como fondo de página
- No usar fondos oscuros en ninguna vista
- No usar `backdrop-filter: blur()` — no funciona sobre fondos claros
- No hardcodear ningún color
- No saturar pantallas con el color primario
- No usar `border-radius` menor a `--radius-sm` (6px)

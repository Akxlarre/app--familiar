# Autoescuela Chillán - Sistema de Gestión

Frontend Angular 20 + Supabase.

## 🎨 Sistema de Diseño

El proyecto utiliza un sistema de diseño personalizado con soporte para **doble tema** (Escuela A / Escuela B) y layouts tipo **Bento Grid**.

### Temas
El sistema soporta dos temas principales gestionados por `ThemeService`:
- **Escuela A (`red`)**: Tema institucional, color primario `#9B1D20`.
- **Escuela B (`blue`)**: Tema secundario, color primario `#1B3F6E`.

El tema se persiste automáticamente en `localStorage`.

### Componentes Clave
- **FeatureCard**: Tarjeta base para el layout. Soporta variantes `accent` (borde superior) y `tinted` (fondo sutil).
- **KpiCard**: Tarjeta especializada para métricas con contadores animados por GSAP.
- **Bento Grid**: Sistema de grilla CSS de 12 columnas. Clases: `.bento-grid`, `.bento-1x1`, `.bento-2x1`, `.bento-hero`.

### Animaciones
Todas las animaciones están centralizadas en `GsapAnimationsService`.
- **NO USAR**: `@angular/animations` ni `transition` CSS complejos.
- **USAR**: `this.gsap.animate...()` en `ngAfterViewInit`.

### Desarrollo
Los estilos globales usan **Tailwind v4** mapeado a variables CSS personalizadas (`src/styles/tokens/_variables.scss`).
Los componentes de **PrimeNG** están sobrescritos globalmente en `src/styles/vendors/_primeng-overrides.scss` para coincidir con el sistema de diseño.
# App Familiar - Gestión del Hogar

Aplicación familiar para gestionar inventario, recetas, comidas y organización del hogar.

Frontend Angular 20 + Supabase.

## 🎯 Propósito

- **Inventario**: Control de productos y existencias del hogar
- **Recetas**: Base de recetas y planificación de comidas
- **Comidas**: Planificación semanal y menús
- **Gestión familiar**: Organización y tareas del hogar

## 🎨 Sistema de Diseño

El proyecto utiliza un sistema de diseño personalizado con soporte para **doble tema** (Tema A / Tema B) y layouts tipo **Bento Grid**.

### Temas
El sistema soporta dos temas principales gestionados por `ThemeService`:
- **Tema A (`red`)**: Cálido, acogedor. Color primario `#9B1D20`.
- **Tema B (`blue`)**: Fresco, ordenado. Color primario `#1B3F6E`.

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

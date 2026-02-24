# App Familiar – Gestión del hogar

Aplicación web para la gestión integral del hogar: inventario, recetas, planificación de comidas y organización familiar, pensada para uso diario por una misma familia.

Frontend desarrollado con **Angular 20**, **Supabase** como backend-as-a-service y un **sistema de diseño propio** basado en Tailwind v4 + PrimeNG.

---

## 🎯 Objetivos del proyecto

- **Inventario del hogar**: Control de productos, existencias y alertas de reposición.
- **Recetas**: Biblioteca centralizada de recetas con ingredientes vinculados al inventario.
- **Planificación de comidas**: Menús semanales y planificación de comidas por día.
- **Gestión familiar**: Apoyo a la organización del hogar y reparto de tareas.

---

## 🧱 Stack tecnológico

- **Framework**: Angular 20 (`@angular/core`, `@angular/router`, `@angular/forms`).
- **Backend / Datos**: `@supabase/supabase-js`.
- **UI Library**: PrimeNG + PrimeIcons.
- **Estilos**: Tailwind CSS v4 + variables CSS personalizadas.
- **Gráficos / KPIs**: `ngx-charts`, componentes propios como `KpiCard`.
- **Animaciones**: GSAP (`gsap`) centralizado en servicios.

---

## 🚀 Puesta en marcha (desarrollo)

### Requisitos previos

- Node.js (versión LTS recomendada).
- npm (instalado con Node).

### Instalación de dependencias

En la carpeta `app`:

```bash
npm install
```

### Servidor de desarrollo

```bash
npm start
```

Esto ejecuta `ng serve` y expone la aplicación (por defecto en `http://localhost:4200`).

### Otros scripts útiles

- **Build producción**:

  ```bash
  npm run build
  ```

- **Tests unitarios**:

  ```bash
  npm test
  ```

- **Verificación de design tokens**:

  ```bash
  npm run check:design-tokens
  npm run check:design-tokens:all
  ```

---

## 🎨 Sistema de diseño

El proyecto utiliza un sistema de diseño personalizado con soporte para **doble tema** (Tema A / Tema B) y layouts tipo **Bento Grid**.

### Temas

El sistema soporta dos temas principales gestionados por `ThemeService`:

- **Tema A (`red`)**: Cálido y acogedor. Color primario `#9B1D20`.
- **Tema B (`blue`)**: Fresco y ordenado. Color primario `#1B3F6E`.

El tema seleccionado se persiste automáticamente en `localStorage` para mantener la preferencia entre sesiones.

### Componentes clave de UI

- **`FeatureCard`**: Tarjeta base para el layout. Soporta variantes `accent` (borde superior) y `tinted` (fondo sutil).
- **`KpiCard`**: Tarjeta especializada para métricas, con contadores animados mediante GSAP.
- **Bento Grid**: Sistema de grilla CSS de 12 columnas con utilidades:
  - `.bento-grid`
  - `.bento-1x1`
  - `.bento-2x1`
  - `.bento-hero`

### Animaciones

Todas las animaciones están centralizadas en `GsapAnimationsService`:

- **No usar**: `@angular/animations` ni `transition` CSS complejos para nuevas animaciones.
- **Usar**: Métodos `this.gsap.animate...()` en `ngAfterViewInit` o hooks equivalentes.

---

## 🎯 Guías de desarrollo de estilos

- Los estilos globales usan **Tailwind v4** mapeado a variables CSS personalizadas en `src/styles/tokens/_variables.scss`.
- Los componentes de **PrimeNG** se sobrescriben globalmente en `src/styles/vendors/_primeng-overrides.scss` para alinearlos con el sistema de diseño.

Al añadir nuevos componentes, se recomienda:

- Reutilizar tokens existentes antes de introducir nuevos.
- Validar cambios en design tokens con los scripts `check:design-tokens`.
- Mantener la coherencia con los patrones de `FeatureCard`, `KpiCard` y la grilla Bento.


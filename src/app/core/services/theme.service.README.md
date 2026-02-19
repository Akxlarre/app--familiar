# ThemeService

## Propósito

Gestión del tema dual (rojo/azul) por escuela. Actualiza `data-theme` en el DOM y persiste en localStorage. Usa `GsapAnimationsService` para transición suave al cambiar.

## API pública

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `theme` | `Signal<'red' \| 'blue'>` | Tema activo |
| `setTheme(newTheme, animate?)` | `void` | Cambia tema (animate default: true) |
| `getThemeDisplayName(theme?)` | `string` | "Escuela A" o "Escuela B" para UI |

## Uso

```typescript
readonly themeService = inject(ThemeService);
readonly theme = this.themeService.theme;

// Cambiar tema
this.themeService.setTheme('blue');
```

## Cuándo usarlo

- Selector de tema/escuela en el topbar
- Componentes que reaccionan al tema (colores, iconos)
- Normalmente orquestado por `SchoolService` al cambiar de escuela

## Cuándo no usarlo

- Para cambiar de escuela → `SchoolService` (que llama a ThemeService)
- Para tokens de diseño → usar variables CSS que dependen de `data-theme`

## Dependencias

- `GsapAnimationsService` (para `animateThemeChange`)
- `PLATFORM_ID` (SSR-safe)

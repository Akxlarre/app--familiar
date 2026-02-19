# Page Transitions — UX Premium

## Configuración

- **View Transitions API**: `withViewTransitions()` en `provideRouter`
- **Scroll restoration**: `withInMemoryScrolling({ scrollPositionRestoration: 'top' })`
- **Estilos**: `src/styles/motion/_view-transitions.scss`
- **Ámbito**: Solo el `<main class="main-content">` anima; topbar y sidebar permanecen estáticos (`view-transition-name: main-content`)

## Tokens de duración

En `_variables.scss`:

| Token | Valor | Uso |
|-------|-------|-----|
| `--duration-instant` | 100ms | Feedback inmediato |
| `--duration-fast` | 200ms | Micro-interacciones |
| `--duration-normal` | 300ms | Transiciones de página |
| `--duration-slow` | 450ms | Modales, overlays |
| `--duration-page-out` | 220ms | Salida de página |
| `--duration-page-in` | 320ms | Entrada de página |

## Principios UX

- **Variante híbrido premium**: salida rápida (180ms, -6px), entrada suave (280ms, +8px)
- **Asimetría**: salida más corta que entrada; desplazamiento menor al salir, mayor al entrar
- **prefers-reduced-motion**: animaciones desactivadas cuando el usuario lo indica

## GSAP (fallback / uso manual)

`GsapAnimationsService.animatePageEnter()` y `animatePageLeave()` usan los mismos valores para consistencia cuando se invocan manualmente (ej. directivas personalizadas).

## Referencias

- [View Transitions API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Angular withViewTransitions](https://angular.dev/api/router/withViewTransitions)
- NN/G: Animation duration 250-350ms para transiciones de página

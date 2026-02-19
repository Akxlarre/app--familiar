# Motion Rule

## Regla crítica
Usar **SIEMPRE** `GsapAnimationsService` para animaciones. **NUNCA** `@angular/animations` ni CSS `@keyframes`.

## Consultar
- `docs/ANIMATIONS.md` — API completa y cuándo usar cada método
- `src/app/core/services/gsap-animations.service.ts`

## Ejemplos
- Entrada bento-grid → `animateBentoGrid(container)`
- Panel/dropdown → `animatePanelIn()` / `animatePanelOut()`
- Cards hover → `addCardHover(el)` en ngAfterViewInit
- Botones feedback → `[appPressFeedback]` (usa el servicio internamente)

## Respeta
- `prefers-reduced-motion` — el servicio ya lo comprueba
- No usar plugin GSAP Flip — conflicto casing Windows. Ver `docs/GSAP-FLIP-CASING-ISSUE.md`

# GSAP Flip - Conflicto de casing en Windows

## Problema

Al importar el plugin Flip de GSAP con `import { Flip } from 'gsap/Flip'`, el build falla con:

```
TS1149: File name '.../gsap/types/Flip.d.ts' differs from already included file name 
'.../gsap/types/flip.d.ts' only in casing.
```

## Causa raíz

1. **Archivo de tipos**: El paquete GSAP tiene el archivo `flip.d.ts` (minúscula) en `node_modules/gsap/types/`.

2. **Referencia en index**: El `index.d.ts` de GSAP incluye:
   ```ts
   /// <reference path="flip.d.ts"/>
   ```
   (ruta en minúscula)

3. **Export del paquete**: En `package.json`, el export `"./*"` resuelve a `"./types/*.d.ts"`. Al importar `gsap/Flip`, el `*` se interpreta como `Flip` (mayúscula), generando la ruta `./types/Flip.d.ts`.

4. **Windows case-insensitive**: En Windows el sistema de archivos no distingue mayúsculas/minúsculas, pero TypeScript sí. Acaba tratando `flip.d.ts` y `Flip.d.ts` como rutas distintas aunque apunten al mismo archivo.

## Soluciones intentadas

| Intento | Resultado |
|---------|-----------|
| `import { Flip } from 'gsap/Flip'` | Error TS1149 (casing) |
| `import { Flip } from 'gsap/flip'` | Error: flip.d.ts no es un módulo |
| `@ts-expect-error` | Error: directiva no usada (en algunos entornos) |
| `import()` dinámico | Plugin registrado de forma asíncrona, no usable de forma síncrona |

## Workaround actual

Se usa una animación manual con `getBoundingClientRect()` + `gsap.fromTo()` para simular el efecto Flip en `animatePanelToDrawer()` y en `animateBentoLayoutChange()`.

## Bento Grid Layout Change

`GsapAnimationsService.animateBentoLayoutChange()` aplica FLIP manual al bento-grid:
- Captura posiciones y tamaños de celdas
- Ejecuta el callback (cambio de layout)
- Anima posición (translate) y tamaño (height/width) de cada celda

La directiva `appBentoGridLayout` en el contenedor bento-grid proporciona `BENTO_GRID_LAYOUT_CONTEXT` para que los hijos puedan disparar la animación con `runLayoutChange(callback)`.

## Posibles soluciones futuras

1. **Actualizar GSAP**: Comprobar si versiones nuevas corrigen el casing en los exports.
2. **Reportar a GSAP**: Abrir issue para que usen `flip.d.ts` de forma consistente en exports y referencias.
3. **Usar `gsap/all`**: `import { Flip } from 'gsap/all'` podría evitar el conflicto (incluye todo el bundle).
4. **Entorno Linux/macOS**: En sistemas case-sensitive el problema puede no reproducirse.

# Agent System Blueprint

> Documento semilla para replicar este sistema de reglas y documentación en cualquier proyecto nuevo.
> Entregar este documento al modelo/agente al inicio del proyecto para que construya la estructura completa.

---

## 1. Filosofía del Sistema

Este sistema existe para resolver un problema fundamental: **los agentes de IA no tienen memoria persistente entre sesiones**. Cada conversación empieza de cero. Sin contexto escrito, el agente reinventa decisiones, duplica código, contradice patrones, y rompe convenciones que ya se establecieron.

La solución es un sistema de **reglas + documentación viva** que actúa como la memoria institucional del proyecto. El agente no necesita recordar — necesita saber dónde leer.

### Principios base

1. **Escribir > Recordar** — Toda decisión técnica, patrón o convención se documenta. Si no está escrito, no existe.
2. **Descubrir antes de crear** — El agente SIEMPRE busca si algo ya existe antes de crear algo nuevo.
3. **Documentar al crear** — Crear un componente/servicio/directiva sin documentarlo es como no haberlo creado.
4. **Reglas en capas** — Algunas reglas son universales (always-on), otras se activan solo cuando el agente toca archivos relevantes.
5. **El proyecto se autodescribe** — Un agente nuevo debería poder entender todo el proyecto leyendo las reglas y los índices, sin necesidad de explorar el código.

---

## 2. Arquitectura del Sistema

El sistema tiene **5 capas**, de más abstracta a más concreta:

```
┌─────────────────────────────────────────────────┐
│  CAPA 1: VISIÓN DE PRODUCTO                     │
│  ¿Por qué existe? ¿Para quién? ¿Qué principios │
│  guían las decisiones?                          │
│  → docs/PRODUCT-VISION.md                       │
├─────────────────────────────────────────────────┤
│  CAPA 2: REQUERIMIENTOS Y MODELO DE DATOS       │
│  ¿Qué se construye? ¿Con qué estructura?       │
│  → docs/Requerimientos_v1.md                    │
│  → docs/MODELO-DATOS-v1.md                      │
├─────────────────────────────────────────────────┤
│  CAPA 3: DESIGN SYSTEM Y PATRONES VISUALES      │
│  ¿Cómo se ve? ¿Qué tokens? ¿Qué componentes?  │
│  → skill: design-system                         │
│  → docs/BRAND_GUIDELINES.md                     │
│  → docs/ANIMATIONS.md                           │
├─────────────────────────────────────────────────┤
│  CAPA 4: REGLAS DE AGENTE                        │
│  ¿Cómo trabaja el agente? ¿Qué debe hacer      │
│  antes/durante/después de implementar?          │
│  → .cursor/rules/*.mdc                          │
├─────────────────────────────────────────────────┤
│  CAPA 5: ÍNDICES Y DOCUMENTACIÓN VIVA           │
│  ¿Qué existe ya? ¿Dónde está? ¿Cómo se usa?   │
│  → COMPONENTS.md, SERVICES.md, DIRECTIVES.md    │
│  → README.md por componente/servicio/directiva  │
│  → supabase/migrations/REGISTRY.md              │
└─────────────────────────────────────────────────┘
```

---

## 3. Capa 1 — Visión de Producto

### Propósito
Darle al agente una brújula para decisiones ambiguas de UX, tono, prioridad y alcance. Sin esto, el agente toma decisiones genéricas.

### Documento
`docs/PRODUCT-VISION.md`

### Contenido mínimo
- El problema que resuelve el producto
- Para quién es (usuarios, nivel técnico, contexto de uso)
- Cómo debe sentirse usarlo (emoción central)
- Personalidad/tono de la app
- Principios de producto (reglas de decisión ante ambigüedad)
- Anti-goals (qué NO es el producto)
- Definición de éxito medible
- Visión a futuro

### Regla asociada
`product-vision.mdc` — `alwaysApply: true`. Resume los principios inline y apunta al documento completo. Le dice al agente: "antes de decidir tono, UX o prioridad, lee la visión".

---

## 4. Capa 2 — Requerimientos y Modelo de Datos

### Propósito
Ser la fuente de verdad técnica: qué módulos existen, qué hace cada uno, qué tablas hay, cómo se relacionan, y en qué orden se implementan.

### Documentos
- `docs/Requerimientos_v1.md` — Módulos, funcionalidades, arquitectura, plan de fases, historial de cambios.
- `docs/MODELO-DATOS-v1.md` — Tablas, columnas, relaciones, RLS, Realtime.

### Reglas asociadas

| Regla | Tipo | Propósito |
|-------|------|-----------|
| `requirements-and-documentation.mdc` | `alwaysApply` | Fuentes de verdad, workflow obligatorio, checklist de cierre |
| `data-model.mdc` | Por glob (`*.service.ts`, `*.sql`) | Convenciones SQL, naming, servicios Supabase |
| `supabase-migrations.mdc` | Por glob (`*.sql`) | Sistema completo de migraciones: naming, workflow, registry, seguridad |

### Patrón: Documentación obligatoria de cambios
Toda implementación o cambio significativo se registra en el historial del documento de requerimientos. Formato:

```markdown
| Fecha | Cambio | Módulo |
|-------|--------|--------|
| YYYY-MM-DD | Descripción | módulo |
```

### Patrón: Registry de migraciones
Las migraciones SQL tienen su propio índice (`supabase/migrations/REGISTRY.md`) con estado actual por dominio. Workflow: leer registry → crear SQL → actualizar registry → actualizar modelo de datos.

### Patrón: Edge Functions de Supabase
Las Edge Functions tienen su propio índice (`supabase/functions/FUNCTIONS.md`) y una guía de despliegue (`docs/EDGE-FUNCTIONS-SUPABASE.md`). Siguen el mismo patrón discovery + documentation que componentes/servicios/directivas.

| Regla | Tipo | Propósito |
|-------|------|-----------|
| `edge-function-discovery.mdc` | Por glob (`supabase/functions/**`) | "Busca en FUNCTIONS.md primero" |
| `edge-function-documentation.mdc` | `alwaysApply` | Actualizar FUNCTIONS.md + header en index.ts al crear/modificar |

---

## 5. Capa 3 — Design System y Patrones Visuales

### Propósito
Garantizar consistencia visual absoluta. Un agente nuevo que nunca vio el proyecto debe producir UI idéntica al estilo establecido, sin necesidad de ver screenshots.

### Documentos
- `docs/BRAND_GUIDELINES.md` — Identidad visual, tipografía, colores, restricciones.
- `docs/ANIMATIONS.md` — API del servicio de animaciones y cuándo usar cada método.
- `docs/SKELETON-ARCHITECTURE.md` — Convenciones de loading states.
- `docs/PAGE-TRANSITIONS.md` — Transiciones entre rutas.

### Skill
El design system completo vive como **skill** (`.cursor/skills/{nombre}/SKILL.md`). Incluye:
- Stack técnico
- Reglas absolutas (colores, fondos, change detection)
- Plantillas de componentes con código completo
- Patrones de layout (bento grid)
- Servicio de animaciones con todos los métodos
- Checklist de entrega

### Reglas asociadas

| Regla | Tipo | Propósito |
|-------|------|-----------|
| `design-system-enforcement.mdc` | `alwaysApply` | Clases prohibidas vs correctas, semántica de colores |
| `design-system-components.mdc` | Por glob (`*.component.ts`, `*.html`) | Tokens en templates, cards, KPIs |
| `bento-grid-patterns.mdc` | Por glob (`*.component.ts`, `*.html`, `*.scss`) | Sistema grid 12 columnas, sizing, composición |
| `bento-layout.mdc` | Por glob (`*.component.ts`, `*.html`) | Directiva appBentoGridLayout |
| `motion.mdc` | Por glob (`*.component.ts`, `*.ts`) | GSAP obligatorio, nunca @angular/animations |
| `interactive-feedback.mdc` | Por glob (`*.component.ts`, `*.html`) | appPressFeedback, addCardHover |
| `skeleton-requirement.mdc` | Por glob (`shared/components/**`) | Cuándo crear skeletons, convenciones |
| `primeng-priority.mdc` | Por glob (`*.component.ts`, `*.html`) | Jerarquía: shared → PrimeNG → custom |

### Patrón: Enforcement por prohibición
Las reglas de design system no solo dicen qué usar — listan explícitamente qué está **prohibido** y su alternativa correcta. Esto evita que el agente use valores arbitrarios.

---

## 6. Capa 4 — Reglas del Agente

### Tipos de reglas

El sistema usa dos tipos de reglas con propósitos distintos:

| Tipo | Campo | Cuándo se activa | Uso |
|------|-------|-------------------|-----|
| **Always-on** | `alwaysApply: true` | Siempre, en toda conversación | Reglas universales que el agente nunca debe olvidar |
| **Por glob** | `globs: "**/*.ext"` | Solo cuando el agente toca archivos que coinciden | Reglas especializadas que solo aplican en contexto |

### Reglas always-on (universales)

Estas reglas están activas siempre. Son pocas pero críticas:

1. `product-vision.mdc` — Brújula del producto
2. `requirements-and-documentation.mdc` — Fuentes de verdad y documentación obligatoria
3. `design-system-enforcement.mdc` — Prohibiciones visuales
4. `component-documentation.mdc` — Documentar al crear componentes
5. `services-documentation.mdc` — Documentar al crear servicios
6. `directives-documentation.mdc` — Documentar al crear directivas
7. `edge-function-documentation.mdc` — Documentar al crear/modificar Edge Functions
8. `documentation-impact.mdc` — Revisión proactiva de docs afectados tras cualquier cambio
9. `sync-agents.mdc` — Mantener sincronizados los formatos de reglas

### Reglas por glob (contextuales)

Se activan solo cuando el agente trabaja con archivos relevantes:

- `*.component.ts`, `*.html` → design system, bento, motion, feedback, primeng
- `*.service.ts` → data model, service discovery
- `*.directive.ts` → directive discovery
- `*.sql` → supabase migrations, data model
- `supabase/functions/**` → edge function discovery
- `shared/components/**` → skeleton requirement

### Patrón: Reglas pareadas (Discovery + Documentation)

Para cada tipo de artefacto (componentes, servicios, directivas, edge functions) existen dos reglas complementarias:

| Acción | Regla | Tipo | Qué hace |
|--------|-------|------|----------|
| **Antes de crear** | `{tipo}-discovery.mdc` | Por glob | "Busca primero en {INDICE}.md si ya existe" |
| **Al crear** | `{tipo}-documentation.mdc` | Always-on | "Documenta lo que creaste en {INDICE}.md + README" |

Este par garantiza: no duplicar → y si creas, documenta.

---

## 7. Capa 5 — Índices y Documentación Viva

### Propósito
Los índices son la respuesta a "¿qué existe ya?". Sin ellos, el agente tiene que explorar el código para descubrir qué hay — lo cual es lento, incompleto y propenso a duplicación.

### Estructura

```
src/app/
├── shared/components/
│   ├── COMPONENTS.md              ← Índice de todos los componentes
│   ├── kpi-card/
│   │   ├── kpi-card.component.ts
│   │   ├── kpi-card-skeleton.component.ts
│   │   ├── README.md              ← Docs del componente
│   │   └── index.ts               ← Barrel export
│   └── feature-card/
│       ├── ...
│       └── README.md
├── core/
│   ├── services/
│   │   ├── SERVICES.md            ← Índice de todos los servicios
│   │   ├── gsap-animations.service.ts
│   │   └── gsap-animations.README.md
│   └── directives/
│       ├── DIRECTIVES.md          ← Índice de todas las directivas
│       └── bento-grid-layout.README.md
supabase/
├── functions/
│   ├── FUNCTIONS.md               ← Índice de todas las Edge Functions
│   ├── gmail-oauth/
│   │   └── index.ts
│   ├── process-bank-emails/
│   │   └── index.ts
│   └── ocr-receipt/
│       └── index.ts
├── migrations/
│   └── REGISTRY.md                ← Índice de migraciones por dominio
```

### Formato de índice

Cada `{TIPO}.md` es una tabla simple:

```markdown
# Componentes Compartidos

| Selector | Descripción | Docs |
|----------|-------------|------|
| `app-kpi-card` | Card para KPIs con counter animado | [README](kpi-card/README.md) |
| `app-feature-card` | Card genérica para contenido | [README](feature-card/README.md) |
```

### Formato de README por artefacto

Cada componente/servicio/directiva tiene un README con:

1. **Propósito** — Qué hace y por qué existe
2. **API** — Inputs/outputs, métodos públicos, signals
3. **Cuándo usarlo** — Casos de uso
4. **Cuándo NO usarlo** — Alternativas
5. **Ejemplo mínimo** — Código copy-paste funcional
6. **Dependencias** — De qué otros artefactos depende

---

## 8. Sistema de Sincronización

### Problema
Cursor usa `.cursor/rules/` y `.cursor/skills/`, pero otros agentes (Codex, Windsurf, etc.) usan `.agent/` o `.agents/`. El conocimiento debe existir en todos los formatos.

### Regla
`sync-agents.mdc` — `alwaysApply: true`. Cuando se crea o modifica una regla/skill, se refleja en todas las ubicaciones:

```
.cursor/skills/  ↔  .agent/skills/  ↔  .agents/skills/
.cursor/rules/   ↔  .agent/rules/
```

### Adaptación por proyecto
Si el proyecto solo usa Cursor, esta regla no es necesaria. Si se trabaja con múltiples agentes, mantener la sincronización.

---

## 9. Mapa Completo de Reglas

### Vista de dependencias

```
product-vision.mdc (always)
  └── docs/PRODUCT-VISION.md

requirements-and-documentation.mdc (always)
  ├── docs/PRODUCT-VISION.md
  ├── docs/Requerimientos_v1.md
  └── docs/MODELO-DATOS-v1.md

design-system-enforcement.mdc (always)
  └── skill: design-system → SKILL.md
      ├── docs/BRAND_GUIDELINES.md
      └── docs/ANIMATIONS.md

design-system-components.mdc (glob: *.component.ts, *.html)
  └── skill: design-system

bento-grid-patterns.mdc (glob: *.component.ts, *.html, *.scss)
  └── skill: design-system

bento-layout.mdc (glob: *.component.ts, *.html)
  └── directiva: appBentoGridLayout

motion.mdc (glob: *.component.ts, *.ts)
  ├── docs/ANIMATIONS.md
  └── GsapAnimationsService

interactive-feedback.mdc (glob: *.component.ts, *.html)
  ├── directiva: appPressFeedback
  └── GsapAnimationsService

skeleton-requirement.mdc (glob: shared/components/**)
  └── docs/SKELETON-ARCHITECTURE.md

primeng-priority.mdc (glob: *.component.ts, *.html)
  └── COMPONENTS.md

component-discovery.mdc (glob: *.component.ts, *.html)
  └── COMPONENTS.md

component-documentation.mdc (always)
  ├── COMPONENTS.md
  └── docs/SKELETON-ARCHITECTURE.md

service-discovery.mdc (glob: *.service.ts)
  └── SERVICES.md

services-documentation.mdc (always)
  └── SERVICES.md

directive-discovery.mdc (glob: *.directive.ts)
  └── DIRECTIVES.md

directives-documentation.mdc (always)
  └── DIRECTIVES.md

data-model.mdc (glob: *.service.ts, *.sql, MODELO-DATOS*)
  ├── docs/MODELO-DATOS-v1.md
  └── supabase-migrations.mdc

supabase-migrations.mdc (glob: migrations/*.sql)
  ├── supabase/migrations/REGISTRY.md
  └── docs/MODELO-DATOS-v1.md

edge-function-discovery.mdc (glob: supabase/functions/**)
  └── FUNCTIONS.md

edge-function-documentation.mdc (always)
  ├── FUNCTIONS.md
  └── docs/EDGE-FUNCTIONS-SUPABASE.md

documentation-impact.mdc (always)
  └── Mapa de documentación en .cursorrules
      ├── docs/*.md
      ├── COMPONENTS.md, SERVICES.md, DIRECTIVES.md
      ├── REGISTRY.md
      └── READMEs de artefactos

sync-agents.mdc (always)
  └── .cursor/ ↔ .agent/ ↔ .agents/
```

---

## 10. Guía de Replicación — Cómo Usar Esta Semilla

### Paso 1: Crear la visión de producto

Antes de escribir código, crear `docs/PRODUCT-VISION.md` con la identidad del producto. Usar la entrevista estructurada:

1. ¿Cuál es el problema real?
2. ¿Para quién es?
3. ¿Cómo debe sentirse usarlo?
4. ¿Qué principios guían las decisiones?
5. ¿Qué NO es?
6. ¿Cómo se mide el éxito?

### Paso 2: Crear los documentos de requerimientos

- `docs/Requerimientos_v1.md` — Módulos, features, stack, plan de fases
- `docs/MODELO-DATOS-v1.md` — Esquema de base de datos (si aplica)

### Paso 3: Crear las reglas always-on (mínimo viable)

Estas 4 reglas son el núcleo que todo proyecto necesita:

```
.cursor/rules/
├── product-vision.mdc          ← Brújula del producto
├── requirements-and-documentation.mdc  ← Fuentes de verdad
├── component-documentation.mdc ← Documenta al crear
├── services-documentation.mdc  ← Documenta al crear
└── documentation-impact.mdc    ← Verificación de cierre: ¿qué docs se afectaron?
```

### Paso 4: Crear los índices vacíos

```
src/app/shared/components/COMPONENTS.md   ← Tabla vacía lista para llenar
src/app/core/services/SERVICES.md         ← Tabla vacía lista para llenar
src/app/core/directives/DIRECTIVES.md     ← Tabla vacía lista para llenar
```

### Paso 5: Crear reglas de discovery

```
.cursor/rules/
├── component-discovery.mdc     ← "Busca en COMPONENTS.md primero"
├── service-discovery.mdc       ← "Busca en SERVICES.md primero"
└── directive-discovery.mdc     ← "Busca en DIRECTIVES.md primero"
```

### Paso 6: Añadir capas según el proyecto necesite

| Si el proyecto tiene... | Añadir reglas de... |
|------------------------|---------------------|
| Design system / tokens CSS | `design-system-enforcement.mdc` + skill |
| Dashboard / grids | `bento-grid-patterns.mdc`, `bento-layout.mdc` |
| Animaciones | `motion.mdc`, `interactive-feedback.mdc` |
| Loading states | `skeleton-requirement.mdc` |
| Librería de UI (PrimeNG, Material, etc.) | `{libreria}-priority.mdc` |
| Base de datos con migraciones | `data-model.mdc`, `supabase-migrations.mdc` |
| Múltiples agentes (Cursor + Codex, etc.) | `sync-agents.mdc` |

### Paso 7: Iterar

El sistema crece orgánicamente. Cuando el agente cometa un error dos veces, crear una regla que lo prevenga. Cuando se cree un patrón que debe repetirse, documentarlo.

---

## 11. Plantillas de Reglas

### Plantilla: Regla always-on

```markdown
---
description: [Descripción corta de qué hace la regla]
alwaysApply: true
---

# [Nombre de la Regla]

## Regla principal
[Lo que el agente DEBE hacer siempre]

## Fuentes de verdad
- `docs/[DOCUMENTO].md`

## Checklist
- [ ] [Verificación 1]
- [ ] [Verificación 2]
```

### Plantilla: Regla por glob

```markdown
---
description: [Descripción corta]
globs: "**/*.extension"
alwaysApply: false
---

# [Nombre de la Regla]

## Activar cuando
[Contexto en el que aplica]

## Reglas
[Lo que el agente debe hacer]

## Referencia
[Documentos o skills relacionados]
```

### Plantilla: Discovery

```markdown
---
description: Antes de crear [tipo] — buscar en [INDICE].md
globs: "**/*.[extension]"
alwaysApply: false
---

# [Tipo] Discovery

Antes de crear un [tipo] nuevo:

1. **Consultar** `[ruta/INDICE.md]`
2. **Verificar** si existe uno que cubra el caso
3. **Leer** su README si existe
4. **Solo crear** cuando no exista alternativa
```

### Plantilla: Documentation

```markdown
---
description: Documentación obligatoria al crear [tipo]
alwaysApply: true
---

# Documentación de [tipo]

## Regla obligatoria

Al crear un nuevo [tipo]:

1. **Crear README** con: propósito, API, cuándo usarlo, ejemplo
2. **Actualizar [INDICE].md** — Añadir la fila correspondiente
```

### Plantilla: Índice

```markdown
# [Tipo] del Proyecto

| Nombre | Descripción | Docs |
|--------|-------------|------|
| _(vacío — se llena conforme se crean)_ | | |
```

---

## 12. Resumen Ejecutivo

Este sistema convierte al agente de IA en un miembro del equipo con memoria institucional. Los componentes clave son:

1. **Visión de producto** → para que el agente tome decisiones alineadas con la intención del creador.
2. **Requerimientos vivos** → para que el agente sepa qué construir y documente cada cambio.
3. **Design system como skill** → para que el agente produzca UI consistente sin ver screenshots.
4. **Reglas en capas** → always-on para lo universal, por glob para lo contextual.
5. **Patrón discovery + documentation** → para que el agente no duplique y siempre documente.
6. **Índices vivos** → para que el agente (y el humano) sepa qué existe sin explorar código.
7. **Verificación de impacto** → para que ningún cambio deje documentación desactualizada.

El resultado: un proyecto que se autodescribe, un agente que trabaja con contexto, y un sistema que escala sin degradarse.

---

*Agent System Blueprint v1.0 — Febrero 2026*

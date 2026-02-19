# app-school-selector

Selector de escuela activa. Dropdown para cambiar entre escuelas cuando el usuario tiene permiso.

## Propósito
Mostrar la escuela actual y permitir cambiarla. Si el usuario no puede cambiar (`canSwitchSchool`), muestra la escuela en modo estático (sin dropdown).

## Dependencias
- **SchoolService** — `currentSchool`, `availableSchools`, `setCurrentSchool()`
- **AuthService** — `canSwitchSchool` (signal)
- **GsapAnimationsService** — animaciones de panel

## Inputs / Outputs
No tiene inputs ni outputs. Todo viene de los servicios inyectados.

## Cuándo usarlo
- En el topbar o layout principal
- Cuando la app es multi-escuela y el usuario puede tener acceso a varias

## Cuándo NO usarlo
- App de una sola escuela
- Si el selector va en otro contexto (ej. formulario de alta)

## Comportamiento
- **canSwitch = true**: Botón que abre dropdown con lista de escuelas. Cada escuela muestra un dot de color según tema (rojo/azul).
- **canSwitch = false**: Vista estática con tooltip "No tienes permiso para cambiar de escuela".
- Cierra con Escape, clic fuera o al seleccionar una escuela.

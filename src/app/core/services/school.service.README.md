# SchoolService

## Propósito

Gestión de la escuela activa. La escuela determina el tema visual (rojo/azul). Al cambiar de escuela, orquesta `ThemeService` para actualizar el tema. Persiste la selección en localStorage.

## API pública

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `currentSchool` | `Signal<School \| null>` | Escuela activa |
| `availableSchools` | `ComputedSignal<School[]>` | Escuelas disponibles |
| `setCurrentSchool(school)` | `void` | Cambia la escuela (actualiza tema y storage) |
| `getSchoolById(id)` | `School \| undefined` | Obtiene escuela por ID |

## Cuándo usarlo

- Selector de escuela en el topbar (solo si `AuthService.canSwitchSchool`)
- Cualquier lógica que dependa de la escuela activa
- Datos que varían por escuela (cuando se implementen features)

## Cuándo no usarlo

- Para cambiar solo el tema visual → `ThemeService` (SchoolService lo orquesta)
- Para items del menú → `MenuConfigService`

## Dependencias

- `ThemeService` (para aplicar tema al cambiar escuela)
- `School` de `@core/models/school.model`

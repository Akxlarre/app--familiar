# AuthService

## Propósito

Gestión de autenticación de usuarios. Actualmente es un stub con datos mock para desarrollo. Preparado para integración futura con Supabase Auth.

## API pública

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `currentUser` | `Signal<User \| null>` | Usuario actual (null si no autenticado) |
| `isAuthenticated` | `ComputedSignal<boolean>` | true si hay usuario logueado |
| `canSwitchSchool` | `ComputedSignal<boolean>` | true si el usuario puede cambiar de escuela |
| `logout()` | `void` | Cierra sesión (stub) |
| `setUser(user)` | `void` | Establece usuario (para login real futuro) |

## Cuándo usarlo

- Mostrar datos del usuario actual (nombre, rol, iniciales)
- Proteger rutas o mostrar/ocultar UI según autenticación
- Verificar permisos (ej. `canSwitchSchool` para el selector de escuela)

## Cuándo no usarlo

- Para login/logout real → usar `SupabaseService` cuando esté integrado
- Para datos de sesión de Supabase → usar `SupabaseService.getUser()`

## Dependencias

- Ninguna externa. Modelo `User` de `@core/models/user.model`.

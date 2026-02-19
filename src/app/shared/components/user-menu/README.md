# app-user-menu

Menú de usuario con avatar, nombre, rol y acciones (Ayuda, Cerrar sesión).

## Propósito
Mostrar el usuario actual y ofrecer acceso rápido a ayuda y logout. Usa PrimeNG Avatar para el círculo con iniciales.

## Dependencias
- **AuthService** — `currentUser` (signal con `name`, `role`, `initials`)
- **Router** — navegación a ayuda
- **GsapAnimationsService** — animaciones de panel

## Inputs / Outputs
No tiene inputs ni outputs. Todo viene de AuthService.

## Cuándo usarlo
- En el topbar, junto a school-selector y notifications-panel
- Cualquier layout que requiera menú de usuario

## Cuándo NO usarlo
- Si el menú de usuario tiene estructura muy distinta (ej. solo logout)
- En páginas de login (no hay usuario)

## Comportamiento
- Clic en trigger abre dropdown con header (avatar grande, nombre, rol) y nav (Ayuda, Cerrar sesión).
- Cierra con Escape o clic fuera.
- En móvil el nombre/rol se oculta (`hidden md:flex`).

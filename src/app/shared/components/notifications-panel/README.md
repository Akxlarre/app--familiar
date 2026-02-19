# app-notifications-panel

Panel de notificaciones con badge de no leídas. Modo panel (preview) y modo drawer (lista completa con filtros).

## Propósito
Mostrar notificaciones del usuario. Al abrir: panel compacto con últimas. Opción "Ver todas" expande a drawer lateral con filtros por tipo (Todas, No leídas, Info, Éxito, Aviso, Error).

## Dependencias
- **NotificationsService** — `notifications`, `panelNotifications`, `filteredNotifications`, `filter`, `unreadCount`, `markAsRead()`, `markAllAsRead()`, `setFilter()`
- **GsapAnimationsService** — animaciones de panel y transición panel → drawer

## Inputs / Outputs
No tiene inputs ni outputs. Todo viene de NotificationsService.

## Cuándo usarlo
- En el topbar, junto a search y user-menu
- Cuando la app tiene notificaciones en tiempo real o periódicas

## Cuándo NO usarlo
- Si no hay sistema de notificaciones
- Si las notificaciones van en otra ubicación (ej. página dedicada)

## Comportamiento
- **Panel**: Muestra últimas N notificaciones. Clic en una la marca como leída. Botón "Marcar todas como leídas".
- **Drawer**: Al clicar "Ver todas", el panel se anima a drawer lateral con filtros. Clic en notificación la marca como leída.
- Cierra con Escape, clic fuera o botón X (en drawer).
- Badge muestra número de no leídas (máx. 99+).

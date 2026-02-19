# Índice de servicios

> **Regla**: Al añadir un servicio nuevo a `core/services/`, actualizar este archivo y crear su README.

## Servicios disponibles

| Servicio | Propósito | Doc |
|----------|-----------|-----|
| `AuthService` | Gestión de autenticación (stub para Supabase) | [README](auth.service.README.md) |
| `BreadcrumbService` | Deriva breadcrumb del menú y ruta actual | [README](breadcrumb.service.README.md) |
| `ConfirmModalService` | Modal de confirmación con promesa (confirm/cancel) | [README](confirm-modal.service.README.md) |
| `GsapAnimationsService` | Animaciones GSAP centralizadas (SIEMPRE usar, nunca @angular/animations) | [README](gsap-animations.service.README.md) |
| `LayoutService` | Estado del layout responsive (sidebar drawer mobile) | [README](layout.service.README.md) |
| `MenuConfigService` | Configuración del menú lateral | [README](menu-config.service.README.md) |
| `ModalOverlayService` | Contenedor para modales que cubren viewport completo | [README](modal-overlay.service.README.md) |
| `NotificationsService` | Estado de notificaciones (listado, filtros, marcar leídas) | [README](notifications.service.README.md) |
| `SchoolService` | Escuela activa y cambio de tema visual | [README](school.service.README.md) |
| `SearchService` | Búsqueda global (alumnos, clases, pagos, certificados) | [README](search.service.README.md) |
| `SearchPanelService` | Control del panel de búsqueda (Ctrl+K / Cmd+K) | [README](search-panel.service.README.md) |
| `SupabaseService` | Cliente Supabase (auth, DB) | [README](supabase.service.README.md) |
| `ThemeService` | Tema dual (rojo/azul) por escuela | [README](theme.service.README.md) |

---

## Cuándo usar cada uno

| Caso | Servicio |
|------|----------|
| Autenticación, usuario actual, permisos | `AuthService` |
| Breadcrumb en topbar | `BreadcrumbService` |
| Diálogo confirmar/cancelar | `ConfirmModalService` |
| Cualquier animación en la app | `GsapAnimationsService` |
| Abrir/cerrar sidebar en mobile | `LayoutService` |
| Items del menú lateral | `MenuConfigService` |
| Modal que debe cubrir topbar | `ModalOverlayService` |
| Notificaciones del usuario | `NotificationsService` |
| Escuela activa, cambiar de escuela | `SchoolService` |
| Resultados de búsqueda global | `SearchService` |
| Abrir panel de búsqueda programáticamente | `SearchPanelService` |
| Llamadas a Supabase (auth, DB) | `SupabaseService` |
| Tema visual (rojo/azul) | `ThemeService` |

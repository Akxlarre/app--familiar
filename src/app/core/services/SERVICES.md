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

### Finanzas (módulo financiero)

| Servicio | Propósito |
|----------|-----------|
| `AccountService` | CRUD cuentas (incl. owner_profile_id, purpose, bank_name, tipo digital_wallet) |
| `BudgetService` | Presupuestos por hogar/mes; scope personal/hogar (profile_id) |
| `TransactionService` | Transacciones, filtros (accountIds para scope personal), gastos por categoría |
| `FinanceSummaryService` | Resumen del mes (ingresos, gastos, presupuesto); opciones profileId/accountIds |
| `CategoryService` | Categorías de gasto/ingreso |
| `RecurringService` | Transacciones recurrentes |
| `CreditCardDetailsService` | Detalle TC: límite, ciclo, vencimiento, saldo; applyPayment |
| `InstallmentPurchaseService` | Compras en cuotas: activas, crear, registrar pago |
| `EmailIntegrationService` | Integración Gmail OAuth (conectar, estado, tokens) |
| `BankEmailParserService` | Parsers de email bancario por hogar (CRUD) |
| `EmailTransactionLogService` | Log de sugeridas desde email; pendingCount, aprobar, rechazar |
| `FinanceNotificationsService` | Alertas presupuesto y recurrentes |
| `SavingsGoalService` | Metas de ahorro |
| `TagService` | Etiquetas de transacciones |
| `TransactionSplitService` | División de gastos |
| `ReceiptService` | Boletas y ítems |
| `ExportService` | Exportación CSV/Excel/PDF |

### Nutrición (módulo nutrición)

| Servicio | Propósito |
|----------|-----------|
| `NutritionCalculatorService` | Cálculos puros: IMC, TMB (Mifflin-St Jeor), TDEE, metas calóricas y de macros, rango peso saludable |
| `NutritionProfileService` | CRUD perfil nutricional; recalibrateFromWeight; sincronización con BodyLog |
| `FoodDatabaseService` | Búsqueda en base propia, por barcode, Open Food Facts fallback, importación, recientes/frecuentes |
| `FoodLogService` | Log diario de comidas; getLogsByDate(Grouped); create/update/delete; daily summary cache |
| `SavedMealService` | Comidas guardadas (recetas); CRUD; logSavedMeal con porciones escalables |
| `NutritionStatsService` | Resumen semanal, promedios, adherencia al objetivo, proteína histórica, correlación peso-calorías |

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
| Cuentas, presupuestos, transacciones, resumen financiero | `AccountService`, `BudgetService`, `TransactionService`, `FinanceSummaryService` |
| Tarjetas de crédito, cuotas, pago de TC | `CreditCardDetailsService`, `InstallmentPurchaseService` |
| Integración Gmail, parsers bancarios, transacciones sugeridas desde email | `EmailIntegrationService`, `BankEmailParserService`, `EmailTransactionLogService` |
| Perfil nutricional, calorías, macros, food log, comidas guardadas, estadísticas nutrición | `NutritionProfileService`, `FoodLogService`, `FoodDatabaseService`, `SavedMealService`, `NutritionStatsService`, `NutritionCalculatorService` |

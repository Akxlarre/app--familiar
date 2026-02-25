FAMILYAPP
Aplicación Familiar de Gestión del Hogar
Documento de Requerimientos y Arquitectura — v1.0 / 2025

Datos del Proyecto
CampoDetalleFrontendAngular 20 + PrimeNG (Web primero)BackendSupabase (PostgreSQL + Auth + Realtime + Storage)PlataformaWeb responsive (móvil en fase posterior con Ionic + Capacitor)IdiomaEspañolUsuarios2-3 miembros familiaresAccesoCuenta individual por miembroSincronizaciónTiempo real entre usuariosEnfoqueCalidad sobre velocidadEstrategiaWeb primero — validar módulos en web antes de empaquetar para móvil

1. Introducción y Objetivos
FamilyApp es una aplicación móvil de uso privado diseñada para centralizar la gestión del hogar familiar. Su objetivo principal es reemplazar herramientas dispersas (Excel, apps genéricas, notas de papel) por un único punto de verdad accesible desde el celular, sincronizado en tiempo real entre todos los miembros del hogar.
1.1 Objetivos principales

Centralizar inventario del hogar con alertas de stock bajo.
Gestionar gastos familiares e individuales con visualización de presupuesto.
Planificar comidas semanales con generación automática de lista de compras.
Registrar y seguir rutinas de ejercicio personalizadas por miembro.
Capturar y procesar boletas mediante OCR automático.
Coordinar tareas y recordatorios entre miembros del hogar.

1.2 Alcance versión 1.0
La versión inicial contempla todos los módulos definidos en este documento. Orden de implementación priorizado: Gastos + Boletas → Inventario → Comidas → Ejercicio → Notas y Tablero.

2. Módulos del Sistema
MóduloDescripciónPrioridad🏠 InventarioGestión de alimentos, limpieza y medicamentos con alertas de stockAlta💰 GastosPresupuesto familiar y gastos individuales con categorías y gráficasAlta🧾 BoletasCaptura fotográfica de boletas con extracción OCR de datosAlta🍽️ ComidasPlanificador semanal, control de calorías/macros, lista de compras autoAlta🥗 NutriciónPerfil corporal (IMC, TMB, TDEE), food log diario, base de alimentos (propia + Open Food Facts), comidas guardadas, integración opcional con inventarioAlta🏋️ EjercicioRutinas personales, biblioteca, historial y estadísticas por miembroMedia📋 Notas y TareasListas compartidas tipo checklist entre miembros del hogarMedia🔔 NotificacionesRecordatorios push configurables por módulo y miembroMedia📊 TableroResumen visual del estado del hogar en tiempo realMedia

3. Requerimientos Detallados por Módulo
3.1 Módulo de Inventario
Permite registrar y mantener actualizado el stock del hogar, con alertas automáticas cuando un producto está por agotarse.
FuncionalidadDescripciónNotas técnicasAlta de productoNombre, categoría, cantidad, unidad de medida, stock mínimoSupabase DB + tabla productsEscaneo de código de barrasUsar cámara del dispositivo para identificar productoCapacitor BarcodeScanner pluginCategoríasAlimentos/despensa, Limpieza/hogar, MedicamentosEnum en DB o tabla categoriesAlerta de stock bajoNotificación push cuando cantidad <= stock_minimoSupabase Edge Function + FCMSincronizaciónCambios visibles en tiempo real para todos los miembrosSupabase Realtime subscriptionsHistorial de cambiosLog de quién modificó qué y cuándoTabla inventory_logs

3.2 Módulo de Gastos
Central financiera familiar: consolida presupuesto compartido, gastos individuales y visualización de tendencias.
FuncionalidadDescripciónNotas técnicasPresupuesto mensualDefinir presupuesto por categoría para el mes en cursoTabla budgets por mes/añoRegistro de gastoMonto, categoría, miembro, fecha, nota, boleta vinculadaTabla expensesCategorías de gastoAlimentación, Transporte, Salud, Educación, Hogar, OtroTabla expense_categoriesVista gastos individualesCada miembro ve sus propios gastos y el total familiarRLS policies en SupabaseGráficas y reportesTorta por categoría, barras por mes, línea de evoluciónChart.js o ngx-charts en AngularResumen del tableroWidget con % del presupuesto consumido en el mes actualVista materializada en Supabase

3.3 Módulo de Boletas
Captura digital de comprobantes de gasto con extracción automática de datos mediante OCR.
FuncionalidadDescripciónNotas técnicasFotografiar boletaAbrir cámara nativa o galería para capturar imagenCapacitor Camera pluginOCR automáticoExtraer monto, fecha, comercio y productos de la imagenGoogle Cloud Vision API o Tesseract.jsRevisión y confirmaciónEl usuario valida o edita los datos extraídos antes de guardarFormulario prellenado en AngularVinculación a gastoAsociar boleta procesada a un registro de gasto existente o nuevoForeign key receipts → expensesAlmacenamiento de imagenGuardar imagen original en la nubeSupabase Storage bucketsHistorial de boletasListado con filtro por fecha, monto y categoríaTabla receipts con metadatos

3.4 Módulo de Comidas
Planificador nutricional familiar: organiza los menús semanales, registra macros y genera automáticamente la lista de compras.
FuncionalidadDescripciónNotas técnicasPlanificador semanalAsignar desayuno, almuerzo, cena para cada día de la semanaTabla meal_plan con day/slotBase de recetasNombre, ingredientes+cantidades, instrucciones, foto, calorías/macrosTabla recipes + recipe_ingredientsControl de calorías/macrosRegistrar proteínas, carbohidratos, grasas y calorías por recetaColumnas nutricionales en recipesResumen nutricionalTotal diario/semanal de calorías y macros por miembroCálculo en Angular o función SupabaseLista de compras autoGenerar lista consolidada de ingredientes a partir del plan semanalEdge Function que agrupa ingredientesCompartir con inventarioDescontar ingredientes del inventario al ejecutar recetaIntegración entre módulos

3.5 Módulo de Ejercicio
Seguimiento de entrenamiento personal para cada miembro: rutinas, sesiones y evolución en el tiempo.
FuncionalidadDescripciónNotas técnicasBiblioteca de ejerciciosNombre, grupo muscular, descripción, imagen/gif de técnicaTabla exercises (compartida)Creación de rutinaNombre, días de la semana, lista de ejercicios con series/reps/pesoTablas routines + routine_exercisesRutina por miembroCada usuario tiene sus propias rutinas independientesuser_id en tabla routines + RLSRegistro de sesiónRegistrar sesión completada con pesos y reps reales usadosTabla workout_sessions + session_setsHistorialVer sesiones pasadas con fecha y rendimiento por ejercicioQuery por user_id ordenado por fechaEstadísticas y progresoGráfica de evolución de peso/reps en el tiempo por ejercicioAggregation query + ngx-charts

3.6 Módulo de Notas y Tareas
Listas de tareas compartidas entre miembros para coordinar actividades del hogar.
FuncionalidadDescripciónNotas técnicasCrear lista compartidaTítulo y visibilidad: todos los miembros del hogarTabla todo_listsÍtems con checkboxAgregar, editar, tachar y eliminar ítems de la listaTabla todo_items + campo completedAsignar ítem a miembroIndicar quién es responsable de cada tareaassigned_to FK a usersSincronización en tiempo realCambios en lista visibles al instante para todosSupabase Realtime channel

3.7 Módulo de Notificaciones y Recordatorios
FuncionalidadDescripciónNotas técnicasPush nativaNotificaciones en dispositivo Android/iOS via FCM/APNsCapacitor Push Notifications pluginRecordatorio de ejercicioAlerta a la hora programada en la rutina del díaScheduled local o Supabase cronAlerta de stock bajoPush cuando un producto baja del mínimo configuradoSupabase Edge Function triggerRecordatorio de presupuestoAlerta cuando se supera el X% del presupuesto mensualEdge Function en insert de expensesNotificación de tareasAlerta cuando te asignan una tarea nuevaTrigger en tabla todo_items

4. Arquitectura del Sistema
4.1 Stack tecnológico
Frontend (fase actual — Web primero)

Framework: Angular 20
UI: PrimeNG (componentes web)
Charts: ngx-charts o Chart.js
Estado: Angular Signals + Services (NgRx opcional si crece la complejidad)

Frontend (fase posterior — móvil)

Ionic 7 + Capacitor 5 — se añadirá cuando los módulos estén validados en web

Backend (Supabase)

DB: PostgreSQL con RLS habilitado
Auth: Supabase Auth (email / magic link)
Realtime: Supabase Realtime channels (websockets)
Storage: Supabase Storage (imágenes de boletas y recetas)
Logic: Edge Functions en Deno/TypeScript


4.2 Plugins Capacitor requeridos
PluginUso@capacitor/cameraFotografiar boletas y recetas@capacitor/push-notificationsNotificaciones push remotas@capacitor-community/barcode-scannerEscaneo de inventario@capacitor/local-notificationsRecordatorios locales programados@capacitor/filesystemManejo temporal de imágenes

4.3 Servicios externos

Google Cloud Vision API — OCR para boletas (alternativa offline: Tesseract.js)
Firebase Cloud Messaging (FCM) — Push para Android
Apple Push Notification Service (APNs) — Push para iOS


4.4 Modelo de datos principal

**Documentación detallada**: `docs/MODELO-DATOS-v1.md`  
**Migración SQL**: `supabase/migrations/20250219000000_modelo_datos_v1.sql`

TablaRelaciónDescripciónhouseholdsraízHogar familiar. Todos los miembros pertenecen a uno.profilesN:1 householdPerfil extendido del usuario (nombre, avatar, rol).productsN:1 householdInventario: nombre, categoría, cantidad, stock_min.expensesN:1 household, N:1 profileGasto con monto, categoría, fecha, boleta vinculada.receipts1:1 expenseImagen + datos OCR extraídos de la boleta.budgetsN:1 householdPresupuesto por categoría y mes/año.meal_plansN:1 householdPlan semanal: día + slot + receta.recipesN:1 householdReceta con ingredientes, macros e instrucciones.recipe_ingredientsN:1 recipeIngrediente con cantidad y unidad.routinesN:1 profileRutina de ejercicio personal con días activos.routine_exercisesN:1 routineEjercicio de la rutina con series/reps/peso objetivo.workout_sessionsN:1 profile, N:1 routineSesión registrada con fecha y sets completados.session_setsN:1 workout_sessionSet individual: ejercicio, reps, peso real.todo_listsN:1 householdLista compartida de tareas del hogar.todo_itemsN:1 todo_listÍtem de tarea con estado y asignado.inventory_logsN:1 productLog de cambios en inventario (quién, qué, cuándo).

4.5 Seguridad: Row Level Security (RLS)
Todas las tablas tienen RLS habilitado. El principio base es: cada usuario solo puede leer y modificar datos de su propio hogar.

SELECT: visible solo si household_id coincide con el hogar del auth.uid().
INSERT/UPDATE: solo si el usuario pertenece al hogar y (en datos personales) es el dueño del registro.
DELETE: restringido al propietario del registro o al administrador del hogar.


4.6 Estructura de carpetas sugerida (Angular)
src/app/
├── core/                  # Servicios globales, guards, interceptors, Supabase client
├── shared/                # Componentes reutilizables, pipes, directivas
└── features/
    ├── auth/              # Login, registro, invitación de miembro
    ├── tablero/           # Dashboard principal
    ├── inventario/        # Módulo completo de inventario
    ├── gastos/            # Gastos + boletas + presupuesto
    ├── comidas/           # Planificador + recetas + lista de compras
    ├── ejercicio/         # Rutinas + biblioteca + sesiones + stats
    └── notas/             # Tareas compartidas

5. Plan de Implementación por Fases
FaseMódulosEntregables claveDuración est.1Infraestructura + AuthProyecto Angular+Ionic, Supabase config, login, perfiles, hogar1-2 semanas2Gastos + BoletasRegistro gastos, OCR, presupuesto, gráficas2-3 semanas3InventarioCRUD productos, escaneo barcode, alertas, realtime1-2 semanas4ComidasPlanificador, recetas, macros, lista de compras auto2-3 semanas5EjercicioRutinas, biblioteca, sesiones, estadísticas2-3 semanas6Notas + Notificaciones + TableroTareas compartidas, push, dashboard resumen1-2 semanas7Pulido y lanzamientoUX review, pruebas en dispositivos, build producción1-2 semanas
Total estimado: 11-17 semanas desarrollando en tiempo libre.

6. Consideraciones Técnicas
OCR para boletas
Comenzar con Google Cloud Vision API por su alta precisión con texto en español. Como fallback offline, Tesseract.js puede integrarse directamente en Angular. Flujo recomendado:
foto → upload Supabase Storage → Edge Function → Vision API → JSON → formulario prellenado → validación usuario → guardado
Sincronización en tiempo real
Suscribirse al canal de Supabase Realtime al entrar al módulo y desuscribirse al salir, para optimizar conexiones. Módulos críticos para realtime: inventario, gastos, notas y tareas.
Gestión de estado
Usar Angular Signals (Angular 17+) combinado con Services para estado local. Supabase Realtime se encarga de la sincronización entre dispositivos. NgRx es opcional si la complejidad escala.
Notificaciones push

Recordatorios locales (hora de entrenar): @capacitor/local-notifications — no requiere servidor.
Notificaciones por eventos de Supabase (stock bajo, nuevo gasto): Edge Functions que llaman a FCM directamente.


7. Tablero Principal — Widgets
WidgetDescripción💰 Presupuesto del mesBarra de progreso con % consumido y monto restante🏠 InventarioProductos con stock bajo o agotados🍽️ Menú de hoyDesayuno, almuerzo y cena planificados para el día🏋️ Ejercicio hoyRutina programada para el día actual del miembro📋 Tareas pendientesÍtems sin completar asignados al usuario🔔 Últimas notificacionesÚltimos 3 eventos recientes del hogar

8. Próximos Pasos Inmediatos

Usar proyecto Angular existente (app-familiar) con PrimeNG.
Crear tablas en Supabase: households, profiles, expense_categories.
Implementar flujo de autenticación real: registro, login, invitación de miembro al hogar.
Iniciar Fase 2: módulo de Gastos como primer módulo funcional completo.
Ionic + Capacitor: añadir en fase posterior cuando se decida empaquetar para móvil.

9. Documentación de Cambios

Este documento es un insumo vivo. Toda implementación o cambio significativo debe documentarse aquí.

Regla: al crear tablas, modificar flujos, añadir features o desviarse de los requerimientos, actualizar este archivo y añadir una entrada en el historial.

10. Historial de Cambios

| Fecha | Cambio | Módulo |
|-------|--------|--------|
| 2025-02-19 | Decisión Web primero: PrimeNG en lugar de Ionic. Móvil en fase posterior. | Arquitectura |
| 2025-02-19 | Añadida sección de documentación obligatoria de cambios. | Documentación |
| 2025-02-19 | Modelo de datos v1: migración SQL y docs/MODELO-DATOS-v1.md. Tablas: households, profiles, invites, gastos, boletas, inventario, comidas, ejercicio, notas. RLS y Realtime. | Modelo de datos |
| 2025-02-19 | Integración Auth con Supabase: AuthService con login/logout y onAuthStateChange, LoginComponent con login/registro/recuperación, AuthGuard para rutas /app, branding App Familiar. | Auth |
| 2025-02-19 | Flujo hogar: crear hogar / unirse con código. Columna invite_code en households. Feature setup-hogar, HouseholdService, HouseholdGuard, AuthService.refreshProfile(). | Hogar / Auth |
| 2025-02-21 | Mejoras inmediatas módulo Finanzas: exportación CSV/Excel/PDF, metas de ahorro, etiquetas/tags, búsqueda avanzada (rangos monto, múltiples categorías), división de gastos entre miembros, notificaciones in-app (presupuesto superado, recurrentes próximos). | Finanzas |
| 2025-02-21 | Sistema Financiero Inteligente: (1) Cuentas enriquecidas: owner_profile_id, purpose, bank_name, tipo digital_wallet; (2) Tarjetas de crédito (credit_card_details, límite/ciclo/vencimiento) y compras en cuotas (installment_purchases), vista Deudas, flujo pago TC; (3) Automatización Gmail: OAuth (email_integrations), parsers configurables (bank_email_parsers), log de sugeridas (email_transactions_log), bandeja de transacciones sugeridas y badge en menú; (4) Scope personal vs hogar: profile_id en budgets, toggle Hogar/Personal en dashboard finanzas y presupuesto. Rutas: /app/finanzas/deudas, /app/configuracion/email. | Finanzas |


FamilyApp — Documento de Requerimientos v1.0 — Este documento es un insumo vivo, actualizar a medida que evolucionen los requerimientos.
# Guía: Sistema de emails y tarjetas — configuración

Esta guía explica el **sistema de integración de email** (Gmail + parsers bancarios), el uso de **tarjetas** en ese contexto y en la app, y cómo **configurarlo** paso a paso.

---

## 1. Resumen del sistema de emails

El sistema permite:

1. **Conectar Gmail** (OAuth) para leer correos del usuario de forma segura.
2. **Definir parsers por banco**: reglas que identifican correos (remitente, asunto) y extraen datos del cuerpo (monto, comercio, últimos 4 dígitos de la tarjeta).
3. **Procesar correos** con una Edge Function (`process-bank-emails`) que aplica los parsers y crea o sugiere transacciones (por ejemplo alertas de compra con tarjeta).

### Dónde se configura en la app

- **Menú**: **Configuración** → **Integración email** (ruta: `/app/configuracion/email`).
- Ahí se conecta/desconecta Gmail y se gestionan los **parsers de banco**.

---

## 2. Partes del sistema de emails

### 2.1 Integración Gmail (OAuth)

- **Tabla**: `email_integrations` (por perfil: `profile_id`, `household_id`, tokens de Google).
- **Flujo**: El usuario hace clic en "Conectar Gmail" → redirige a Google → vuelve con un `code` → la app llama a la Edge Function `gmail-oauth`, que guarda `access_token` y `refresh_token` en la base de datos.
- **Requisito**: En el entorno de la app debe existir `googleClientId` (y en Supabase, los secretos `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` para las Edge Functions).

### 2.2 Parsers de banco

- **Tabla**: `bank_email_parsers` (por hogar: `household_id`).
- Cada parser define:
  - **Banco**: nombre (ej. BCI, Banco Estado).
  - **Patrón remitente**: correo que envía los avisos (ej. `alertas@bci.cl`).
  - **Patrón asunto** (opcional): expresión regular sobre el asunto.
  - **Tipo de email**: uno de:
    - **Alerta de compra** (`purchase_alert`)
    - **Estado de cuenta** (`statement`)
    - **Confirmación de pago** (`payment_confirmation`)
    - **Aviso de cuota** (`installment_notice`)
  - **Reglas del cuerpo** (regex):
    - **Monto** (`amount_regex`): para extraer el valor de la transacción.
    - **Comercio** (`merchant_regex`): opcional.
    - **Últimos 4 dígitos tarjeta** (`card_last4_regex`): opcional; permite asociar la alerta a una tarjeta de crédito concreta del hogar.

Las reglas del cuerpo se guardan en `body_rules` (JSON). En la pantalla de configuración aparecen como tres campos: Monto, Comercio y Últimos 4 dígitos tarjeta.

### 2.3 Tarjetas en el contexto de emails

- **En los parsers**: el campo **"Últimos 4 dígitos tarjeta"** (`card_last4_regex`) sirve para que, al procesar un correo de alerta de compra, se extraiga el número corto de la tarjeta (ej. `****1234`) y se pueda relacionar con una cuenta en la app.
- **En la app (Finanzas)**:
  - Tanto **tarjeta de crédito** como **tarjeta de débito** (y en general cualquier cuenta) pueden tener opcionalmente **últimos 4 dígitos** en **Finanzas → Cuentas** (campo "Últimos 4 dígitos" al crear/editar una cuenta de tipo tarjeta). Ese valor se guarda en `accounts.card_last4`.
  - Cuando **process-bank-emails** extrae `card_last4` del correo, busca una cuenta del hogar con ese mismo `card_last4` y asigna la transacción a esa cuenta (descuenta ahí). Si no hay coincidencia, usa la primera cuenta activa tipo débito/crédito/banco como antes.
  - Las tarjetas de crédito además tienen **datos de tarjeta** (límite, ciclo, vencimiento) en `credit_card_details`. La vista **Deudas** (`/app/finanzas/deudas`) muestra compras en cuotas y el flujo "Pagar tarjeta de crédito".

Así, el sistema de emails y las tarjetas se conectan: pones los últimos 4 dígitos en la cuenta; los parsers extraen ese dato del correo; la transacción se enlaza y descuenta en la cuenta correcta.

### 2.4 Procesamiento de correos

- **Edge Function**: `process-bank-emails`. Lee correos de Gmail usando las integraciones activas, aplica los parsers del hogar, extrae monto/comercio/tarjeta y crea registros en `email_transactions_log` (transacciones sugeridas o creadas).
- Se suele ejecutar **cada 5 minutos** con un cron (Dashboard o pg_cron). Ver [EDGE-FUNCTIONS-SUPABASE.md](./EDGE-FUNCTIONS-SUPABASE.md).

---

## 3. Tarjetas en la interfaz (design system)

En la app, "tarjetas" también se refiere a los **componentes de card** del design system para dashboards y bento-grid:

| Componente | Uso |
|------------|-----|
| **app-feature-card** | Card genérica (título, icono, body, footer). Tamaños: 1x1, 2x1, 2x2, 3x2, hero. |
| **app-kpi-card** | KPI con número, tendencia e icono. |
| **app-data-table-card** | Tabla dentro de un card (paginación, ordenación, selección). |
| **app-category-breakdown-card** | Desglose por categorías con barras. |
| **app-alert-card** | Alertas (error, warning, info, success). |

Documentación: `src/app/shared/components/COMPONENTS.md` y los README de cada componente en `shared/components/`.

---

## 4. Cómo configurar el sistema de emails (paso a paso)

### 4.1 Variables de entorno en la app (Angular)

En `environments/environment.ts` (y `environment.development.ts` si usas entornos distintos) necesitas:

- **supabase.url** y **supabase.anonKey**: ya los tienes para tu proyecto.
- **googleClientId**: Client ID de una aplicación OAuth 2.0 de tipo "Web application" en Google Cloud Console.

Si `googleClientId` no está definido, en la pantalla de Integración email aparecerá el mensaje de que hay que configurarlo; el botón "Conectar Gmail" no funcionará hasta que lo añadas.

### 4.2 Crear credenciales OAuth en Google Cloud

1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Crea o selecciona un proyecto.
3. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**.
4. Tipo de aplicación: **Aplicación web**.
5. **URIs de redirección autorizados**: debe coincidir exactamente con la URL a la que Google redirige tras el login. En la app es:
   - Producción: `https://TU_DOMINIO/app/configuracion/email`
   - Local: `http://localhost:4200/app/configuracion/email` (o el puerto que uses).
6. Guarda y copia el **Client ID** y el **Client secret**. El Client ID va en `environment.googleClientId`; el Client secret **no** se pone en el frontend, solo en Supabase (secretos de Edge Functions).

### 4.3 Activar Gmail API (opcional pero recomendado)

En Google Cloud Console → **APIs y servicios** → **Biblioteca** → busca "Gmail API" y actívala para el proyecto. Las Edge Functions que lean Gmail la utilizan.

### 4.4 Edge Functions y secretos en Supabase

Las funciones **gmail-oauth** y **process-bank-emails** deben estar desplegadas y con secretos configurados. Resumen:

1. **Vincular y desplegar** (desde la carpeta `app/`, donde está `supabase/`):
   ```bash
   supabase link --project-ref frlgxhyacaamngkvsujr
   supabase functions deploy gmail-oauth
   supabase functions deploy process-bank-emails
   ```
2. **Secretos** (Dashboard → Project Settings → Edge Functions → Secrets, o por CLI):
   - `GOOGLE_CLIENT_ID` = mismo Client ID que en `environment.googleClientId`.
   - `GOOGLE_CLIENT_SECRET` = Client secret de Google.

Detalle completo: [EDGE-FUNCTIONS-SUPABASE.md](./EDGE-FUNCTIONS-SUPABASE.md).

### 4.5 Configurar parsers en la app

1. Entra en **Configuración** → **Integración email**.
2. Conecta Gmail (botón "Conectar Gmail") y autoriza en Google.
3. En la sección **Parsers de banco**, pulsa **Nuevo parser**.
4. Rellena:
   - **Nombre del banco**: ej. BCI, Banco Estado.
   - **Patrón remitente**: correo que envía los avisos (ej. `alertas@bci.cl` o `noreply@bancoestado.cl`).
   - **Patrón asunto** (opcional): regex para filtrar por asunto (ej. `compra|transacción`).
   - **Tipo de email**: Alerta de compra, Estado de cuenta, Confirmación de pago o Aviso de cuota.
   - **Monto**: regex para capturar el monto en el cuerpo (ej. para formato chileno: `(\d{1,3}(?:\.\d{3})*)` o el que use tu banco).
   - **Comercio** (opcional): regex para el nombre del comercio.
   - **Últimos 4 dígitos tarjeta** (opcional): regex para los 4 dígitos (ej. `\*{4}(\d{4})` si el correo muestra `****1234`).
5. Guarda. Repite para cada banco o tipo de correo que quieras procesar.

Para afinar los regex, conviene tener un correo de ejemplo del banco y probar las expresiones (por ejemplo en [regex101.com](https://regex101.com)) contra el texto del cuerpo.

### 4.6 Programar la sincronización (process-bank-emails)

Para que los correos se procesen solos cada cierto tiempo:

- **Dashboard de Supabase** → **Database** (o **Integrations**) → **Cron Jobs**.
- Crea un job que haga **POST** a:
  `https://frlgxhyacaamngkvsujr.supabase.co/functions/v1/process-bank-emails`
- Header: `Authorization: Bearer TU_SERVICE_ROLE_KEY`.
- Frecuencia sugerida: cada 5 minutos (`*/5 * * * *`).

El **service_role** está en Project Settings → API. No lo expongas en el frontend.

---

## 5. Resumen rápido

| Qué | Dónde / Cómo |
|-----|----------------|
| **Pantalla de configuración** | Menú → Configuración → Integración email (`/app/configuracion/email`) |
| **Gmail** | Conectar con `googleClientId` en environment; secretos en Supabase para Edge Functions |
| **Parsers** | Nuevo parser por banco: remitente, asunto, tipo de email, regex (monto, comercio, últimos 4 dígitos tarjeta) |
| **Tarjetas en emails** | Campo "Últimos 4 dígitos tarjeta" en cada parser; relaciona alertas con cuentas tipo tarjeta de crédito |
| **Tarjetas de crédito (cuentas)** | Finanzas → Cuentas → tipo "Tarjeta de crédito" + datos en credit_card_details; vista Deudas |
| **Tarjetas (UI)** | Design system: `app-feature-card`, `app-kpi-card`, `app-data-table-card`, etc. Ver `shared/components/COMPONENTS.md` |
| **Procesar correos** | Edge Function `process-bank-emails` desplegada + cron cada 5 min con `Authorization: Bearer SERVICE_ROLE_KEY` |

Si algo no funciona, revisa: (1) que `googleClientId` esté en el environment y que la URI de redirección en Google coincida con la de la app, (2) que los secretos de las Edge Functions estén definidos, y (3) los logs de las funciones en Supabase Dashboard → Edge Functions → Logs.

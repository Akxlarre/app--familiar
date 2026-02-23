# Guía: Edge Functions en Supabase (Gmail OAuth + process-bank-emails)

Las Edge Functions del **Sistema Financiero Inteligente** son dos: **gmail-oauth** (intercambio de código OAuth por tokens) y **process-bank-emails** (lectura de Gmail, parsers y creación de transacciones). No se pueden “pegar” en el dashboard como el SQL; se **despliegan con la CLI** y los **secretos** se configuran en el Dashboard o por CLI.

---

## 1. Qué funciones hay y para qué sirven

| Función | Uso | Secretos necesarios |
|--------|-----|----------------------|
| **gmail-oauth** | La app llama a esta función cuando el usuario termina el flujo OAuth de Google. Recibe `code` y `redirect_uri`, obtiene tokens y los guarda en `email_integrations`. | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **process-bank-emails** | Lee correos de Gmail (por integraciones activas), aplica parsers, extrae datos y crea transacciones o las deja en “pendiente de revisión”. Pensada para ejecutarse cada 5 min (cron) o bajo demanda. | Los mismos + `SUPABASE_SERVICE_ROLE_KEY` (ya lo inyecta Supabase) |

Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase al ejecutar la función; no hace falta que las definas tú.

---

## 2. Requisitos

- **Supabase CLI** instalado y actualizado.  
  - **Windows (recomendado):** con [Scoop](https://scoop.sh) — ver sección **“Instalar la CLI (Windows)”** más abajo.  
  - **Alternativa sin instalar nada global:** instalar como dependencia del proyecto y usar `npx supabase` en todos los comandos (ver más abajo).
- Proyecto Supabase ya creado en el dashboard (el mismo donde aplicaste las migraciones).

**Importante:** Todos los comandos (`link`, `functions deploy`) deben ejecutarse desde la carpeta donde está tu `supabase/` (en este repo: **`app/`**), porque ahí están `supabase/config.toml`, `supabase/migrations` y `supabase/functions`.

### Instalar la CLI (Windows)

La instalación global con `npm install -g supabase` **ya no está soportada**. Usa una de estas opciones:

**Opción A — Scoop (recomendado en Windows)**

1. Si no tienes Scoop: <https://scoop.sh> (en PowerShell: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` y luego el comando de instalación que indica la web).
2. Luego:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```
3. Cierra y abre la terminal; deberías poder ejecutar `supabase --version`.

**Opción B — Sin instalar nada global (npx)**

Desde la carpeta **`app/`** del proyecto:

```powershell
npm install supabase --save-dev
```

En todos los comandos de esta guía sustituye `supabase` por **`npx supabase`** (por ejemplo: `npx supabase link --project-ref frlgxhyacaamngkvsujr`, `npx supabase functions deploy gmail-oauth`).

---

## 3. ¿Está ya conectado el CLI? (cómo comprobarlo)

El “link” guarda en tu máquina qué proyecto remoto usa esta carpeta. Para saber si ya está conectado:

1. Abre una terminal y entra en la carpeta del proyecto que tiene `supabase/` (en este repo: **`app`**).  
   (Si instalaste la CLI con `npm install supabase --save-dev`, usa **`npx supabase`** en lugar de `supabase` en todos los comandos.)
   ```bash
   cd c:\Users\Akxlarre\app familiar\app
   ```
2. Ejecuta:
   ```bash
   supabase migration list --linked
   ```
   - Si **está vinculado**: mostrará una tabla con migraciones (LOCAL / REMOTE) o un mensaje de “linked project”. No pedirá proyecto.
   - Si **no está vinculado**: dirá que no hay proyecto vinculado o pedirá `--project-ref`. En ese caso sigue el apartado **4.1**.

Otra forma de comprobarlo:

```bash
supabase projects list
```

Si hace falta, inicia sesión antes:

```bash
supabase login
```

(Se abrirá el navegador o te pedirá un **Access Token** desde <https://supabase.com/dashboard/account/tokens>.)

---

## 4. Vincular el proyecto y desplegar

### 4.1 Vincular el proyecto remoto

Desde la carpeta **`app/`** (donde está `supabase/config.toml`):

```bash
cd c:\Users\Akxlarre\app familiar\app
supabase link --project-ref frlgxhyacaamngkvsujr
```

(En este repo el **Reference ID** es el que aparece en tu `environment.ts`: `frlgxhyacaamngkvsujr`. Si usas otro proyecto, sustituye por el que veas en Dashboard → Project Settings → General.)

Te pedirá la **contraseña de la base de datos**; es la que ves en Dashboard → Project Settings → Database (campo "Database password"). Puedes dejarla en blanco si solo quieres desplegar Edge Functions y no usar `db push` por ahora.

Cuando termine, verás algo como: `Finished supabase link.` A partir de ahí, desde esa misma carpeta `app/` ya puedes usar `supabase functions deploy` sin poner `--project-ref` cada vez.

### 4.2 Desplegar las funciones

Desplegar todas las funciones del proyecto:

```bash
supabase functions deploy
```

O solo las del Sistema Financiero Inteligente:

```bash
supabase functions deploy gmail-oauth
supabase functions deploy process-bank-emails
```

Si tu estructura es `app/supabase/` y ejecutas desde la raíz del repo:

```bash
supabase functions deploy --project-ref TU_PROJECT_REF
```

(Desde la carpeta `app/` no hace falta `--project-ref` si ya hiciste `supabase link` ahí.)

Tras el deploy, en el Dashboard → **Edge Functions** deberías ver `gmail-oauth` y `process-bank-emails` con su URL (por ejemplo `https://frlgxhyacaamngkvsujr.supabase.co/functions/v1/gmail-oauth`).

---

## 5. Configurar secretos (Google OAuth)

Ambas funciones necesitan **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET** (credenciales OAuth 2.0 de Google Cloud para la app de tipo “Web application” con la pantalla de consentimiento configurada).

### Opción A: Desde el Dashboard

1. Supabase Dashboard → tu proyecto.
2. **Project Settings** (icono de engranaje).
3. **Edge Functions** en el menú lateral.
4. Sección **Secrets** (o **Function Secrets**).
5. Añade:
   - `GOOGLE_CLIENT_ID` = tu Client ID de Google.
   - `GOOGLE_CLIENT_SECRET` = tu Client Secret de Google.

### Opción B: Desde la CLI

```bash
supabase secrets set GOOGLE_CLIENT_ID="tu-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="tu-client-secret"
```

Tras cambiar secretos, las funciones ya desplegadas usan los nuevos valores en la siguiente invocación (no suele hacer falta redesplegar).

---

## 6. Cómo se usan desde la app

- **gmail-oauth**: La app Angular ya está preparada para llamar a la URL de la función después del redirect de Google (envía `code` y `redirect_uri` en el body y el JWT del usuario en `Authorization: Bearer ...`). Solo necesitas que la URL base de la Edge Function sea la que usa tu `SupabaseService` (mismo proyecto que usas en el frontend).
- **process-bank-emails**: No la llama el frontend; se invoca por **cron** o bajo demanda (por ejemplo con un botón “Sincronizar ahora” que haga POST con la API key de servicio). Ver siguiente apartado.

---

## 7. Programar process-bank-emails (cada 5 minutos)

Tienes dos formas de ejecutar **process-bank-emails** de forma periódica.

### Opción A: Cron en el Dashboard (recomendada)

1. Dashboard → **Database** → **Cron Jobs** (o **Integrations** → **Cron**).
2. Crear un nuevo job que invoque la Edge Function:
   - Tipo: **HTTP** o **Invoke Edge Function** (según lo que ofrezca tu versión del dashboard).
   - URL: `https://TU_PROJECT_REF.supabase.co/functions/v1/process-bank-emails`
   - Método: **POST**.
   - Headers:  
     `Authorization: Bearer TU_SERVICE_ROLE_KEY`  
     (el **service_role** está en Project Settings → API.)
   - Frecuencia: cada 5 minutos, por ejemplo: `*/5 * * * *` (cron en inglés).

Guarda el job y actívalo.

### Opción B: pg_cron + pg_net (desde SQL)

Si en tu proyecto tienes **pg_cron** y **pg_net** (o solo pg_net y otro mecanismo para programar):

1. Habilitar extensión (si no está):  
   `CREATE EXTENSION IF NOT EXISTS pg_net;`  
   (y pg_cron si lo uses.)
2. Guardar la URL y el **service_role** en Vault (recomendado) o usar variables.
3. Programar una llamada HTTP POST a la URL de la función con el header `Authorization: Bearer <service_role_key>`.

Ejemplo conceptual (adaptar a tu esquema y a si usas Vault):

```sql
-- Ejemplo: invocar cada 5 min (requiere pg_cron + pg_net y que la URL/key estén configuradas)
-- SELECT cron.schedule(
--   'process-bank-emails',
--   '*/5 * * * *',
--   $$ SELECT net.http_post(
--        'https://TU_REF.supabase.co/functions/v1/process-bank-emails',
--        '{}',
--        '{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'
--      ) $$
-- );
```

Sustituye `TU_REF` y `TU_SERVICE_ROLE_KEY` por los valores de tu proyecto. El **service_role** no debe exponerse en el frontend; solo en backend o en este tipo de jobs.

---

## 8. Probar que funcionan

- **gmail-oauth**: Conectar Gmail desde la app (Configuración → Integración email). Si la función está desplegada y los secretos bien puestos, el flujo debe guardar los tokens en `email_integrations`.
- **process-bank-emails**: Desde Postman, curl o un “Sincronizar ahora” en la app:
  - `POST https://TU_REF.supabase.co/functions/v1/process-bank-emails`
  - Header: `Authorization: Bearer TU_SERVICE_ROLE_KEY`
  - Body vacío o `{}`

Revisa en el Dashboard → Edge Functions → Logs si hay errores (por ejemplo “Gmail OAuth not configured” = faltan secretos).

---

## 9. Resumen rápido

| Paso | Dónde / Cómo |
|------|----------------|
| 0. ¿Está vinculado? | Desde `app/`: `supabase migration list --linked` (o `npx supabase migration list --linked` si usas npm). Si pide proyecto o falla, hacer paso 1. |
| 1. Vincular proyecto | Desde `app/`: `supabase link --project-ref frlgxhyacaamngkvsujr` (o con `npx supabase`; contraseña DB si la pide) |
| 2. Desplegar funciones | Desde `app/`: `supabase functions deploy gmail-oauth` y `supabase functions deploy process-bank-emails` (o `npx supabase functions deploy ...`) |
| 3. Secretos Google | Dashboard → Project Settings → Edge Functions → Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| 4. Cron process-bank-emails | Dashboard → Cron Jobs → job cada 5 min que haga POST a la URL de la función con header `Authorization: Bearer <service_role_key>` |

Con esto, las Edge Functions quedan desplegadas y la automatización de emails bancarios puede ejecutarse cada 5 minutos. Si quieres, en el siguiente paso podemos revisar la URL exacta que usa tu `SupabaseService` para que coincida con la de la función.

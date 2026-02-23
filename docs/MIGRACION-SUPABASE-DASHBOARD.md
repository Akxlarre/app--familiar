# Guía: Aplicar migraciones en el SQL Editor del dashboard de Supabase

Si no usas Supabase CLI (`supabase db push`) y gestionas la base desde el **dashboard online** de Supabase, puedes aplicar las migraciones manualmente desde el **SQL Editor**.

> **Edge Functions**: Las funciones **gmail-oauth** y **process-bank-emails** no se aplican desde el SQL Editor; se despliegan con la CLI y se configuran secretos/cron. Guía completa: **`docs/EDGE-FUNCTIONS-SUPABASE.md`**.

---

## 1. Dónde ejecutar

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard).
2. Selecciona tu proyecto.
3. En el menú lateral: **SQL Editor**.
4. Crea una **nueva query** para cada migración (o agrupa las que no dependan entre sí).

---

## 2. Orden obligatorio

Las migraciones deben ejecutarse **en este orden**, porque algunas dependen de tablas o funciones creadas en migraciones anteriores.

| Orden | Archivo | Descripción breve |
|-------|---------|-------------------|
| 1 | `20250219000000_modelo_datos_v1.sql` | Esquema base (households, profiles, expenses, etc.) |
| 2 | `20250219100000_households_rls_insert_fix.sql` | Fix RLS households |
| 3 | `20250220100000_household_invite_code.sql` | invite_code en households |
| 4 | `20250220110000_fn_create_household.sql` | RPC create_household |
| 5 | `20250220120000_storage_receipts_bucket.sql` | Storage bucket receipts (opcional si no usas storage) |
| 6 | `20250220200000_financial_redesign_v2.sql` | accounts, categories, transactions, budgets, etc. |
| 7 | `20250221100000_finanzas_mejoras_inmediatas.sql` | savings_goals, tags, transaction_tags, transaction_splits |
| 8 | `20250221150000_accounts_enriched.sql` | Cuentas: owner_profile_id, purpose, bank_name, digital_wallet |
| 9 | `20250221160000_email_integrations.sql` | Tabla email_integrations (Gmail OAuth) |
| 10 | `20250221170000_bank_email_parsers.sql` | Tabla bank_email_parsers |
| 11 | `20250221180000_email_transactions_log.sql` | Tabla email_transactions_log |
| 12 | `20250221190000_credit_card_details.sql` | Tabla credit_card_details |
| 13 | `20250221200000_installment_purchases.sql` | Tabla installment_purchases |
| 14 | `20250221210000_budgets_profile_scope.sql` | Columna profile_id en budgets |

---

## 3. Si ya tienes el proyecto base y solo quieres “lo nuevo” (Sistema Financiero Inteligente)

Asume que ya tienes aplicadas al menos:

- Esquema base (modelo_datos_v1)
- Rediseño finanzas (financial_redesign_v2)
- Mejoras inmediatas (finanzas_mejoras_inmediatas) — para tener `belongs_to_household` y tablas de finanzas actuales

Entonces aplica **solo estas**, en este orden:

1. **20250221150000_accounts_enriched.sql**
2. **20250221160000_email_integrations.sql**
3. **20250221170000_bank_email_parsers.sql**
4. **20250221180000_email_transactions_log.sql**
5. **20250221190000_credit_card_details.sql**
6. **20250221200000_installment_purchases.sql**
7. **20250221210000_budgets_profile_scope.sql**

En el SQL Editor: **New query** → pegar el contenido del archivo → **Run**.

---

## 4. Dónde están los archivos

Ruta en el repo:

```
app/supabase/migrations/<nombre_archivo>.sql
```

Ejemplo: `app/supabase/migrations/20250221150000_accounts_enriched.sql`.

Copia todo el contenido del `.sql` (incluidos comentarios) y pégalo en una nueva query en el SQL Editor antes de ejecutar.

---

## 5. Requisitos previos

- La función **`belongs_to_household(uuid)`** debe existir (suele crearse en el rediseño finanzas o en el esquema base). Si falta, las políticas RLS de `bank_email_parsers`, `email_transactions_log`, `installment_purchases` y `credit_card_details` fallarán.
- **`uuid_generate_v4()`**: extensión `uuid-ossp` o `pgcrypto`. Si falla, ejecuta antes: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- Las tablas **`profiles`**, **`households`**, **`accounts`**, **`categories`** deben existir antes de las migraciones 8–14.

---

## 6. Si algo falla

- **“relation already exists”**: Esa migración ya está aplicada; puedes omitirla o usar `IF NOT EXISTS` / `DROP ... IF EXISTS` según lo que tenga el script.
- **“function belongs_to_household does not exist”**: Aplica antes la migración que define esa función (p. ej. financial_redesign_v2 o la que corresponda en tu proyecto).
- **“column already exists”**: Las migraciones usan `ADD COLUMN IF NOT EXISTS` donde aplica; si aun así falla, revisa que no hayas ejecutado dos veces la misma migración con sentencias sin `IF NOT EXISTS`.

---

## 7. Resumen rápido (solo “lo nuevo”)

1. Dashboard Supabase → **SQL Editor**.
2. Para cada archivo del **§3** (del 20250221150000 al 20250221210000): **New query** → pegar contenido del archivo en `app/supabase/migrations/` → **Run**.
3. Verificar que no haya errores en rojo; si todo es correcto, la base queda con cuentas enriquecidas, integración email, parsers, log de sugeridas, tarjetas de crédito, cuotas y presupuestos con scope personal/hogar.

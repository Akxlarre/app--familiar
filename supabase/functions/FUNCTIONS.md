# Edge Functions de Supabase

> Índice de todas las Edge Functions del proyecto. Se actualiza al crear, modificar o eliminar una función.
> Guía de despliegue y secretos: `docs/EDGE-FUNCTIONS-SUPABASE.md`

## Funciones

| Función | Descripción | Invocación | Secretos | Docs |
|---------|-------------|------------|----------|------|
| `gmail-oauth` | Intercambio de código OAuth de Google por tokens; guarda en `email_integrations` | POST desde frontend (tras redirect OAuth) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [index.ts](gmail-oauth/index.ts) |
| `process-bank-emails` | Lee correos Gmail, aplica parsers, extrae datos y crea transacciones o las deja pendientes | POST vía cron (cada 5 min) o bajo demanda | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [index.ts](process-bank-emails/index.ts) |
| `reprocess-pending-logs` | Reintenta crear transacciones para logs en `pending_review` usando la configuración actual de cuentas | POST desde frontend (JWT) | — | [index.ts](reprocess-pending-logs/index.ts) |
| `ocr-receipt` | OCR de boletas con Google Cloud Vision; extrae monto, fecha y comercio | POST con `{ storage_path }` | `GOOGLE_VISION_API_KEY` | [index.ts](ocr-receipt/index.ts) |
| `scan-receipt-inventory` | Escaneo de boleta con Gemini 1.5 Pro Vision; devuelve items estructurados para inventario | POST con `{ storage_path, household_id }` (JWT opcional) | `GEMINI_API_KEY` | [index.ts](scan-receipt-inventory/index.ts) |
| `search-food` | Proxy a Open Food Facts; busca por query o barcode y guarda resultado en `foods` | POST con `{ query?, barcode? }` | — | [index.ts](search-food/index.ts) |

## Tablas que usan

| Función | Tablas |
|---------|--------|
| `gmail-oauth` | `profiles`, `email_integrations` |
| `process-bank-emails` | `email_integrations`, `bank_email_parsers`, `email_transactions_log`, `transactions`, `categories`, `accounts` |
| `reprocess-pending-logs` | `profiles`, `email_transactions_log`, `bank_email_parsers`, `accounts`, `transactions`, `categories` |
| `ocr-receipt` | `storage.objects` (bucket `receipts`) |
| `search-food` | `foods` |

## Variables inyectadas automáticamente

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — las provee Supabase al ejecutar la función; no necesitan configurarse manualmente.

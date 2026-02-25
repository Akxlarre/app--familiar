# FamilyApp — Supabase Migrations Registry

Registro de todas las migraciones SQL del proyecto. Actualizar esta tabla al crear/modificar migraciones.

| Archivo | Dominio | Tipo | Descripción | Estado |
|---------|---------|------|-------------|--------|
| `20250219000000_modelo_datos_v1.sql` | core/all | create | Esquema base: households, profiles, invites, gastos, boletas, inventario, comidas, ejercicio, notas. RLS + Realtime. | ✅ aplicado |
| `20250219100000_households_rls_insert_fix.sql` | core | fix | Corrige política INSERT en households. | ✅ aplicado |
| `20250220100000_household_invite_code.sql` | core | alter | Añade `invite_code` a households. | ✅ aplicado |
| `20250220110000_fn_create_household.sql` | core | fn | RPC para crear hogar con código único. | ✅ aplicado |
| `20250220120000_storage_receipts_bucket.sql` | storage | create | Bucket `receipts` en Supabase Storage. | ✅ aplicado |
| `20250220200000_financial_redesign_v2.sql` | finance | alter | Rediseño financiero v2: accounts, transactions, categories. | ✅ aplicado |
| `20250221100000_finanzas_mejoras_inmediatas.sql` | finance | create | savings_goals, tags, transaction_tags, transaction_splits. | ✅ aplicado |
| `20250221150000_accounts_enriched.sql` | finance | alter | owner_profile_id, purpose, bank_name, digital_wallet en accounts. | ✅ aplicado |
| `20250221160000_email_integrations.sql` | finance | create | OAuth Gmail: email_integrations. | ✅ aplicado |
| `20250221170000_bank_email_parsers.sql` | finance | create | Parsers de emails bancarios: bank_email_parsers. | ✅ aplicado |
| `20250221180000_email_transactions_log.sql` | finance | create | Log de transacciones extraídas de emails: email_transactions_log. | ✅ aplicado |
| `20250221190000_credit_card_details.sql` | finance | create | Detalle de crédito: credit_card_details. | ✅ aplicado |
| `20250221200000_installment_purchases.sql` | finance | create | Cuotas: installment_purchases. | ✅ aplicado |
| `20250221210000_budgets_profile_scope.sql` | finance | alter | profile_id en budgets (scope personal). | ✅ aplicado |
| `20250221220000_accounts_card_last4.sql` | finance | alter | last4 en accounts. | ✅ aplicado |
| `20250222000000_ensure_rls_policies.sql` | core | rls | Políticas RLS faltantes. | ✅ aplicado |
| `20250222010000_email_transactions_log_internal_date.sql` | finance | alter | internal_date en email_transactions_log. | ✅ aplicado |
| `20250222100000_bank_email_parsers_default_account.sql` | finance | alter | default_account en bank_email_parsers. | ✅ aplicado |
| `20250222110000_accounts_linked_email_and_inbox.sql` | finance | alter | linked_email, inbox_folder en accounts. | ✅ aplicado |
| `20250222120000_bank_email_parsers_payment_received.sql` | finance | alter | payment_received en bank_email_parsers. | ✅ aplicado |
| `20250223100000_fn_join_household_by_code.sql` | core | fn | RPC para unirse al hogar con código. | ✅ aplicado |
| `20250223200000_households_timezone.sql` | core | alter | timezone en households. | ✅ aplicado |
| `20260224000000_fitness_module_v1.sql` | fitness | create | Módulo Fitness v1: exercises, routines, routine_exercises, workout_sessions, session_sets. | ✅ aplicado |
| `20260224100000_routine_exercises_notes.sql` | fitness | alter | notes en routine_exercises. | ✅ aplicado |
| `20260224110000_inventory_module_v1.sql` | inventory | create | Módulo Inventario v1: products enriquecidos, inventory_logs, shopping_lists, shopping_list_items, price_records. | ✅ aplicado |
| `20260224120000_price_history_units_in_pack.sql` | inventory | alter | units_in_pack en price_records. | ✅ aplicado |
| `20260225000000_nutrition_module_v1.sql` | nutrition | create | Módulo Nutrición v1: foods, food_aliases, nutrition_profiles, saved_meals, saved_meal_items, food_logs, daily_nutrition_summaries. | ✅ aplicado |
| `20260225100000_meals_module_v1.sql` | meals | alter+create | Módulo Comidas v1: evoluciona recipes (prep_time, meal_type, tags, etc.), recipe_ingredients (food_id), meal_plans (week_start_date, status). Crea meal_plan_slots. Añade source 'meal_plan' y plan_id a shopping_list_items. | ✅ aplicado |

// Supabase Edge Function: reprocess-pending-logs
// Reintenta crear transacciones para logs en pending_review usando la configuración actual de cuentas.
// Útil tras configurar Banco + Email vinculado en Finanzas → Cuentas.
// POST con Authorization: Bearer <user JWT>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingLog {
  id: string;
  profile_id: string;
  household_id: string;
  inbox_email: string | null;
  raw_subject: string | null;
  raw_snippet: string | null;
  extracted_data: Record<string, unknown>;
  bank_parser: {
    bank_name: string;
    email_type: string;
    body_rules?: Record<string, string>;
    default_account_id?: string | null;
  } | null;
}

interface AccountRow {
  id: string;
  bank_name: string | null;
  linked_email: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await userClient
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .maybeSingle();

    const householdId = (profile as { household_id: string } | null)?.household_id;
    if (!householdId) {
      return new Response(JSON.stringify({ error: 'Usuario sin hogar asignado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: pendingRows } = await supabase
      .from('email_transactions_log')
      .select('id, profile_id, household_id, inbox_email, raw_subject, raw_snippet, extracted_data, bank_email_parsers(bank_name, email_type, body_rules, default_account_id)')
      .eq('household_id', householdId)
      .eq('status', 'pending_review');

    const pendingLogs = (pendingRows ?? []).map((row) => {
      const p = row.bank_email_parsers;
      const parser = Array.isArray(p) && p[0] ? p[0] : p && typeof p === 'object' && 'bank_name' in p ? p : null;
      return {
        id: row.id,
        profile_id: row.profile_id,
        household_id: row.household_id,
        inbox_email: row.inbox_email ?? null,
        raw_subject: row.raw_subject ?? null,
        raw_snippet: row.raw_snippet ?? null,
        extracted_data: (row.extracted_data as Record<string, unknown>) ?? {},
        bank_parser: parser
          ? {
              bank_name: (parser as Record<string, unknown>).bank_name as string,
              email_type: (parser as Record<string, unknown>).email_type as string,
              body_rules: ((parser as Record<string, unknown>).body_rules as Record<string, string>) ?? {},
              default_account_id: (parser as Record<string, unknown>).default_account_id as string | null | undefined,
            }
          : null,
      };
    }) as PendingLog[];

    if (pendingLogs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, stillPending: 0, message: 'No hay pendientes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si los logs tienen inbox_email null (creados antes de añadir el campo), obtenerlo de email_integrations
    const { data: integrations } = await supabase
      .from('email_integrations')
      .select('profile_id, inbox_email')
      .eq('household_id', householdId)
      .eq('provider', 'gmail')
      .eq('is_active', true);
    const inboxByProfile = new Map<string, string>();
    for (const i of integrations ?? []) {
      const row = i as { profile_id: string; inbox_email: string | null };
      const email = row.inbox_email?.trim();
      if (email) {
        inboxByProfile.set(row.profile_id, email);
      } else if (row.profile_id === user.id && user.email?.trim()) {
        inboxByProfile.set(row.profile_id, user.email.trim());
      }
    }

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, bank_name, linked_email')
      .eq('household_id', householdId)
      .eq('is_active', true);

    const { data: defaultExpenseCat } = await supabase
      .from('categories')
      .select('id')
      .is('household_id', null)
      .eq('name', 'Otro gasto')
      .eq('type', 'expense')
      .limit(1)
      .maybeSingle();

    const { data: defaultIncomeCat } = await supabase
      .from('categories')
      .select('id')
      .is('household_id', null)
      .eq('name', 'Otros ingresos')
      .eq('type', 'income')
      .limit(1)
      .maybeSingle();

    const expenseCategoryId = defaultExpenseCat?.id;
    const incomeCategoryId = defaultIncomeCat?.id;
    const accountList = (accounts as AccountRow[] | null) ?? [];

    let processed = 0;

    for (const log of pendingLogs) {
      let amount = typeof log.extracted_data?.amount === 'number' ? log.extracted_data.amount : null;
      let extractedData = { ...log.extracted_data };

      if (amount == null || amount <= 0) {
        const rules = log.bank_parser?.body_rules ?? {};
        const amountRegex = rules['amount_regex'] || rules['amount'];
        const merchantRegex = rules['merchant_regex'] || rules['merchant'];
        const bodyText = [log.raw_snippet ?? '', log.raw_subject ?? ''].filter(Boolean).join('\n');
        if (amountRegex && bodyText) {
          try {
            const m = bodyText.match(new RegExp(amountRegex, 'i'));
            if (m?.[1]) amount = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || null;
            else if (m?.[0]) amount = parseFloat(m[0].replace(/\./g, '').replace(',', '.')) || null;
            if (amount != null) extractedData['amount'] = amount;
            if (merchantRegex) {
              const mm = bodyText.match(new RegExp(merchantRegex, 'i'));
              const merchant = mm?.[1] ?? mm?.[0] ?? null;
              if (merchant) extractedData['merchant'] = merchant;
            }
          } catch {
            /* regex inválida */
          }
        }
      }
      if (amount == null || amount <= 0) continue;

      const parserBank = log.bank_parser?.bank_name?.trim().toLowerCase();
      const inboxEmailRaw = log.inbox_email?.trim() || inboxByProfile.get(log.profile_id)?.trim();
      const inboxEmail = inboxEmailRaw?.toLowerCase();
      const defaultAccountId = log.bank_parser?.default_account_id?.trim() || null;

      let match = accountList.find((a) => {
        const accEmail = a.linked_email?.trim().toLowerCase();
        const accBank = a.bank_name?.trim().toLowerCase();
        if (!accEmail || accEmail !== inboxEmail) return false;
        if (!accBank) return false;
        return accBank === parserBank || accBank.includes(parserBank) || parserBank.includes(accBank);
      });

      if (!match && defaultAccountId && accountList.some((a) => a.id === defaultAccountId)) {
        match = accountList.find((a) => a.id === defaultAccountId) ?? null;
      }
      if (!match) continue;

      const isIncome = log.bank_parser?.email_type === 'payment_received';
      const categoryId = isIncome ? incomeCategoryId : expenseCategoryId;
      if (!categoryId) continue;

      const txType = isIncome ? 'income' : 'expense';
      const merchant = extractedData?.merchant ?? log.extracted_data?.merchant;
      const note = (typeof merchant === 'string' ? merchant : log.raw_subject ?? '')?.slice(0, 200) || null;
      const emailDate =
        (typeof extractedData?.email_internal_date === 'string'
          ? extractedData.email_internal_date
          : typeof log.extracted_data?.email_internal_date === 'string'
            ? log.extracted_data.email_internal_date
            : null) ?? new Date().toISOString().slice(0, 10);

      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          household_id: log.household_id,
          profile_id: log.profile_id,
          account_id: match.id,
          category_id: categoryId,
          type: txType,
          amount,
          date: emailDate,
          note,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (!txErr && tx?.id) {
        await supabase
          .from('email_transactions_log')
          .update({
            status: 'auto_created',
            transaction_id: tx.id,
            processed_at: new Date().toISOString(),
          })
          .eq('id', log.id);
        processed++;
      }
    }

    const stillPending = pendingLogs.length - processed;

    let message = 'No hay pendientes';
    if (processed > 0) {
      message = `Se crearon ${processed} transacción(es)`;
    } else if (stillPending > 0) {
      const first = pendingLogs[0];
      let firstAmount = typeof first.extracted_data?.amount === 'number' ? first.extracted_data.amount : null;
      if (firstAmount == null && first.bank_parser?.body_rules) {
        const rules = first.bank_parser.body_rules;
        const amountRegex = rules['amount_regex'] || rules['amount'];
        const bodyText = [first.raw_snippet ?? '', first.raw_subject ?? ''].filter(Boolean).join('\n');
        if (amountRegex && bodyText) {
          try {
            const m = bodyText.match(new RegExp(amountRegex, 'i'));
            if (m?.[1]) firstAmount = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
            else if (m?.[0]) firstAmount = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
          } catch {
            /* */
          }
        }
      }
      const bank = first.bank_parser?.bank_name ?? '?';
      const email = (first.inbox_email?.trim() || inboxByProfile.get(first.profile_id)?.trim()) ?? 'tu Gmail';
      if (firstAmount == null || firstAmount <= 0) {
        message = `No se pudo extraer el monto del correo. Verifica el Regex monto en Configuración → Integración email para el parser "${bank}" (asunto: "${(first.raw_subject ?? '').slice(0, 40)}...").`;
      } else {
        message = `En Finanzas → Cuentas, edita la cuenta y pon Banco = "${bank}" y Email vinculado = "${email}". O asigna Cuenta por defecto en el parser.`;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed,
        stillPending,
        message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

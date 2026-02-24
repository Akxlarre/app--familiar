// Supabase Edge Function: process-bank-emails
// Lee correos de Gmail, aplica parsers y crea registros en email_transactions_log.
// Invocar por cron con: POST + Authorization: Bearer SERVICE_ROLE_KEY
// Límites: max 20 emails por run para evitar timeout 546.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_EMAILS_PER_RUN = 10;
const DAYS_BACK = 90;

interface EmailIntegration {
  id: string;
  profile_id: string;
  household_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
}

interface BankParser {
  id: string;
  household_id: string;
  bank_name: string;
  sender_pattern: string;
  subject_pattern: string | null;
  body_rules: Record<string, string>;
  email_type: string;
  default_account_id?: string | null;
}

interface AccountRow {
  id: string;
  bank_name: string | null;
  linked_email: string | null;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  internalDate?: string;
}

interface GmailMessageDetail {
  id: string;
  payload?: {
    headers?: { name: string; value: string }[];
    body?: { data?: string };
    parts?: { mimeType: string; body?: { data?: string } }[];
  };
  internalDate?: string;
  snippet?: string;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Gmail not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: integrations } = await supabase
      .from('email_integrations')
      .select('id, profile_id, household_id, access_token, refresh_token, token_expiry')
      .eq('provider', 'gmail')
      .eq('is_active', true);

    if (!integrations?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: 'No active integrations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - DAYS_BACK);
    const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`;

    let totalProcessed = 0;

    for (const integration of integrations as EmailIntegration[]) {
      if (totalProcessed >= MAX_EMAILS_PER_RUN) break;

      let accessToken = integration.access_token;
      const needsRefresh =
        !accessToken ||
        (integration.token_expiry && new Date(integration.token_expiry) <= new Date(Date.now() + 5 * 60 * 1000));

      if (needsRefresh && integration.refresh_token) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            refresh_token: integration.refresh_token,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
          }),
        });
        if (tokenRes.ok) {
          const tokens = (await tokenRes.json()) as { access_token: string; expires_in?: number };
          accessToken = tokens.access_token;
          const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
          await supabase
            .from('email_integrations')
            .update({ access_token: accessToken, token_expiry: expiresAt, last_error: null, updated_at: new Date().toISOString() })
            .eq('id', integration.id);
        } else {
          await supabase
            .from('email_integrations')
            .update({ last_error: 'Token refresh failed', updated_at: new Date().toISOString() })
            .eq('id', integration.id);
          continue;
        }
      }

      if (!accessToken) continue;

      // Obtener email del inbox Gmail para enlazar con accounts.linked_email
      let inboxEmail: string | null = null;
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profileData = (await profileRes.json()) as { emailAddress?: string };
        inboxEmail = profileData.emailAddress?.trim() || null;
        if (inboxEmail) {
          await supabase
            .from('email_integrations')
            .update({ inbox_email: inboxEmail, updated_at: new Date().toISOString() })
            .eq('id', integration.id);
        }
      }

      const { data: parsers } = await supabase
        .from('bank_email_parsers')
        .select('id, household_id, bank_name, sender_pattern, subject_pattern, body_rules, email_type')
        .eq('household_id', integration.household_id)
        .eq('is_active', true);

      if (!parsers?.length) continue;

      const { data: hhRow } = await supabase
        .from('households')
        .select('timezone')
        .eq('id', integration.household_id)
        .maybeSingle();
      const householdTz = ((hhRow as { timezone?: string } | null)?.timezone?.trim()) || 'America/Santiago';

      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, bank_name, linked_email')
        .eq('household_id', integration.household_id)
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

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${MAX_EMAILS_PER_RUN}&q=after:${afterStr}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!listRes.ok) {
        const errText = await listRes.text();
        await supabase
          .from('email_integrations')
          .update({ last_error: `Gmail list failed: ${errText.slice(0, 200)}`, updated_at: new Date().toISOString() })
          .eq('id', integration.id);
        continue;
      }

      const listData = (await listRes.json()) as { messages?: { id: string }[] };
      const messages = listData.messages ?? [];
      if (messages.length === 0) continue;

      for (const msg of messages) {
        if (totalProcessed >= MAX_EMAILS_PER_RUN) break;

        const { data: existingLog } = await supabase
          .from('email_transactions_log')
          .select('id, status, transaction_id')
          .eq('profile_id', integration.profile_id)
          .eq('email_id', msg.id)
          .maybeSingle();

        if (existingLog?.status === 'auto_created' || existingLog?.status === 'rejected') {
          continue;
        }

        const getRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!getRes.ok) continue;

        const detail = (await getRes.json()) as GmailMessageDetail;
        const from = detail.payload?.headers?.find((h) => h.name.toLowerCase() === 'from')?.value ?? '';
        const subject = detail.payload?.headers?.find((h) => h.name.toLowerCase() === 'subject')?.value ?? '';
        const snippet = detail.snippet ?? '';

        const senderMatches = (parsers as BankParser[]).filter((p) =>
          from.toLowerCase().includes(p.sender_pattern.toLowerCase())
        );
        const subjectLower = subject.toLowerCase();
        const matchingParser =
          senderMatches.find(
            (p) =>
              p.subject_pattern?.trim() &&
              subjectLower.includes(p.subject_pattern.trim().toLowerCase())
          ) ?? senderMatches.find((p) => !p.subject_pattern?.trim()) ?? senderMatches[0];
        if (!matchingParser) continue;

        const decodeB64 = (s: string): string => {
          try {
            return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
          } catch {
            return '';
          }
        };
        let bodyText = snippet ?? '';
        if (detail.payload?.body?.data) {
          bodyText += '\n' + decodeB64(detail.payload.body.data);
        }
        for (const part of detail.payload?.parts ?? []) {
          if (part.body?.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
            bodyText += '\n' + decodeB64(part.body.data).replace(/<[^>]+>/g, ' ');
          }
        }

        const rules = matchingParser.body_rules ?? {};
        const amountRegex = rules['amount_regex'] || rules['amount'];
        const merchantRegex = rules['merchant_regex'] || rules['merchant'];

        let amount: number | null = null;
        let merchant: string | null = null;

        if (amountRegex) {
          const m = bodyText.match(new RegExp(amountRegex, 'i'));
          if (m?.[1]) amount = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || null;
          else if (m?.[0]) amount = parseFloat(m[0].replace(/\./g, '').replace(',', '.')) || null;
        }
        if (merchantRegex) {
          const m = bodyText.match(new RegExp(merchantRegex, 'i'));
          merchant = m?.[1] ?? m?.[0] ?? null;
        }

        const confidence = amount != null ? (merchant ? 85 : 70) : 40;
        const extractedData: Record<string, unknown> = {};
        if (amount != null) extractedData['amount'] = amount;
        if (merchant) extractedData['merchant'] = merchant;
        let emailDate = '';
        if (detail.internalDate) {
          const d = new Date(parseInt(String(detail.internalDate)));
          if (!isNaN(d.getTime())) {
            const fmt = new Intl.DateTimeFormat('en-CA', {
              timeZone: householdTz,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
            emailDate = fmt.format(d);
            extractedData['email_internal_date'] = emailDate;
          }
        }
        if (!emailDate) emailDate = new Date().toISOString().slice(0, 10);

        let accountId: string | null = null;
        const accountList = (accounts as AccountRow[] | null) ?? [];
        const parserBank = (matchingParser as BankParser).bank_name?.trim().toLowerCase();
        if (inboxEmail && parserBank && accountList.length) {
          const match = accountList.find((a) => {
            const accEmail = a.linked_email?.trim().toLowerCase();
            const accBank = a.bank_name?.trim().toLowerCase();
            if (!accEmail || accEmail !== inboxEmail.toLowerCase()) return false;
            if (!accBank) return false;
            return accBank === parserBank || accBank.includes(parserBank) || parserBank.includes(accBank);
          });
          if (match) accountId = match.id;
        }

        let status: 'auto_created' | 'pending_review' = 'pending_review';
        let transactionId: string | null = null;

        if (amount != null && amount > 0 && accountId) {
          const isIncome = (matchingParser as BankParser).email_type === 'payment_received';
          const categoryId = isIncome ? incomeCategoryId : expenseCategoryId;
          const txType = isIncome ? 'income' : 'expense';
          const note = merchant ? String(merchant).trim() : (subject || '').slice(0, 200);

          if (categoryId) {
            const { data: tx, error: txErr } = await supabase
              .from('transactions')
              .insert({
                household_id: integration.household_id,
                profile_id: integration.profile_id,
                account_id: accountId,
                category_id: categoryId,
                type: txType,
                amount,
                date: emailDate,
                note: note || null,
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (!txErr && tx?.id) {
              transactionId = tx.id;
              status = 'auto_created';
            }
          }
        }

        const { error: insertErr } = await supabase.from('email_transactions_log').upsert(
          {
            email_id: msg.id,
            profile_id: integration.profile_id,
            household_id: integration.household_id,
            bank_parser_id: matchingParser.id,
            raw_subject: subject,
            raw_snippet: snippet.slice(0, 500),
            extracted_data: extractedData,
            confidence_score: confidence,
            status,
            transaction_id: transactionId,
            inbox_email: inboxEmail,
            processed_at: new Date().toISOString(),
          },
          { onConflict: 'profile_id,email_id' }
        );

        if (!insertErr) totalProcessed++;
      }

      await supabase
        .from('email_integrations')
        .update({ last_sync_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
        .eq('id', integration.id);
    }

    return new Response(
      JSON.stringify({ ok: true, processed: totalProcessed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

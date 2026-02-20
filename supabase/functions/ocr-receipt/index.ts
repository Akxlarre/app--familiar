// Supabase Edge Function: OCR de boletas con Google Cloud Vision API
// Requiere: GOOGLE_VISION_API_KEY en secrets. Bucket "receipts" debe existir.
// Invocación: POST con JSON { "storage_path": "household_id/uuid.jpg" }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OcrResult {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  rawText?: string;
}

function parseAmountFromText(text: string): number | null {
  // Buscar patrones como $12.345, 12345, Total: 12345
  const patterns = [
    /\$\s*([\d.,]+)/,
    /total[:\s]*([\d.,]+)/i,
    /([\d]{1,3}(?:\.[\d]{3})*(?:,[\d]+)?)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const num = m[1].replace(/\./g, '').replace(',', '.');
      const n = parseFloat(num);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function parseDateFromText(text: string): string | null {
  // DD/MM/YYYY o DD-MM-YYYY
  const m = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

function parseMerchantFromText(text: string): string | null {
  // Primera línea no vacía suele ser el comercio
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_VISION_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { storage_path } = (await req.json()) as { storage_path?: string };
    if (!storage_path) {
      return new Response(
        JSON.stringify({ error: 'storage_path required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(storage_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: downloadError?.message || 'Failed to download image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }),
      }
    );

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      return new Response(
        JSON.stringify({ error: `Vision API: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionJson = await visionRes.json();
    const text =
      visionJson.responses?.[0]?.fullTextAnnotation?.text ||
      visionJson.responses?.[0]?.textAnnotations?.[0]?.description ||
      '';

    const result: OcrResult = {
      amount: parseAmountFromText(text),
      date: parseDateFromText(text),
      merchant: parseMerchantFromText(text),
      rawText: text.slice(0, 2000),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

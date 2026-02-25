// Supabase Edge Function: scan-receipt-inventory
// Extrae items estructurados de una boleta chilena usando Gemini 1.5 Pro Vision.
// Requiere: GEMINI_API_KEY en secrets. Bucket "receipts" debe existir.
// Invocación: POST con JSON { "storage_path": "household_id/uuid.jpg", "household_id": "..." }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanItem {
  raw_name: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  is_pack?: boolean;
  units_in_pack?: number | null;
}

interface ScanResult {
  store_name: string | null;
  date: string | null;
  total: number | null;
  items: ScanItem[];
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function guessMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

const NON_PRODUCT_KEYWORDS = [
  'descuento', 'total', 'subtotal', 'iva', 'vuelto', 'efectivo', 'tarjeta',
  'credito', 'debito', 'cambio', 'pagado', 'neto', 'bruto',
];

function isNonProduct(rawName: string): boolean {
  const lower = rawName.toLowerCase().trim();
  return NON_PRODUCT_KEYWORDS.some((kw) => lower.includes(kw));
}

function normalizeRawNameForMerge(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\s+(despensa|refrigerador|freezer)$/i, '')
    .trim()
    .toLowerCase();
}

function mergeDuplicateItems(items: ScanItem[]): ScanItem[] {
  const byName = new Map<string, ScanItem>();
  for (const item of items) {
    const key = normalizeRawNameForMerge(item.raw_name);
    const existing = byName.get(key);
    if (existing) {
      existing.quantity += item.quantity || 1;
      if (item.unit_price != null && existing.unit_price == null) existing.unit_price = item.unit_price;
      if (item.total_price != null) {
        existing.total_price = (existing.total_price ?? 0) + item.total_price;
      }
    } else {
      byName.set(key, { ...item, quantity: item.quantity || 1 });
    }
  }
  return Array.from(byName.values());
}

const PACKAGED_PATTERNS = [
  /\d+\s*(g|gr|gramos?|ml|cc|l|litros?)\b/i,
  /\b(lata|tarro|botella|envase|pack|bolsa|sobre|caja)\b/i,
  /\b(atun|sardinas|palmitos|aceite|salsa|conserva|leche|yogurt|jugo|agua|bebida)\b/i,
];

function looksLikePackagedProduct(rawName: string): boolean {
  return PACKAGED_PATTERNS.some((re) => re.test(rawName));
}

function normalizeUnitForPackaged(items: ScanItem[]): ScanItem[] {
  return items.map((item) => {
    const unit = (item.unit || 'unidad').toLowerCase();
    if ((unit === 'g' || unit === 'ml') && looksLikePackagedProduct(item.raw_name)) {
      return { ...item, unit: 'unidad' };
    }
    return item;
  });
}

const QUANTITY_FROM_NAME_PATTERNS = [
  { re: /(\d+)UN\b/i, excludeIfDimensions: false },
  { re: /\b(\d+)X\d+/i, excludeIfDimensions: true },
  { re: /PACK\s+DE\s+(\d+)[Rr]?/i, excludeIfDimensions: false },
  { re: /(\d+)\s*ROLLOS?/i, excludeIfDimensions: false },
  { re: /(\d+)ROLLOS?/i, excludeIfDimensions: false },
];

const DIMENSION_PATTERN = /\d+[Xx]\d+\s*(cm|mts?|mt|mm)\b/i;

function extractQuantityFromName(rawName: string): number | null {
  for (const { re, excludeIfDimensions } of QUANTITY_FROM_NAME_PATTERNS) {
    const m = rawName.match(re);
    if (m) {
      if (excludeIfDimensions && DIMENSION_PATTERN.test(rawName)) continue;
      const n = parseInt(m[1], 10);
      if (n > 1 && n <= 999) return n;
    }
  }
  return null;
}

function applyQuantityFromNameHeuristic(items: ScanItem[]): ScanItem[] {
  return items.map((item) => {
    const fromName = extractQuantityFromName(item.raw_name);
    if (fromName != null) {
      let receiptQty = item.quantity || 1;
      if (receiptQty === fromName) {
        receiptQty = 1;
      }
      const totalUnits = receiptQty * fromName;
      return {
        ...item,
        quantity: totalUnits,
        unit: 'unidad',
        is_pack: true,
        units_in_pack: fromName,
      };
    }
    return item;
  });
}

function postProcessItems(items: ScanItem[]): ScanItem[] {
  let result = items.filter((i) => !isNonProduct(i.raw_name));
  result = mergeDuplicateItems(result);
  result = applyQuantityFromNameHeuristic(result);
  result = normalizeUnitForPackaged(result);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as { storage_path?: string; household_id?: string };
    const storagePath = body.storage_path;
    const householdId = body.household_id;
    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: 'storage_path required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!householdId) {
      return new Response(
        JSON.stringify({ error: 'household_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validar JWT manualmente (función desplegada con --no-verify-jwt)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const token = authHeader.slice(7);
    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single();
    if (!profile || profile.household_id !== householdId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: household does not belong to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: downloadError?.message || 'Failed to download image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
    );

    const mimeType = guessMimeType(storagePath);

    const prompt = `# ROL
Eres un experto en boletas electrónicas chilenas de supermercados y retail. Tu especialidad es interpretar nombres de productos y cantidades para inventario doméstico.

# CONTEXTO
El JSON que generes se usará para actualizar el inventario de una despensa familiar. La cantidad (quantity) debe reflejar cuántas unidades consumibles se agregan al inventario. Ejemplo: 1 pack de 6 cremas = 6 unidades en inventario.

# TAREA
Analiza la imagen de la boleta y extrae cada producto con: raw_name, quantity (unidades consumibles para inventario), unit, unit_price, total_price. Consolida duplicados en una sola entrada. Excluye líneas que no sean productos.

# FORMATO DE SALIDA
Devuelve ÚNICAMENTE un objeto JSON válido, sin markdown, sin \`\`\`json, sin explicaciones:
{"store_name": "string o null", "date": "YYYY-MM-DD o null", "total": number o null, "items": [{"raw_name": "string", "quantity": number, "unit": "string", "unit_price": number o null, "total_price": number o null}]}

# EJEMPLOS (columna Cantidad X Unitario en boleta → quantity esperado)
- "1 X 1100" TOALLA NOVA PACK DE 3R → quantity: 1 (el sistema deriva 3 unidades del nombre)
- "1 X 5940" PACK COLUN 6UN → quantity: 1 (el sistema deriva 6 unidades)
- "1 X 1500" ABUELOS CHAMP. 2X1500 → quantity: 1 (el sistema deriva 2 unidades)
- "12 X 590" COLUN YOGHURT → quantity: 12 (cantidad explícita en boleta)
- "1 X 1990" BRILLEX BOLSA 90X120CM → quantity: 1 (90X120 son dimensiones, no cantidad)
- "ESMERALDA PALMITOS 400G" (aparece 2 veces) → 1 item con quantity: 2, unit: "unidad"
- "QUESO RIO BUENO 500G" (1 tarro) → quantity: 1, unit: "unidad"
- "COLISEO LOMITO ATUN 100G" (3 latas) → quantity: 3, unit: "unidad"
- "DESCUENTO APLICADO" → NO incluir

# REGLAS (orden de prioridad)
1. quantity = número de la columna "Cantidad X Unitario" de la boleta (ej. "1 X 1100" → quantity: 1, "12 X 590" → quantity: 12). NO uses el número del nombre del producto (3R, 6UN) como quantity.
2. Para packs (NUN, NXM, PACK DE N, N ROLLOS): el sistema derivará las unidades del nombre. Tú solo extrae el número de la columna cantidad de la boleta.
3. Peso/volumen en nombre (400G, 500ML) = atributo del producto, NO la unidad de compra → unit: "unidad".
4. Mismo producto en varias líneas → consolidar en UNA entrada, sumar cantidades.
5. Excluir: descuento, total, subtotal, IVA, vuelto, efectivo, tarjeta.
6. raw_name = texto exacto como aparece en la boleta.
7. Precios en CLP (peso chileno).

# RESTRICCIONES
- NO incluir texto fuera del JSON.
- NO incluir comentarios, explicaciones ni markdown.
- NO usar "g" o "ml" como unit para productos envasados (latas, tarros, botellas).
- unit debe ser: "unidad" | "kg" | "g" | "L" | "ml" | "pack" | "otro"
`;

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Gemini API: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const geminiJson = await geminiRes.json();
    const text: string | undefined =
      geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ??
      geminiJson.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('\n');

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Gemini response without text content' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let parsed: ScanResult;
    try {
      parsed = JSON.parse(text) as ScanResult;
    } catch {
      // Intentar limpiar posibles rodeos de Markdown (```json ... ```)
      const cleaned = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleaned) as ScanResult;
    }

    // Normalización mínima por si faltan campos
    if (!parsed.items) parsed.items = [];

    // Post-procesamiento: filtrar no-productos, fusionar duplicados, heurística unit
    parsed.items = postProcessItems(parsed.items);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});


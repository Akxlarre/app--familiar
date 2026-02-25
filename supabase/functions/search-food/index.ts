// Supabase Edge Function: Proxy a Open Food Facts API + cache en tabla foods
// Invocación: POST con JSON { "query"?: string, "barcode"?: string }
// Si se encuentra en OFF, se guarda en public.foods (household_id null) y se devuelve.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Instancia chilena: prioriza productos vendidos/encontrados en Chile (visión FamilyApp).
const OFF_BASE_CL = 'https://cl.openfoodfacts.org/api/v2';
// Fallback global por si el producto no está en la base chilena (p. ej. importados).
const OFF_BASE_WORLD = 'https://world.openfoodfacts.org/api/v2';

interface OFFNutriments {
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number;
  'saturated-fat_100g'?: number;
}

interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: OFFNutriments;
}

function energyToKcal(kj: number | undefined): number {
  if (kj == null) return 0;
  return Math.round(kj / 4.184);
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
    const body = (await req.json()) as { query?: string; barcode?: string };
    const barcode = body.barcode?.trim();
    const query = body.query?.trim();
    if (!barcode && !query) {
      return new Response(
        JSON.stringify({ error: 'Provide query or barcode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let product: OFFProduct | null = null;
    if (barcode) {
      // Barcode: Chile primero, luego world (productos importados).
      for (const base of [OFF_BASE_CL, OFF_BASE_WORLD]) {
        const res = await fetch(`${base}/product/${barcode}.json`);
        if (res.ok) {
          const data = (await res.json()) as { product?: OFFProduct };
          if (data.product?.code) {
            product = data.product;
            break;
          }
        }
      }
    }
    if (!product && query) {
      // Búsqueda por texto: instancia chilena (productos locales).
      const res = await fetch(
        `${OFF_BASE_CL}/search?q=${encodeURIComponent(query)}&page_size=1`
      );
      if (res.ok) {
        const data = (await res.json()) as { products?: OFFProduct[] };
        product = data.products?.[0] ?? null;
      }
    }
    if (!product?.code) {
      return new Response(
        JSON.stringify({ data: null, cached: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const nut = product.nutriments ?? {};
    const calories100 = energyToKcal(nut.energy_100g);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: existing } = await supabase
      .from('foods')
      .select('id, name, brand, barcode, calories_100, protein_100, carbs_100, fat_100')
      .eq('barcode', product.code)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ data: existing, cached: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: inserted, error } = await supabase
      .from('foods')
      .insert({
        household_id: null,
        name: product.product_name ?? 'Sin nombre',
        brand: product.brands?.trim() ?? null,
        barcode: product.code,
        calories_100: calories100,
        protein_100: nut.proteins_100g ?? 0,
        carbs_100: nut.carbohydrates_100g ?? 0,
        fat_100: nut.fat_100g ?? 0,
        fiber_100: nut.fiber_100g ?? null,
        sugar_100: nut.sugars_100g ?? null,
        sodium_100: nut.sodium_100g ?? null,
        saturated_fat_100: nut['saturated-fat_100g'] ?? null,
        source: 'openfoodfacts',
      })
      .select('id, name, brand, barcode, calories_100, protein_100, carbs_100, fat_100')
      .single();
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ data: inserted, cached: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barcode } = await req.json();
    if (!barcode || typeof barcode !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Barcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Open Food Facts first
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const offData = await offRes.json();

    if (offData.status === 1 && offData.product) {
      const p = offData.product;
      return new Response(
        JSON.stringify({
          success: true,
          source: 'openfoodfacts',
          product: {
            name: p.product_name || p.product_name_en || '',
            category: guessCategory(p.categories_tags || []),
            notes: [p.brands, p.quantity].filter(Boolean).join(' — '),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try UPC ItemDB
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (upcRes.ok) {
      const upcData = await upcRes.json();
      if (upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        return new Response(
          JSON.stringify({
            success: true,
            source: 'upcitemdb',
            product: {
              name: item.title || '',
              category: guessCategory([item.category || '']),
              notes: [item.brand, item.description].filter(Boolean).join(' — '),
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: use Lovable AI to search
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY) {
      const aiRes = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You look up product barcodes. Return ONLY valid JSON with keys: name (string), category (one of: tools, materials, hardware, electrical, plumbing, paint, other), notes (brand and description). If unknown, return {"name":"","category":"other","notes":""}.',
            },
            { role: 'user', content: `What product has barcode/UPC: ${barcode}?` },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          try {
            const product = JSON.parse(content);
            if (product.name) {
              return new Response(
                JSON.stringify({ success: true, source: 'ai', product }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } catch { /* ignore parse error */ }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Product not found for this barcode' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Lookup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function guessCategory(tags: string[]): string {
  const joined = tags.join(' ').toLowerCase();
  if (/tool|wrench|drill|saw|hammer/.test(joined)) return 'tools';
  if (/wood|lumber|material|cement|concrete/.test(joined)) return 'materials';
  if (/screw|nail|bolt|hardware|fastener/.test(joined)) return 'hardware';
  if (/electric|wire|cable|switch|outlet/.test(joined)) return 'electrical';
  if (/plumb|pipe|faucet|valve/.test(joined)) return 'plumbing';
  if (/paint|stain|brush|roller/.test(joined)) return 'paint';
  return 'other';
}

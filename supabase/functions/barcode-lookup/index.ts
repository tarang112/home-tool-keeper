const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { barcode, url } = body;

    // URL-based lookup
    if (url && typeof url === 'string') {
      return await handleUrlLookup(url);
    }

    // Barcode-based lookup
    if (!barcode || typeof barcode !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Barcode or URL is required' }),
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

    // Fallback: use AI
    return await aiLookup(`What product has barcode/UPC: ${barcode}?`);
  } catch (error) {
    console.error('Lookup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Lookup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleUrlLookup(rawUrl: string): Promise<Response> {
  try {
    const url = rawUrl.match(/^https?:\/\//i) ? rawUrl : `https://${rawUrl}`;
    // Fetch the page HTML with browser-like headers
    const pageRes = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!pageRes.ok) {
      console.error('URL fetch failed:', pageRes.status, pageRes.statusText);
      // Fall back to AI with just the URL
      return await aiLookup(`Extract product details from this product page URL: ${url}`);
    }
    const html = await pageRes.text();

    // Extract basic meta/title info to reduce token usage
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is);
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/is);
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/is);

    const pageInfo = [
      `URL: ${url}`,
      titleMatch ? `Title: ${titleMatch[1].trim()}` : '',
      ogTitle ? `OG Title: ${ogTitle[1].trim()}` : '',
      metaDesc ? `Description: ${metaDesc[1].trim().slice(0, 500)}` : '',
      ogDesc ? `OG Description: ${ogDesc[1].trim().slice(0, 500)}` : '',
      // Get first 2000 chars of visible text-like content
      `Page excerpt: ${html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)}`,
    ].filter(Boolean).join('\n');

    return await aiLookup(
      `Extract product details from this webpage info:\n${pageInfo}\n\nReturn the product name, category, and notes (brand, description, specs).`
    );
  } catch (error) {
    console.error('URL lookup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'URL lookup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function aiLookup(prompt: string): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: 'AI not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
          content: 'You extract product information. Return ONLY valid JSON with keys: name (string), category (one of: tools, materials, hardware, electrical, plumbing, paint, other), notes (brand and description). If unknown, return {"name":"","category":"other","notes":""}.',
        },
        { role: 'user', content: prompt },
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

  return new Response(
    JSON.stringify({ success: false, error: 'Product not found' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

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

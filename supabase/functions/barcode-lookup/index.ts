const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CATEGORY_MAP = `
Valid main categories and their subcategories:
- hardware-tools: hand-tools, power-tools, fasteners, measuring, safety
- groceries: dairy, snacks, beverages, canned, frozen, bakery, condiments
- produce: fruits, vegetables, herbs
- household: cleaning, kitchen, bathroom, laundry, storage
- electrical: wiring, lighting, switches, batteries
- plumbing: pipes, fixtures, valves
- paint: interior-paint, exterior-paint, stain, brushes-rollers
- outdoor: garden-tools, seeds-plants, fertilizer, outdoor-furniture
- automotive: fluids, parts, car-care
- medicine: prescription, otc, vitamins, first-aid, medical-devices
- other: (no subcategories)
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { barcode, url } = body;

    if (url && typeof url === 'string') {
      return await handleUrlLookup(url);
    }

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
      const catInfo = guessCategory(p.categories_tags || []);
      return jsonResponse({
        success: true,
        source: 'openfoodfacts',
        product: {
          name: p.product_name || p.product_name_en || '',
          category: catInfo.category,
          subcategory: catInfo.subcategory,
          notes: [p.brands, p.quantity, p.generic_name].filter(Boolean).join(' — '),
          image_url: p.image_url || p.image_front_url || '',
        },
      });
    }

    // Try UPC ItemDB
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (upcRes.ok) {
      const upcData = await upcRes.json();
      if (upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        const catInfo = guessCategory([item.category || '', item.title || '']);
        return jsonResponse({
          success: true,
          source: 'upcitemdb',
          product: {
            name: item.title || '',
            category: catInfo.category,
            subcategory: catInfo.subcategory,
            notes: [item.brand, item.description].filter(Boolean).join(' — '),
            image_url: (item.images && item.images.length > 0) ? item.images[0] : '',
          },
        });
      }
    }

    // Fallback: AI lookup with web search context
    return await aiLookup(
      `Find product information for barcode/UPC: ${barcode}. Search the web if needed. Return name, brand, description, category, subcategory, and a product image URL.`
    );
  } catch (error) {
    console.error('Lookup error:', error);
    return jsonResponse({ success: false, error: 'Lookup failed' }, 500);
  }
});

async function handleUrlLookup(rawUrl: string): Promise<Response> {
  try {
    const url = rawUrl.match(/^https?:\/\//i) ? rawUrl : `https://${rawUrl}`;
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
      return await aiLookup(`Extract product details from this product page URL: ${url}`);
    }
    const html = await pageRes.text();

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is);
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/is);
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/is);
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/is);

    const productImage = ogImage?.[1]?.trim()
      || html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim()
      || html.match(/"image"\s*:\s*"(https?:\/\/[^"]+)"/i)?.[1]
      || '';

    const pageInfo = [
      `URL: ${url}`,
      titleMatch ? `Title: ${titleMatch[1].trim()}` : '',
      ogTitle ? `OG Title: ${ogTitle[1].trim()}` : '',
      metaDesc ? `Description: ${metaDesc[1].trim().slice(0, 500)}` : '',
      ogDesc ? `OG Description: ${ogDesc[1].trim().slice(0, 500)}` : '',
      `Page excerpt: ${html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)}`,
    ].filter(Boolean).join('\n');

    const aiResponse = await aiLookup(
      `Extract product details from this webpage info:\n${pageInfo}\n\nReturn the product name, category, subcategory, notes (brand, description, specs), and image_url.`
    );

    if (productImage) {
      try {
        const responseBody = await aiResponse.clone().json();
        if (responseBody.success && responseBody.product) {
          if (!responseBody.product.image_url) {
            responseBody.product.image_url = productImage;
          }
          return jsonResponse(responseBody);
        }
      } catch { /* fall through */ }
    }

    return aiResponse;
  } catch (error) {
    console.error('URL lookup error:', error);
    return jsonResponse({ success: false, error: 'URL lookup failed' }, 500);
  }
}

async function aiLookup(prompt: string): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return jsonResponse({ success: false, error: 'AI not configured' }, 500);
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
          content: `You extract product information. Return ONLY valid JSON with these keys:
- name (string): FULL product name, never truncated
- category (string): one of the main categories below
- subcategory (string): one of the subcategories for that category, or empty string
- notes (string): brand, description, specs combined
- image_url (string): product image URL if known, otherwise empty string
- quantity (number): pack size / count (e.g. 6-pack = 6, single item = 1). Default 1 if unknown.

${CATEGORY_MAP}

Always pick the most specific category and subcategory. If unsure, use "other" with empty subcategory.
If product is unknown, return {"name":"","category":"other","subcategory":"","notes":"","image_url":""}.`,
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
          return jsonResponse({ success: true, source: 'ai', product });
        }
      } catch { /* ignore parse error */ }
    }
  }

  return jsonResponse({ success: false, error: 'Product not found' }, 404);
}

function guessCategory(tags: string[]): { category: string; subcategory: string } {
  const joined = tags.join(' ').toLowerCase();

  // Hardware & Tools
  if (/hammer|wrench|plier|screwdriver|hand\s*tool/.test(joined)) return { category: 'hardware-tools', subcategory: 'hand-tools' };
  if (/drill|saw|sander|grinder|power\s*tool/.test(joined)) return { category: 'hardware-tools', subcategory: 'power-tools' };
  if (/screw|nail|bolt|fastener|anchor/.test(joined)) return { category: 'hardware-tools', subcategory: 'fasteners' };
  if (/tape\s*measure|level|ruler|measuring/.test(joined)) return { category: 'hardware-tools', subcategory: 'measuring' };
  if (/safety|glove|goggles|mask|helmet/.test(joined)) return { category: 'hardware-tools', subcategory: 'safety' };
  if (/tool|hardware/.test(joined)) return { category: 'hardware-tools', subcategory: '' };

  // Produce
  if (/fruit|apple|banana|orange|berry|grape|mango|peach|pear|melon/.test(joined)) return { category: 'produce', subcategory: 'fruits' };
  if (/vegetable|carrot|potato|tomato|onion|lettuce|broccoli|pepper|cucumber/.test(joined)) return { category: 'produce', subcategory: 'vegetables' };
  if (/herb|spice|basil|oregano|thyme|cilantro|parsley|cinnamon/.test(joined)) return { category: 'produce', subcategory: 'herbs' };

  // Groceries
  if (/dairy|milk|cheese|yogurt|butter|egg|cream/.test(joined)) return { category: 'groceries', subcategory: 'dairy' };
  if (/snack|chip|cookie|cracker|candy|chocolate|popcorn/.test(joined)) return { category: 'groceries', subcategory: 'snacks' };
  if (/beverage|drink|soda|juice|water|coffee|tea|beer|wine|bebida|refresco|gaseosa|cola/.test(joined)) return { category: 'groceries', subcategory: 'beverages' };
  if (/canned|can|soup|bean|tuna/.test(joined)) return { category: 'groceries', subcategory: 'canned' };
  if (/frozen|ice\s*cream|pizza|fries/.test(joined)) return { category: 'groceries', subcategory: 'frozen' };
  if (/bread|bakery|bun|roll|muffin|cake|pastry/.test(joined)) return { category: 'groceries', subcategory: 'bakery' };
  if (/sauce|ketchup|mustard|mayo|dressing|condiment|vinegar|oil/.test(joined)) return { category: 'groceries', subcategory: 'condiments' };
  if (/grocery|food|cereal|pasta|rice|flour|sugar/.test(joined)) return { category: 'groceries', subcategory: '' };

  // Household
  if (/clean|bleach|detergent|disinfect|sponge|mop|broom/.test(joined)) return { category: 'household', subcategory: 'cleaning' };
  if (/kitchen|cookware|utensil|pot|pan|knife|cutting/.test(joined)) return { category: 'household', subcategory: 'kitchen' };
  if (/bathroom|toilet|shower|soap|shampoo|towel/.test(joined)) return { category: 'household', subcategory: 'bathroom' };
  if (/laundry|washer|dryer|fabric|softener|iron/.test(joined)) return { category: 'household', subcategory: 'laundry' };
  if (/storage|organiz|bin|basket|shelf|container/.test(joined)) return { category: 'household', subcategory: 'storage' };
  if (/household|home/.test(joined)) return { category: 'household', subcategory: '' };

  // Electrical
  if (/wire|cable|wiring|cord|extension/.test(joined)) return { category: 'electrical', subcategory: 'wiring' };
  if (/light|lamp|bulb|led|lighting|fixture/.test(joined)) return { category: 'electrical', subcategory: 'lighting' };
  if (/switch|outlet|dimmer|receptacle/.test(joined)) return { category: 'electrical', subcategory: 'switches' };
  if (/battery|batteries|charger/.test(joined)) return { category: 'electrical', subcategory: 'batteries' };
  if (/electric/.test(joined)) return { category: 'electrical', subcategory: '' };

  // Plumbing
  if (/pipe|fitting|pvc|copper\s*pipe/.test(joined)) return { category: 'plumbing', subcategory: 'pipes' };
  if (/faucet|fixture|sink|toilet|shower\s*head/.test(joined)) return { category: 'plumbing', subcategory: 'fixtures' };
  if (/valve|connector|coupling/.test(joined)) return { category: 'plumbing', subcategory: 'valves' };
  if (/plumb/.test(joined)) return { category: 'plumbing', subcategory: '' };

  // Paint
  if (/interior\s*paint/.test(joined)) return { category: 'paint', subcategory: 'interior-paint' };
  if (/exterior\s*paint/.test(joined)) return { category: 'paint', subcategory: 'exterior-paint' };
  if (/stain|sealer|varnish/.test(joined)) return { category: 'paint', subcategory: 'stain' };
  if (/brush|roller|paint\s*brush/.test(joined)) return { category: 'paint', subcategory: 'brushes-rollers' };
  if (/paint|primer|coating/.test(joined)) return { category: 'paint', subcategory: '' };

  // Outdoor & Garden
  if (/garden\s*tool|rake|shovel|hoe|pruner/.test(joined)) return { category: 'outdoor', subcategory: 'garden-tools' };
  if (/seed|plant|flower|tree|shrub/.test(joined)) return { category: 'outdoor', subcategory: 'seeds-plants' };
  if (/fertilizer|soil|mulch|compost/.test(joined)) return { category: 'outdoor', subcategory: 'fertilizer' };
  if (/patio|outdoor\s*furniture|grill|bbq/.test(joined)) return { category: 'outdoor', subcategory: 'outdoor-furniture' };
  if (/garden|outdoor|lawn|yard/.test(joined)) return { category: 'outdoor', subcategory: '' };

  // Automotive
  if (/motor\s*oil|fluid|coolant|lubricant|transmission/.test(joined)) return { category: 'automotive', subcategory: 'fluids' };
  if (/car\s*part|auto\s*part|filter|brake|wiper/.test(joined)) return { category: 'automotive', subcategory: 'parts' };
  if (/car\s*wash|wax|polish|car\s*care|detailing/.test(joined)) return { category: 'automotive', subcategory: 'car-care' };
  if (/auto|car|vehicle/.test(joined)) return { category: 'automotive', subcategory: '' };

  // Medicine & Health
  if (/prescription|rx/.test(joined)) return { category: 'medicine', subcategory: 'prescription' };
  if (/otc|over.the.counter|pain\s*relief|ibuprofen|acetaminophen|aspirin|antacid|allergy/.test(joined)) return { category: 'medicine', subcategory: 'otc' };
  if (/vitamin|supplement|mineral|probiotic|omega|multivitamin/.test(joined)) return { category: 'medicine', subcategory: 'vitamins' };
  if (/first\s*aid|bandage|antiseptic|gauze|wound/.test(joined)) return { category: 'medicine', subcategory: 'first-aid' };
  if (/medical|thermometer|blood\s*pressure|glucose/.test(joined)) return { category: 'medicine', subcategory: 'medical-devices' };
  if (/medicine|pharma|drug|health|remedy/.test(joined)) return { category: 'medicine', subcategory: '' };

  return { category: 'other', subcategory: '' };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

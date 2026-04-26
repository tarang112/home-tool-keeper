import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const { barcode, url } = body;

    if (url && typeof url === 'string') {
      return await handleUrlLookup(url);
    }

    if (!barcode || typeof barcode !== 'string' || !/^\d{6,18}$/.test(barcode.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'A valid barcode or URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Open Food Facts first
    const offResult = await tryOpenFoodFacts(barcode);
    if (offResult) return jsonResponse({ success: true, source: 'openfoodfacts', product: offResult });

    // Try UPC ItemDB
    const upcResult = await tryUpcItemDb(barcode);
    if (upcResult) return jsonResponse({ success: true, source: 'upcitemdb', product: upcResult });

    // Fallback: do a real Google web search for the barcode, fetch the top result page, extract real data
    const webResult = await webSearchBarcode(barcode);
    if (webResult) return jsonResponse({ success: true, source: 'websearch', product: webResult });

    return jsonResponse({ success: true, product: null, message: 'Product not found' }, 200);
  } catch (error) {
    console.error('Lookup error:', error);
    return jsonResponse({ success: false, error: 'Lookup failed' }, 500);
  }
});

async function tryOpenFoodFacts(barcode: string) {
  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const offData = await offRes.json();
    if (offData.status === 1 && offData.product) {
      const p = offData.product;
      const catInfo = guessCategory(p.categories_tags || []);
      const packQty = parseInt(p.product_quantity) || parseInt(p.quantity?.match(/(\d+)/)?.[1]) || 1;
      return {
        name: p.product_name_en || p.product_name || '',
        category: catInfo.category,
        subcategory: catInfo.subcategory,
        notes: [p.brands, p.quantity, p.generic_name].filter(Boolean).join(' — '),
        image_url: p.image_url || p.image_front_url || '',
        quantity: packQty,
      };
    }
  } catch (e) { console.error('OFF error:', e); }
  return null;
}

async function tryUpcItemDb(barcode: string) {
  try {
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (upcRes.ok) {
      const upcData = await upcRes.json();
      if (upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        const catInfo = guessCategory([item.category || '', item.title || '']);
        return {
          name: item.title || '',
          category: catInfo.category,
          subcategory: catInfo.subcategory,
          notes: [item.brand, item.description].filter(Boolean).join(' — '),
          image_url: (item.images && item.images.length > 0) ? item.images[0] : '',
          quantity: 1,
        };
      }
    }
  } catch (e) { console.error('UPC error:', e); }
  return null;
}

/** Do a real web search for the barcode, fetch the top product page, extract structured data */
async function webSearchBarcode(barcode: string) {
  try {
    // Search Google for the barcode to find a real product page
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(barcode + ' product')}`;
    const searchRes = await fetch(searchUrl, { headers: BROWSER_HEADERS, redirect: 'follow' });
    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();

    // Extract product page URLs from Google results (skip google.com links)
    const linkMatches = [...searchHtml.matchAll(/href="\/url\?q=(https?:\/\/[^&"]+)/gi)]
      .map(m => decodeURIComponent(m[1]))
      .filter(u => !u.includes('google.com') && !u.includes('youtube.com') && !u.includes('webcache'));

    // Also try to extract the featured snippet / knowledge panel text from Google
    const googleSnippetName = searchHtml.match(/data-attrid="title"[^>]*>([^<]+)</i)?.[1]
      || searchHtml.match(/<h3[^>]*class="[^"]*"[^>]*>([^<]+)</i)?.[1]
      || '';

    let bestProduct: any = null;

    // Fetch up to 3 top results and try to extract JSON-LD / og data
    for (const pageUrl of linkMatches.slice(0, 3)) {
      try {
        const pageRes = await fetch(pageUrl, { headers: BROWSER_HEADERS, redirect: 'follow' });
        if (!pageRes.ok) continue;
        const html = await pageRes.text();
        const extracted = extractProductFromHtml(html, pageUrl);
        if (extracted && extracted.name) {
          bestProduct = extracted;
          break;
        }
      } catch { continue; }
    }

    if (bestProduct) return bestProduct;

    // If we couldn't fetch pages but got a Google snippet, use AI to parse the search results
    if (googleSnippetName || linkMatches.length > 0) {
      // Extract text snippets from Google search results
      const snippetText = searchHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);

      return await aiParseText(
        `Based on these Google search results for barcode "${barcode}":\n\n${snippetText}\n\nExtract the actual product name, description, category, quantity, and image URL. The product name from Google appears to be: "${googleSnippetName}". Use ONLY information from the search results, do NOT make up details.`
      );
    }

    return null;
  } catch (e) {
    console.error('Web search error:', e);
    return null;
  }
}

/** Parse pack quantity from text like "6 ct", "12 Pack", "count is 21", "3 x 10oz" */
function parseQuantity(text: string): number {
  const m = text.match(/\bcount\s*(?:is|:)?\s*(\d+)\b/i)
    || text.match(/\b(\d+)\s*(?:ct|count|pk|pack|pcs?|pieces?)\b/i)
    || text.match(/\b(\d+)\s*x\s*\d+(?:\.\d+)?\s*(?:oz|fl\s*oz|lb|g|kg|ml|l)\b/i);
  return m ? parseInt(m[1]) : 1;
}

/** Extract structured product data from HTML using JSON-LD, Open Graph, and meta tags */
function extractProductFromHtml(html: string, pageUrl: string) {
  // Try JSON-LD first (most accurate)
  const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      let parsed = JSON.parse(m[1]);
      if (parsed['@graph']) parsed = parsed['@graph'];
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const product = items.find((x: any) => {
        const type = Array.isArray(x?.['@type']) ? x['@type'].join(' ') : (x?.['@type'] || '');
        return /Product/i.test(type);
      });
      if (product?.name) {
        const imgUrl = typeof product.image === 'string' ? product.image
          : (Array.isArray(product.image) ? product.image[0] : product.image?.url || '');
        const allText = `${product.name} ${product.description || ''} ${product.category || ''}`;
        const catInfo = guessCategory([allText]);
        const qty = parseQuantity(allText);
        return {
          name: product.name,
          category: catInfo.category,
          subcategory: catInfo.subcategory,
          notes: [product.brand?.name || product.brand, product.description].filter(Boolean).join(' — ').slice(0, 500),
          image_url: imgUrl,
          quantity: qty,
        };
      }
    } catch { continue; }
  }

  // Fallback to OG / meta tags
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim();
  const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim();
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim();
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim();
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim();

  const productName = ogTitle || title || '';
  if (!productName) return null;

  // Clean name (remove site suffix like " - Amazon.com", " | Walmart")
  const cleanName = productName.replace(/\s*[-|].*?(Amazon|Walmart|Target|Lowe|Home Depot|eBay|\.com).*$/i, '').trim();
  const desc = ogDesc || metaDesc || '';
  const allText = `${cleanName} ${desc}`;
  const catInfo = guessCategory([allText]);
  const qty = parseQuantity(allText);

  return {
    name: cleanName,
    category: catInfo.category,
    subcategory: catInfo.subcategory,
    notes: desc.slice(0, 500),
    image_url: ogImage || '',
    quantity: qty,
  };
}

async function handleUrlLookup(rawUrl: string): Promise<Response> {
  try {
    const url = rawUrl.match(/^https?:\/\//i) ? rawUrl : `https://${rawUrl}`;
    const pageRes = await fetch(url, { redirect: 'follow', headers: BROWSER_HEADERS });
    if (!pageRes.ok) {
      console.error('URL fetch failed:', pageRes.status, pageRes.statusText);
      return jsonResponse({ success: false, error: 'Could not fetch URL' }, 400);
    }
    const html = await pageRes.text();

    // Try structured extraction first
    const extracted = extractProductFromHtml(html, url);
    if (extracted && extracted.name) {
      return jsonResponse({ success: true, source: 'url', product: extracted });
    }

    // Fallback: gather page text and use AI to parse it
    const pageInfo = [
      `URL: ${url}`,
      `Page text: ${html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)}`,
    ].join('\n');

    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/is)?.[1]?.trim() || '';

    const product = await aiParseText(
      `Extract product details from this webpage content:\n${pageInfo}\n\nReturn the product name, category, subcategory, notes (brand, description, specs), quantity, and image_url. Use ONLY information from the page content.`
    );

    if (product) {
      if (!product.image_url && ogImage) product.image_url = ogImage;
      return jsonResponse({ success: true, source: 'url-ai', product });
    }

    return jsonResponse({ success: false, error: 'Could not extract product details' }, 404);
  } catch (error) {
    console.error('URL lookup error:', error);
    return jsonResponse({ success: false, error: 'URL lookup failed' }, 500);
  }
}

/** Use AI ONLY to parse already-fetched real text content — not to hallucinate */
async function aiParseText(prompt: string): Promise<any | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return null;

  try {
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
            content: `You extract product information from provided text. You must ONLY use information present in the text — never invent or hallucinate details.
Return ONLY valid JSON with these keys:
- name (string): FULL product name exactly as shown in the text
- category (string): one of the main categories below
- subcategory (string): one of the subcategories for that category, or empty string
- notes (string): brand, description, specs from the text
- image_url (string): product image URL if found in the text, otherwise empty string
- quantity (number): pack size / count if mentioned (e.g. 6-pack = 6). Default 1.

${CATEGORY_MAP}

If you cannot determine the product from the text, return {"name":"","category":"other","subcategory":"","notes":"","image_url":"","quantity":1}.`,
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
        const product = JSON.parse(content);
        if (product.name) return product;
      }
    }
  } catch (e) { console.error('AI parse error:', e); }
  return null;
}

function guessCategory(tags: string[]): { category: string; subcategory: string } {
  const joined = tags.join(' ').toLowerCase();

  // Medicine & Health — check FIRST to avoid false matches on "herb", "cream", "orange" etc.
  if (/prescription|rx\s*only/.test(joined)) return { category: 'medicine', subcategory: 'prescription' };
  if (/acetaminophen|ibuprofen|naproxen|aspirin|guaifenesin|dextromethorphan|diphenhydramine|loratadine|cetirizine|antacid|laxative|cough|cold\s*&?\s*flu|allergy\s*relief|pain\s*relief|fever\s*reducer|tablet|caplet|capsule|softgel|lozenge|syrup|ointment|drug\s*facts|active\s*ingredient|otc|over.the.counter/.test(joined)) return { category: 'medicine', subcategory: 'otc' };
  if (/vitamin|supplement|mineral|probiotic|omega|multivitamin/.test(joined)) return { category: 'medicine', subcategory: 'vitamins' };
  if (/first\s*aid|bandage|antiseptic|gauze|wound/.test(joined)) return { category: 'medicine', subcategory: 'first-aid' };
  if (/medical\s*device|thermometer|blood\s*pressure|glucose\s*monitor/.test(joined)) return { category: 'medicine', subcategory: 'medical-devices' };
  if (/medicine|pharma|pharmacy|drug|remedy/.test(joined)) return { category: 'medicine', subcategory: '' };

  // Hardware & Tools
  if (/hammer|wrench|plier|screwdriver|hand\s*tool/.test(joined)) return { category: 'hardware-tools', subcategory: 'hand-tools' };
  if (/drill|saw|sander|grinder|power\s*tool/.test(joined)) return { category: 'hardware-tools', subcategory: 'power-tools' };
  if (/screw|nail|bolt|fastener|anchor/.test(joined)) return { category: 'hardware-tools', subcategory: 'fasteners' };
  if (/tape\s*measure|level|ruler|measuring/.test(joined)) return { category: 'hardware-tools', subcategory: 'measuring' };
  if (/safety|glove|goggles|mask|helmet/.test(joined)) return { category: 'hardware-tools', subcategory: 'safety' };
  if (/tool|hardware/.test(joined)) return { category: 'hardware-tools', subcategory: '' };

  // Produce
  if (/\b(fruit|apple|banana|orange|berry|grape|mango|peach|pear|melon)\b/.test(joined)) return { category: 'produce', subcategory: 'fruits' };
  if (/\b(vegetable|carrot|potato|tomato|onion|lettuce|broccoli|pepper|cucumber|spinach)\b/.test(joined)) return { category: 'produce', subcategory: 'vegetables' };
  if (/\b(fresh\s*herb|basil|oregano|thyme|cilantro|parsley)\b/.test(joined)) return { category: 'produce', subcategory: 'herbs' };

  // Groceries
  if (/dairy|milk|cheese|yogurt|butter|egg|cream/.test(joined)) return { category: 'groceries', subcategory: 'dairy' };
  if (/frozen|ice\s*cream|keep\s*frozen|freezer/.test(joined)) return { category: 'groceries', subcategory: 'frozen' };
  if (/pretzel|snack|chip|chips|cookie|cracker|candy|chocolate|popcorn|jerky|nuts|ruffles|lays|lay's|doritos|cheetos|tostitos|pringles|fritos|trail\s*mix|granola\s*bar/.test(joined)) return { category: 'groceries', subcategory: 'snacks' };
  if (/beverage|drink|soda|juice|water|coffee|tea|beer|wine|bebida|refresco|gaseosa|cola/.test(joined)) return { category: 'groceries', subcategory: 'beverages' };
  if (/canned|can|soup|bean|tuna/.test(joined)) return { category: 'groceries', subcategory: 'canned' };
  if (/bread|bakery|bun|roll|muffin|cake|pastry|dough/.test(joined)) return { category: 'groceries', subcategory: 'bakery' };
  if (/sauce|ketchup|mustard|mayo|dressing|condiment|vinegar|oil/.test(joined)) return { category: 'groceries', subcategory: 'condiments' };
  if (/grocery|food|cereal|pasta|rice|flour|sugar|nutrition\s*facts|calories|serving\s*size|ingredients/.test(joined)) return { category: 'groceries', subcategory: '' };

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

  return { category: 'other', subcategory: '' };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

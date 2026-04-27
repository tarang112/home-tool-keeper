import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const decodeEmailText = (value: string) =>
  value
    .replace(/=\r?\n/g, "")
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/tr>|<\/li>|<\/h\d>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const pickHeader = (content: string, names: string[]) => {
  for (const name of names) {
    const match = content.match(new RegExp(`(?:^|\\n)${name}:\\s*(.+)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return null;
};

const extractForwardedMetadata = (content: string) => {
  const forwardedBlocks = [
    /-{2,}\s*Forwarded message\s*-{2,}([\s\S]*)/i,
    /Begin forwarded message:([\s\S]*)/i,
    /Original Message([\s\S]*)/i,
    /From:\s*.+\nSent:\s*.+\nTo:\s*.+\nSubject:\s*.+/i,
  ];

  const block = forwardedBlocks
    .map((pattern) => content.match(pattern)?.[1] || content.match(pattern)?.[0])
    .find(Boolean) || content;

  return {
    subject: pickHeader(block, ["Subject"]),
    from: pickHeader(block, ["From", "Sender"]),
    to: pickHeader(block, ["To", "Delivered-To", "X-Original-To"]),
    date: pickHeader(block, ["Date", "Sent"]),
  };
};

const buildParsingInput = (emailContent: string, subject?: string, from?: string) => {
  const normalized = decodeEmailText(emailContent);
  const forwarded = extractForwardedMetadata(normalized);

  return {
    normalized,
    subject: forwarded.subject || subject || "Unknown",
    from: forwarded.from || from || "Unknown",
    forwardedTo: forwarded.to,
    forwardedDate: forwarded.date,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { emailContent, subject, from, locations } = await req.json();
    if (!emailContent || typeof emailContent !== "string") {
      return new Response(
        JSON.stringify({ error: "emailContent is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsingInput = buildParsingInput(emailContent, subject, from);

    // Fetch item defaults
    const { data: defaults } = await supabase
      .from("item_defaults")
      .select("*")
      .eq("user_id", user.id)
      .limit(100);

    const defaultsContext = (defaults || [])
      .map(
        (d: any) =>
          `"${d.item_name}" → category: ${d.category || "?"}, subcategory: ${d.subcategory || "none"}, location: ${d.location || "?"}, unit: ${d.quantity_unit || "pcs"}`
      )
      .join("\n");

    const today = new Date().toISOString().split("T")[0];
    const produceExpiry = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const medicineExpiry = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
    const warrantyExpiry = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

    const systemPrompt = `You are an AI assistant for HomeStock inventory app.
Parse the receipt, order confirmation, PDF text, or EML content and extract ALL purchased items and order totals.

Email subject: ${parsingInput.subject}
Email from: ${parsingInput.from}
Forwarded/account recipient if visible: ${parsingInput.forwardedTo || "Unknown"}
Email/order date if visible: ${parsingInput.forwardedDate || "Unknown"}

Available categories with subcategories:
- groceries: dairy, snacks, beverages, canned, frozen, bakery, condiments
- produce: fruits, vegetables, herbs (DEFAULT EXPIRY: ${produceExpiry})
- household: cleaning, kitchen, bathroom, laundry, storage
- hardware-tools: hand-tools, power-tools, fasteners, measuring, safety
- electrical: wiring, lighting, switches, batteries
- plumbing: pipes, fixtures, valves
- paint: interior-paint, exterior-paint, stain, brushes-rollers
- outdoor: garden-tools, seeds-plants, fertilizer, outdoor-furniture
- automotive: fluids, parts, car-care
- medicine: prescription, otc, vitamins, first-aid, medical-devices (DEFAULT EXPIRY: ${medicineExpiry})
- electronics: phones-tablets, computers, tv-monitors, audio, cameras, smart-home, gaming, wearables, accessories (DEFAULT WARRANTY EXPIRY: 1 year → ${warrantyExpiry}. For electronics, expirationDate = warranty expiration date)
- stationery: pens-pencils, notebooks, paper, art-supplies
- office-supply: desk-accessories, filing, printer-supplies, tech-accessories
- other: (no subcategories)

Available locations: ${(locations || []).join(", ")}

Known item defaults:
${defaultsContext || "None yet"}

Today: ${today}

Rules:
- Extract EVERY purchased physical item from common retailer emails, forwarded emails, copied email bodies, PDF text, EML content, order confirmations, shipment confirmations, pickup confirmations, invoices, and receipt tables.
- Handle Amazon, Walmart, Target, Costco, Sam's Club, Home Depot, Lowe's, Instacart, DoorDash/Uber Eats grocery orders, Best Buy, Apple, Staples, Office Depot, pharmacy receipts, and plain-text forwarded emails.
- Pay attention to table-like rows where item name, quantity, price, SKU, and total are separated by whitespace or line breaks.
- Skip shipping, handling, taxes, fees, tips, discounts, coupons, gift cards, store credit, totals, payment info, promo codes, order tracking, warranties sold as services, memberships, subscriptions, donations, and return/refund lines unless the purchased item itself is a physical product.
- Do not extract bundled marketing/recommendation items such as "You may also like", "Customers also bought", "Sponsored", or saved-for-later items.
- Use clean readable names (e.g. "LED Light Bulb 60W" not "GE-LED60W-SW-2PK").
- Preserve meaningful size/count descriptors in names (e.g. "AA Batteries 24 Pack", "Milk 1 Gallon", "USB-C Cable 6 ft").
- ALWAYS assign the most appropriate category AND subcategory.
- For electronics (TVs, phones, laptops, tablets, speakers, headphones, cameras, gaming consoles, smart home devices, chargers, cables, etc.): category MUST be "electronics" with appropriate subcategory. Set expirationDate to WARRANTY expiry (default 1 year: ${warrantyExpiry}).
- Detect quantity from labels like Qty, Quantity, x2, 2 @, pack count, cases, weights, and line-item repeats. Default 1 if unclear.
- Detect units (lb, oz, kg, pcs etc). Default "pcs".
- For produce: set expirationDate to ${produceExpiry}.
- For medicine: set expirationDate to ${medicineExpiry}.
- Use past defaults for known items.
- Detect store/retailer name from the email.
- Include order number if found.
- Extract the price per unit (unitPrice) and total line price (totalPrice) for each item as numbers (e.g. 29.99 not "$29.99"). If quantity > 1 and only line total is present, unitPrice = totalPrice / quantity.
- Extract subtotalAmount, taxAmount, shippingAmount, and totalAmount as numbers when present. Use null if missing.
- If multiple order totals appear, use the final charged/order total, not installment/payment balance or rewards balance.
- Return empty strings or nulls for missing optional values; never invent order numbers or prices.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Parse this normalized order/receipt content and extract all purchased items and totals:\n\n${parsingInput.normalized.slice(0, 24000)}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_order_items",
                description: "Extract items from an order confirmation email",
                parameters: {
                  type: "object",
                  properties: {
                    storeName: { type: "string", description: "Retailer name (e.g. Amazon, Home Depot, Lowe's)" },
                    orderNumber: { type: "string", description: "Order number if found" },
                    orderDate: { type: "string", description: "Order date if found (YYYY-MM-DD)" },
                    subtotalAmount: { type: "number", description: "Order subtotal before tax/shipping" },
                    taxAmount: { type: "number", description: "Tax amount" },
                    shippingAmount: { type: "number", description: "Shipping/delivery amount" },
                    totalAmount: { type: "number", description: "Final order total" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          category: { type: "string" },
                          subcategory: { type: "string" },
                          quantity: { type: "number" },
                          quantityUnit: { type: "string" },
                          location: { type: "string" },
                          expirationDate: { type: "string", description: "YYYY-MM-DD or empty" },
                          unitPrice: { type: "number", description: "Price per unit in dollars" },
                          totalPrice: { type: "number", description: "Total line price in dollars" },
                        },
                        required: ["name", "category", "quantity", "quantityUnit"],
                      },
                    },
                  },
                  required: ["items"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_order_items" } },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "Could not extract items from this email. Try a different order confirmation." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-order-email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

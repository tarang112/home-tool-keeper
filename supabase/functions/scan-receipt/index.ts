import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { imageBase64, locations } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch item defaults for the user
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

    const systemPrompt = `You are an AI assistant for an inventory management app called HomeStock.
Analyze the receipt or order screenshot image and extract ALL purchasable items from it.

Available categories with their subcategories:
- groceries: dairy, snacks, beverages, canned, frozen, bakery, condiments
- produce: fruits, vegetables, herbs (DEFAULT EXPIRY: 7 days → ${produceExpiry})
- household: cleaning, kitchen, bathroom, laundry, storage
- hardware-tools: hand-tools, power-tools, fasteners, measuring, safety
- electrical: wiring, lighting, switches, batteries
- plumbing: pipes, fixtures, valves
- paint: interior-paint, exterior-paint, stain, brushes-rollers
- outdoor: garden-tools, seeds-plants, fertilizer, outdoor-furniture
- automotive: fluids, parts, car-care
- medicine: prescription, otc, vitamins, first-aid, medical-devices (DEFAULT EXPIRY: 365 days → ${medicineExpiry})
- stationery: pens-pencils, notebooks, paper, art-supplies
- office-supply: desk-accessories, filing, printer-supplies, tech-accessories
- other: (no subcategories)

Available locations: ${(locations || []).join(", ")}

Known item defaults from past usage:
${defaultsContext || "None yet"}

Today's date: ${today}

Rules:
- Extract EVERY purchasable line item from the receipt/screenshot. Skip taxes, totals, subtotals, discounts, payment info.
- For each item, determine: name, category, subcategory, quantity, quantityUnit, and a suggested location.
- ALWAYS assign the most appropriate subcategory.
- Use clean, readable names (e.g. "Strawberries" not "STRWBRY 1LB ORG").
- If quantity is listed, use it. Otherwise default to 1.
- Detect units from the receipt (lb, oz, kg, etc). Default to "pcs" if unclear.
- For produce items: set expirationDate to ${produceExpiry}.
- For medicine items: set expirationDate to ${medicineExpiry}.
- If an item was in past defaults, use those defaults for category/location/unit unless the receipt says otherwise.
- Extract the price per unit (unitPrice) and total line price (totalPrice) for each item as numbers (e.g. 3.99 not "$3.99"). If quantity > 1, unitPrice = totalPrice / quantity.
- Also extract the store name if visible.`;

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
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract all items from this receipt/order screenshot." },
                {
                  type: "image_url",
                  image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_receipt_items",
                description: "Extract items from a receipt or order screenshot",
                parameters: {
                  type: "object",
                  properties: {
                    storeName: { type: "string", description: "Name of the store if visible" },
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
                          unitPrice: { type: "number", description: "Price per unit/item in dollars" },
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
          tool_choice: { type: "function", function: { name: "extract_receipt_items" } },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "Could not extract items from this image. Try a clearer photo." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scan-receipt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

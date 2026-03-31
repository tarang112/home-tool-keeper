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

    const { transcript, items, categories, locations } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return new Response(
        JSON.stringify({ error: "transcript is required" }),
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

    const existingItemsContext = (items || [])
      .slice(0, 50)
      .map((i: any) => `id:${i.id} "${i.name}" qty:${i.quantity}${i.quantityUnit} at ${i.location} (${i.category})`)
      .join("\n");

    const systemPrompt = `You are a voice assistant for an inventory management app called HomeStock.
Parse the user's voice command and return a JSON action.

Available categories: ${(categories || []).map((c: any) => c.value).join(", ")}
Available locations: ${(locations || []).join(", ")}

Known item defaults from past usage:
${defaultsContext || "None yet"}

Current inventory items:
${existingItemsContext || "None"}

Return EXACTLY one JSON object with this structure:
{
  "action": "add" | "update" | "delete" | "unknown",
  "confirmation": "A short sentence confirming what you'll do",
  "item": {
    "name": "item name",
    "category": "category value",
    "subcategory": "subcategory value or empty string",
    "quantity": number,
    "quantityUnit": "pcs|kg|g|lb|oz|L|ml|gal|fl oz",
    "location": "location name",
    "notes": "any notes mentioned"
  },
  "itemId": "existing item id (for update/delete only)",
  "error": "error message if action is unknown"
}

Rules:
- For "add": fill in item details. If the item was added before, use the remembered defaults for category/location/unit unless the user specifies otherwise.
- For "update": find the matching item from current inventory by name and return its id. Only include fields the user wants to change.
- For "delete"/"remove": find the matching item and return its id.
- If quantity is not specified, default to 1.
- Match item names fuzzily (e.g. "rice" matches "Basmati Rice").
- If you can't determine the action, set action to "unknown" with an error message.`;

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
            { role: "user", content: transcript },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "inventory_action",
                description: "Execute an inventory action based on voice command",
                parameters: {
                  type: "object",
                  properties: {
                    action: {
                      type: "string",
                      enum: ["add", "update", "delete", "unknown"],
                    },
                    confirmation: { type: "string" },
                    item: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        category: { type: "string" },
                        subcategory: { type: "string" },
                        quantity: { type: "number" },
                        quantityUnit: { type: "string" },
                        location: { type: "string" },
                        notes: { type: "string" },
                      },
                    },
                    itemId: { type: "string" },
                    error: { type: "string" },
                  },
                  required: ["action", "confirmation"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "inventory_action" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to process voice command" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "Could not understand the command" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-command error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

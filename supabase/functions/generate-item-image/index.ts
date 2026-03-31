import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Try Wikipedia API to find a relevant image for the item */
async function searchWikipediaImage(itemName: string): Promise<string | null> {
  try {
    // Search Wikipedia for the item
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(itemName)}`;
    const resp = await fetch(searchUrl, {
      headers: { "User-Agent": "HomeStock/1.0 (inventory app)" },
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.thumbnail?.source) {
        // Get higher res version by modifying the thumbnail URL
        return data.originalimage?.source || data.thumbnail.source;
      }
    }
  } catch (e) {
    console.error("Wikipedia search error:", e);
  }

  // Fallback: try Wikipedia search API
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(itemName)}&format=json&srlimit=1`;
    const resp = await fetch(searchUrl, {
      headers: { "User-Agent": "HomeStock/1.0 (inventory app)" },
    });
    if (resp.ok) {
      const data = await resp.json();
      const title = data.query?.search?.[0]?.title;
      if (title) {
        const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const pageResp = await fetch(pageUrl, {
          headers: { "User-Agent": "HomeStock/1.0 (inventory app)" },
        });
        if (pageResp.ok) {
          const pageData = await pageResp.json();
          if (pageData.thumbnail?.source) {
            return pageData.originalimage?.source || pageData.thumbnail.source;
          }
        }
      }
    }
  } catch (e) {
    console.error("Wikipedia fallback search error:", e);
  }

  return null;
}

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { itemName, itemId } = await req.json();
    if (!itemName || !itemId) {
      return new Response(JSON.stringify({ error: "itemName and itemId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search for a free image from Wikipedia
    const imageUrl = await searchWikipediaImage(itemName);
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image found", imageUrl: "" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the image
    const imgResponse = await fetch(imageUrl, {
      headers: { "User-Agent": "HomeStock/1.0 (inventory app)" },
    });
    if (!imgResponse.ok) {
      console.error("Image download failed:", imgResponse.status);
      return new Response(JSON.stringify({ error: "Image download failed", imageUrl: "" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageBytes = new Uint8Array(await imgResponse.arrayBuffer());
    const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("svg") ? "jpg" : "jpg";

    // Upload to storage
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("inventory-images")
      .upload(path, imageBytes, { contentType: contentType.includes("svg") ? "image/jpeg" : contentType });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = await supabase.storage
      .from("inventory-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    const signedUrl = urlData?.signedUrl || "";

    // Update the item with the image
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ product_image_url: signedUrl })
      .eq("id", itemId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(JSON.stringify({ imageUrl: signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-item-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

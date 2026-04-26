import { createClient } from "npm:@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Categories that get Monday + Friday reminders (snacks, frozen treats like ice cream)
const FREQUENT_CATEGORIES = ["snacks", "frozen"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon, 5=Fri
    const isMonday = dayOfWeek === 1;
    const isFriday = dayOfWeek === 5;
    const todayStr = today.toISOString().split("T")[0];

    // Get all out-of-stock items (quantity = 0)
    const { data: outOfStock, error } = await supabase
      .from("inventory_items")
      .select("id, name, user_id, category, subcategory")
      .eq("quantity", 0)
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching out-of-stock items:", error);
      return new Response(
        JSON.stringify({ error: "Failed to check restock items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsCreated = 0;
    const prefCache = new Map<string, { inApp: boolean; email: boolean; push: boolean }>();
    const getPrefs = async (uid: string) => {
      if (prefCache.has(uid)) return prefCache.get(uid)!;
      const { data } = await supabase
        .from("notification_preferences")
        .select("restock_in_app, restock_email, restock_push")
        .eq("user_id", uid)
        .maybeSingle();
      const prefs = {
        inApp: data ? data.restock_in_app !== false : true,
        email: data ? !!data.restock_email : false,
        push: data ? !!data.restock_push : false,
      };
      prefCache.set(uid, prefs);
      return prefs;
    };

    for (const item of outOfStock || []) {
      const sub = (item.subcategory || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const isFrequent =
        FREQUENT_CATEGORIES.includes(sub) || FREQUENT_CATEGORIES.includes(cat);

      // Monday: all out-of-stock items get a reminder
      // Friday: only frequent categories (snacks, frozen/ice cream)
      if (!(isMonday || (isFriday && isFrequent))) continue;

      const prefs = await getPrefs(item.user_id);
      if (!prefs.inApp && !prefs.email && !prefs.push) continue;

      const title = `🛒 Restock: ${item.name}`;
      const message = isFrequent && isFriday
        ? `${item.name} is out of stock — grab some for the weekend!`
        : `${item.name} is out of stock. Time to restock!`;

      if (prefs.inApp) {
        // Dedup: check if already notified today
        const todayStart = new Date(todayStr + "T00:00:00Z").toISOString();
        const todayEnd = new Date(todayStr + "T23:59:59Z").toISOString();

        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("item_id", item.id)
          .eq("user_id", item.user_id)
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd)
          .limit(1);

        if (!existing || existing.length === 0) {
          const dedupeKey = `${item.id}:restock:${todayStr}`;
          const { error: insertError } = await supabase
            .from("notifications")
            .insert({ user_id: item.user_id, item_id: item.id, title, message, dedupe_key: dedupeKey });

          if (!insertError) notificationsCreated++;
          else if (insertError.code !== "23505") console.error("Error creating notification:", insertError);
        }
      }

      if (prefs.email) console.log(`[restock-email] would email user ${item.user_id}: ${title}`);
      if (prefs.push) console.log(`[restock-push] would push user ${item.user_id}: ${title}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: outOfStock?.length || 0,
        notificationsCreated,
        day: isMonday ? "monday" : isFriday ? "friday" : "other",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Restock reminder error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

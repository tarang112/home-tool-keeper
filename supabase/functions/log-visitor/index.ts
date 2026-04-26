import { createClient } from "npm:@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const hashIp = async (ip: string, userId: string) => {
  if (!ip) return null;
  const bytes = new TextEncoder().encode(`${ip}:${userId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const page = typeof body.page === "string" ? body.page.slice(0, 300) : "/";
    const device = typeof body.device === "string" ? body.device.slice(0, 30) : "desktop";
    const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 100) : null;
    const referrer = typeof body.referrer === "string" && body.referrer ? body.referrer.slice(0, 500) : null;
    const userAgent = req.headers.get("user-agent") ?? (typeof body.user_agent === "string" ? body.user_agent.slice(0, 500) : null);
    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "").split(",")[0].trim();

    const { error } = await supabase.from("visitor_logs").insert({
      user_id: claimsData.claims.sub,
      page,
      device,
      referrer,
      user_agent: userAgent,
      session_id: sessionId,
      ip_hash: await hashIp(ip, claimsData.claims.sub),
    });

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed to log visit" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
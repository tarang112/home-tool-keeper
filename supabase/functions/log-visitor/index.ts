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

const maskIp = (ip: string) => {
  if (!ip) return null;
  if (ip.includes(":")) return ip.replace(/:[^:]*:[^:]*$/, ":****:****");
  return ip.replace(/\.\d+$/, ".0");
};

const getLocation = async (ip: string) => {
  if (!ip || ip === "127.0.0.1" || ip.startsWith("10.") || ip.startsWith("192.168.")) return {};
  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { headers: { "User-Agent": "HomeStock visitor log" } });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      country: typeof data.country_name === "string" ? data.country_name.slice(0, 80) : null,
      region: typeof data.region === "string" ? data.region.slice(0, 80) : null,
      city: typeof data.city === "string" ? data.city.slice(0, 80) : null,
      timezone: typeof data.timezone === "string" ? data.timezone.slice(0, 80) : null,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
      location_provider: "ipapi.co",
    };
  } catch {
    return {};
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const page = typeof body.page === "string" ? body.page.slice(0, 300) : "/";
    const device = typeof body.device === "string" ? body.device.slice(0, 30) : "desktop";
    const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 100) : null;
    const referrer = typeof body.referrer === "string" && body.referrer ? body.referrer.slice(0, 500) : null;
    const userAgent = req.headers.get("user-agent") ?? (typeof body.user_agent === "string" ? body.user_agent.slice(0, 500) : null);
    const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "").split(",")[0].trim();

    const location = await getLocation(ip);
    const { error } = await supabase.from("visitor_logs").insert({
      user_id: userData.user.id,
      page,
      device,
      referrer,
      user_agent: userAgent,
      session_id: sessionId,
      ip_hash: await hashIp(ip, userData.user.id),
      ip_address_masked: maskIp(ip),
      ...location,
    });

    if (error) {
      console.error("Visitor log insert failed", error);
      return new Response(JSON.stringify({ ok: false, error: "LOG_INSERT_FAILED", fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Unexpected visitor log failure", error);
    return new Response(JSON.stringify({ ok: false, error: "VISITOR_LOG_FAILED", fallback: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
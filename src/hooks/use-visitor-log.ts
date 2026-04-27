import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface VisitorLogEntry {
  id: string;
  page: string;
  device: string;
  referrer: string | null;
  userAgent: string | null;
  sessionId: string | null;
  ipHash: string | null;
  ipAddressMasked: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  locationProvider: string | null;
  createdAt: string;
}

const getDevice = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
};

export function useVisitorTracker() {
  const { user, session } = useAuth();
  const location = useLocation();
  const page = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (!user || !session) return;
    const sessionKey = "homestock_visitor_session_id";
    let sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(sessionKey, sessionId);
    }

    void supabase.functions.invoke("log-visitor", {
      body: {
        page,
        device: getDevice(),
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        session_id: sessionId,
      },
    }).catch(() => undefined);
  }, [page, session, user]);
}

export function useVisitorLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<VisitorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("visitor_logs" as any)
      .select("id,page,device,referrer,user_agent,session_id,ip_hash,ip_address_masked,country,region,city,timezone,latitude,longitude,location_provider,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    setLogs(((data || []) as any[]).map((row) => ({
      id: row.id,
      page: row.page,
      device: row.device,
      referrer: row.referrer,
      userAgent: row.user_agent,
      sessionId: row.session_id,
      ipHash: row.ip_hash,
      ipAddressMasked: row.ip_address_masked,
      country: row.country,
      region: row.region,
      city: row.city,
      timezone: row.timezone,
      latitude: row.latitude,
      longitude: row.longitude,
      locationProvider: row.location_provider,
      createdAt: row.created_at,
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const deleteLog = useCallback(async (id: string) => {
    await supabase.from("visitor_logs" as any).delete().eq("id", id);
    setLogs((current) => current.filter((log) => log.id !== id));
  }, []);

  return useMemo(() => ({ logs, loading, refetch: fetchLogs, deleteLog }), [deleteLog, fetchLogs, loading, logs]);
}
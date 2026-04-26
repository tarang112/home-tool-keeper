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
  createdAt: string;
}

const getDevice = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
};

export function useVisitorTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const page = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (!user) return;

    void supabase.from("visitor_logs" as any).insert({
      user_id: user.id,
      page,
      device: getDevice(),
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  }, [page, user]);
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
      .select("id,page,device,referrer,user_agent,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    setLogs(((data || []) as any[]).map((row) => ({
      id: row.id,
      page: row.page,
      device: row.device,
      referrer: row.referrer,
      userAgent: row.user_agent,
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
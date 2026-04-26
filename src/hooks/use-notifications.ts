import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  itemId: string | null;
  createdAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const seenNotificationIds = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const mapped = (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      read: n.read,
      itemId: n.item_id,
      createdAt: n.created_at,
    }));
    const previousSeen = seenNotificationIds.current;
    const newUnread = mapped.filter((n) => !n.read && !previousSeen.has(n.id));
    setNotifications(mapped);
    seenNotificationIds.current = new Set(mapped.map((n) => n.id));
    if (previousSeen.size > 0 && newUnread.length > 0) {
      toast(newUnread[0].title, { description: newUnread[0].message || "New inventory notification" });
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(newUnread[0].title, {
          body: newUnread[0].message || "New inventory notification",
          icon: "/placeholder.svg",
        });
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, markRead, markAllRead, deleteNotification, refresh: fetchNotifications };
}

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

const DEFAULT_DAYS = [30, 14, 7, 3, 1, 0];

interface WarrantyRemindersProps {
  itemId: string;
  expirationDate: string; // ISO date (yyyy-mm-dd) — caller guarantees presence
}

export function WarrantyReminders({ itemId, expirationDate }: WarrantyRemindersProps) {
  const { user } = useAuth();
  const [reminderDays, setReminderDays] = useState<number[]>(DEFAULT_DAYS);
  const [loading, setLoading] = useState(true);
  const [nextScheduled, setNextScheduled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notification_preferences" as any)
        .select("warranty_reminder_days")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data && Array.isArray((data as any).warranty_reminder_days)) {
        setReminderDays((data as any).warranty_reminder_days as number[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const expDate = useMemo(() => {
    const d = new Date(`${expirationDate}T00:00:00`);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [expirationDate]);

  // Build upcoming reminder dates (exp - days). Skip past ones.
  const upcoming = useMemo(() => {
    const sortedDays = [...reminderDays].sort((a, b) => b - a); // 30, 14, 7, ...
    return sortedDays
      .map((d) => {
        const date = new Date(expDate);
        date.setDate(date.getDate() - d);
        return { days: d, date };
      })
      .filter((r) => r.date.getTime() >= today.getTime());
  }, [reminderDays, expDate, today]);

  // Next reminder is the soonest upcoming (last in sorted desc list)
  const nextReminder = upcoming[upcoming.length - 1] ?? null;

  // Check if a notification already exists today for this item (means reminder already fired)
  useEffect(() => {
    let cancelled = false;
    if (!user || !nextReminder) {
      setNextScheduled(false);
      return;
    }
    const isToday = nextReminder.date.getTime() === today.getTime();
    if (!isToday) {
      // Not due today — it's a future scheduled reminder
      setNextScheduled(true);
      return;
    }
    // Due today — check if it's been sent already
    (async () => {
      const todayStr = today.toISOString().split("T")[0];
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("item_id", itemId)
        .eq("user_id", user.id)
        .gte("created_at", `${todayStr}T00:00:00Z`)
        .lte("created_at", `${todayStr}T23:59:59Z`)
        .limit(1);
      if (!cancelled) setNextScheduled(!!data && data.length > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, nextReminder, today, itemId]);

  if (loading) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Bell className="h-3.5 w-3.5 text-primary" />
          Warranty Reminders
        </div>
        {reminderDays.length === 0 ? (
          <Badge variant="outline" className="text-[9px] gap-0.5">
            <BellOff className="h-2.5 w-2.5" /> Off
          </Badge>
        ) : nextReminder ? (
          nextScheduled ? (
            <Badge className="text-[9px] gap-0.5 bg-emerald-500 hover:bg-emerald-600 text-white">
              <CheckCircle2 className="h-2.5 w-2.5" /> Next scheduled
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] gap-0.5">
              <Clock className="h-2.5 w-2.5" /> Pending today
            </Badge>
          )
        ) : (
          <Badge variant="outline" className="text-[9px]">No upcoming</Badge>
        )}
      </div>

      {reminderDays.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Reminders are turned off in your account settings.
        </p>
      ) : upcoming.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          All reminder dates have passed.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {upcoming.map((r, i) => {
            const isNext = i === upcoming.length - 1;
            const label =
              r.days === 0
                ? "On expiry day"
                : `${r.days} day${r.days === 1 ? "" : "s"} before`;
            return (
              <li
                key={r.days}
                className={`flex items-center justify-between text-[11px] ${
                  isNext ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                <span>{label}</span>
                <span>{r.date.toLocaleDateString()}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

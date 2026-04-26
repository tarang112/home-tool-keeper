import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Search, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";

type FilterType = "all" | "unread" | "restock" | "expiry";

const matchesType = (title: string, type: FilterType) => {
  if (type === "restock") return title.includes("🛒");
  if (type === "expiry") return /⚠️|🔴|🧊|🍿|🥬|🛡️/.test(title);
  return true;
};

export default function NotificationHistory() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (filter === "unread" && notification.read) return false;
      if (!matchesType(notification.title, filter)) return false;
      if (!q) return true;
      return `${notification.title} ${notification.message}`.toLowerCase().includes(q);
    });
  }, [filter, notifications, query]);

  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <main className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
              <Check className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold">Notification History</h1>
              <p className="text-sm text-muted-foreground">{notifications.length} total alerts · {unreadCount} unread</p>
            </div>
            <Badge variant="secondary">{filtered.length} shown</Badge>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications..." className="pl-9" />
            </div>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="restock">Restock</TabsTrigger>
                <TabsTrigger value="expiry">Expiry</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </section>

        <ScrollArea className="h-[calc(100vh-260px)] rounded-lg border bg-card">
          {filtered.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No notifications found</div>
          ) : (
            <div className="divide-y">
              {filtered.map((notification) => (
                <article key={notification.id} className={`flex gap-3 p-4 ${notification.read ? "" : "bg-accent/30"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">{notification.title}</h2>
                      {!notification.read && <Badge className="shrink-0 text-[10px]">New</Badge>}
                    </div>
                    {notification.message && <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!notification.read && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead(notification.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteNotification(notification.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </ScrollArea>
      </main>
    </div>
  );
}

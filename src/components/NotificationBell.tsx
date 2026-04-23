import { Bell, Check, Trash2, Search, Filter, X, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow, format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type FilterType = "all" | "warranty" | "expiry" | "unread";

const isWarrantyNotification = (title: string) => title.includes("🛡️");
const isExpiryNotification = (title: string) =>
  /⚠️|🔴|🧊|🍿|🥬/.test(title) && !isWarrantyNotification(title);

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      // Type filter
      if (filterType === "warranty" && !isWarrantyNotification(n.title)) return false;
      if (filterType === "expiry" && !isExpiryNotification(n.title)) return false;
      if (filterType === "unread" && n.read) return false;

      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${n.title} ${n.message ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // Date range
      if (dateRange?.from) {
        const created = new Date(n.createdAt);
        const from = startOfDay(dateRange.from);
        const to = endOfDay(dateRange.to ?? dateRange.from);
        if (!isWithinInterval(created, { start: from, end: to })) return false;
      }
      return true;
    });
  }, [notifications, filterType, search, dateRange]);

  const hasActiveFilters = filterType !== "all" || !!search.trim() || !!dateRange?.from;

  const clearFilters = () => {
    setFilterType("all");
    setSearch("");
    setDateRange(undefined);
  };

  const dateRangeLabel = dateRange?.from
    ? dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
      ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "Date range";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-heading font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={markAllRead}>
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="px-3 py-2 border-b space-y-2 bg-muted/20">
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-[11px]">All</TabsTrigger>
              <TabsTrigger value="warranty" className="text-[11px]">🛡️ Warranty</TabsTrigger>
              <TabsTrigger value="expiry" className="text-[11px]">⚠️ Expiry</TabsTrigger>
              <TabsTrigger value="unread" className="text-[11px]">Unread</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item or message..."
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs gap-1 px-2",
                    dateRange?.from && "border-primary text-primary"
                  )}
                >
                  <CalendarIcon className="h-3 w-3" />
                  <span className="max-w-[110px] truncate">{dateRangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(r) => {
                    setDateRange(r);
                    if (r?.from && r?.to) setCalendarOpen(false);
                  }}
                  numberOfMonths={1}
                  className={cn("p-3 pointer-events-auto")}
                />
                {dateRange?.from && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        setDateRange(undefined);
                        setCalendarOpen(false);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> Clear date range
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Filter className="h-2.5 w-2.5" />
                {filtered.length} of {notifications.length}
              </span>
              <button onClick={clearFilters} className="hover:text-foreground underline">
                Clear filters
              </button>
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[320px]">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {notifications.length === 0 ? "No notifications" : "No matches"}
            </p>
          ) : (
            <div className="divide-y">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex gap-3 items-start ${!n.read ? "bg-accent/30" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? "font-medium" : "text-muted-foreground"}`}>{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.read && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markRead(n.id)} title="Mark read">
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteNotification(n.id)} title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

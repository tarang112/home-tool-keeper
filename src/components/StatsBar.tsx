import { AlertTriangle, Boxes, Layers3, Package } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CATEGORIES, type InventoryItem } from "@/hooks/use-inventory";

interface StatsBarProps {
  items: InventoryItem[];
  onOutOfStockClick?: () => void;
  onCategoryClick?: (category: string) => void;
  activeFilter?: "outOfStock" | "location";
}

export function StatsBar({ items, onOutOfStockClick, onCategoryClick, activeFilter }: StatsBarProps) {
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const lowStock = items.filter((i) => i.quantity <= 1).length;

  const categorySummary = Object.values(
    items.reduce<Record<string, { key: string; value: string; label: string; icon: string; count: number }>>((acc, item) => {
      const key = item.category === "custom" ? `custom:${item.customCategory || "Other"}` : item.category;
      const known = CATEGORIES.find((category) => category.value === item.category);
      const label = item.category === "custom" ? item.customCategory || "Other" : known?.label || item.category;
      const icon = item.category === "custom" ? "📦" : known?.icon || "📦";

      acc[key] = acc[key] || { key, value: item.category, label, icon, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const trendData = [...items]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce<Array<{ date: string; items: number }>>((acc, item, index) => {
      const date = new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const existing = acc.find((point) => point.date === date);
      if (existing) existing.items = index + 1;
      else acc.push({ date, items: index + 1 });
      return acc;
    }, [])
    .slice(-8);

  const topCategories = categorySummary.slice(0, 4);
  const remainingCategories = Math.max(categorySummary.length - topCategories.length, 0);

  const stats = [
    { key: "items", value: String(totalItems), label: "Total items", icon: Package, onClick: undefined as (() => void) | undefined },
    { key: "quantity", value: String(totalQuantity), label: "Units tracked", icon: Boxes, onClick: undefined },
    { key: "outOfStock", value: String(lowStock), label: "Low stock", icon: AlertTriangle, onClick: onOutOfStockClick },
    { key: "categories", value: String(categorySummary.length), label: "Categories", icon: Layers3, onClick: undefined },
  ];

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm" aria-label="Inventory dashboard">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => {
          const isActive = activeFilter === stat.key;
          return (
            <button
              key={stat.key}
              onClick={stat.onClick}
              className={`min-h-20 rounded-md border p-3 text-left transition-all ${stat.onClick ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : "cursor-default"} ${isActive ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-background/60"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <stat.icon className={`h-4 w-4 shrink-0 ${stat.key === "outOfStock" ? "text-destructive" : "text-primary"}`} />
                <span className="font-heading text-2xl font-bold leading-none">{stat.value}</span>
              </div>
              <p className="mt-2 text-xs font-medium text-muted-foreground">{stat.label}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-heading text-sm font-semibold">Categories summary</h2>
            {remainingCategories > 0 && <span className="text-xs text-muted-foreground">+{remainingCategories} more</span>}
          </div>
          {topCategories.length > 0 ? (
            <div className="space-y-2">
              {topCategories.map((category) => {
                const percentage = totalItems ? Math.round((category.count / totalItems) * 100) : 0;
                return (
                  <button key={category.key} onClick={() => onCategoryClick?.(category.value)} className="grid w-full grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 rounded-md p-1 text-left text-sm hover:bg-accent">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{category.icon} {category.label}</span>
                        <span className="text-xs text-muted-foreground">{category.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                    <span className="text-right text-xs text-muted-foreground">{percentage}%</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No categories yet</p>
          )}
        </div>

        <div className="min-h-36">
          <h2 className="mb-2 font-heading text-sm font-semibold">Stock trend</h2>
          {trendData.length > 1 ? (
            <div className="h-32 rounded-md border bg-background/60 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }} />
                  <Area type="monotone" dataKey="items" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.18)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md border bg-background/60 text-sm text-muted-foreground">Add more items to see trends</div>
          )}
        </div>
      </div>
    </section>
  );
}

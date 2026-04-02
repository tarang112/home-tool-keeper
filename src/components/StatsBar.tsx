import { Package, AlertTriangle, MapPin, DollarSign } from "lucide-react";
import type { InventoryItem } from "@/hooks/use-inventory";

interface StatsBarProps {
  items: InventoryItem[];
  onOutOfStockClick?: () => void;
  onLocationClick?: () => void;
  activeFilter?: "outOfStock" | "location";
}

export function StatsBar({ items, onOutOfStockClick, onLocationClick, activeFilter }: StatsBarProps) {
  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);
  const lowStock = items.filter((i) => i.quantity === 0).length;
  const locations = new Set(
    items.map((i) => i.location?.trim()).filter(Boolean)
  ).size;

  const formatValue = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

  const stats = [
    { key: "items", value: String(totalItems), label: "Items", icon: Package, color: "text-primary", bg: "", onClick: undefined as (() => void) | undefined },
    { key: "value", value: formatValue(totalValue), label: "Value", icon: DollarSign, color: "text-emerald-500", bg: "", onClick: undefined },
    { key: "outOfStock", value: String(lowStock), label: "Low", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10 dark:bg-destructive/20", onClick: onOutOfStockClick },
    { key: "location", value: String(locations), label: "Locations", icon: MapPin, color: "text-muted-foreground", bg: "", onClick: onLocationClick },
  ];

  return (
    <div className="flex gap-2">
      {stats.map((stat) => {
        const isActive = activeFilter === stat.key;
        return (
          <button
            key={stat.key}
            onClick={stat.onClick}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-left flex-1 min-w-0
              ${stat.onClick ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : "cursor-default"}
              ${isActive 
                ? "ring-2 ring-primary bg-primary/10 dark:bg-primary/20 border-primary/40" 
                : `bg-card dark:bg-card/80 border-border ${stat.bg}`}
            `}
          >
            <stat.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : stat.color}`} />
            <div className="min-w-0 flex items-baseline gap-1">
              <span className="font-heading font-bold text-sm leading-none">{stat.value}</span>
              <span className="text-[9px] text-muted-foreground hidden sm:inline">{stat.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

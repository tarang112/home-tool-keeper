import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, MapPin, DollarSign } from "lucide-react";
import type { InventoryItem } from "@/hooks/use-inventory";

interface StatsBarProps {
  items: InventoryItem[];
  onOutOfStockClick?: () => void;
}

export function StatsBar({ items, onOutOfStockClick }: StatsBarProps) {
  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);
  const lowStock = items.filter((i) => i.quantity === 0).length;
  const locations = new Set(
    items.map((i) => i.location?.trim()).filter(Boolean)
  ).size;

  const stats = [
    { label: "Items", value: String(totalItems), icon: Package, color: "text-primary", onClick: undefined as (() => void) | undefined },
    { label: "Total Value", value: totalValue > 0 ? `$${totalValue.toFixed(0)}` : "$0", icon: DollarSign, color: "text-emerald-500", onClick: undefined },
    { label: "Out of Stock", value: String(lowStock), icon: AlertTriangle, color: "text-destructive", onClick: onOutOfStockClick },
    { label: "Locations", value: String(locations), icon: MapPin, color: "text-muted-foreground", onClick: undefined },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={`animate-fade-in ${stat.onClick ? "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" : ""}`}
          onClick={stat.onClick}
        >
          <CardContent className="p-2.5 flex items-center gap-2">
            <stat.icon className={`h-4 w-4 ${stat.color} shrink-0`} />
            <div className="min-w-0">
              <p className="font-heading font-bold text-lg leading-none truncate">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

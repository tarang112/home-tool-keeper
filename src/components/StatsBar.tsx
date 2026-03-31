import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, MapPin, DollarSign } from "lucide-react";
import type { InventoryItem } from "@/hooks/use-inventory";

interface StatsBarProps {
  items: InventoryItem[];
}

export function StatsBar({ items }: StatsBarProps) {
  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);
  const lowStock = items.filter((i) => i.quantity === 0).length;
  const locations = new Set(items.map((i) => i.sharedFromHouse || i.houseId || i.location || "personal")).size;

  const stats = [
    { label: "Items", value: String(totalItems), icon: Package, color: "text-primary" },
    { label: "Total Value", value: totalValue > 0 ? `$${totalValue.toFixed(0)}` : "$0", icon: DollarSign, color: "text-emerald-500" },
    { label: "Out of Stock", value: String(lowStock), icon: AlertTriangle, color: "text-destructive" },
    { label: "Locations", value: String(locations), icon: MapPin, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="animate-fade-in">
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

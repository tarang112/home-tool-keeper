import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, MapPin } from "lucide-react";
import type { InventoryItem } from "@/hooks/use-inventory";

interface StatsBarProps {
  items: InventoryItem[];
}

export function StatsBar({ items }: StatsBarProps) {
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const lowStock = items.filter((i) => i.quantity === 0).length;
  const locations = new Set(items.map((i) => i.sharedFromHouse || i.houseId || i.location || "personal")).size;

  const stats = [
    { label: "Items", value: totalItems, icon: Package, color: "text-primary" },
    { label: "Out of Stock", value: lowStock, icon: AlertTriangle, color: "text-destructive" },
    { label: "Locations", value: locations, icon: MapPin, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="animate-fade-in">
          <CardContent className="p-3 flex items-center gap-3">
            <stat.icon className={`h-5 w-5 ${stat.color} shrink-0`} />
            <div>
              <p className="font-heading font-bold text-xl leading-none">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

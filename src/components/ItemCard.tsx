import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Pencil, Trash2, MapPin, ArrowRightLeft, Share2 } from "lucide-react";
import { CATEGORIES, type InventoryItem } from "@/hooks/use-inventory";

interface ItemCardProps {
  item: InventoryItem;
  onAdjust: (id: string, delta: number) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onMove?: (item: InventoryItem) => void;
}

export function ItemCard({ item, onAdjust, onEdit, onDelete, onMove }: ItemCardProps) {
  const cat = CATEGORIES.find((c) => c.value === item.category);
  const categoryLabel = item.category === "custom" ? (item.customCategory || "Custom") : cat?.label;
  const categoryIcon = item.category === "custom" ? "✏️" : cat?.icon;
  return (
    <Card className="animate-slide-up">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{categoryIcon}</span>
              <h3 className="font-heading font-semibold text-base truncate">{item.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
              {item.sharedFromHouse && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Share2 className="h-3 w-3" />
                  Shared from {item.sharedFromHouse}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.location}
                {item.locationDetail && ` · ${item.locationDetail}`}
              </span>
            </div>
            {item.locationImage && (
              <img src={item.locationImage} alt="Location" className="w-full h-20 object-cover rounded-md mb-2" />
            )}
            {item.barcode && (
              <p className="text-xs text-muted-foreground font-mono">Barcode: {item.barcode}</p>
            )}
            {item.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAdjust(item.id, -1)}
                disabled={item.quantity <= 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className={`font-heading font-bold text-lg w-8 text-center ${item.quantity === 0 ? "text-destructive" : ""}`}>
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAdjust(item.id, 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-1 mt-1">
              {onMove && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(item)} title="Move to house">
                  <ArrowRightLeft className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

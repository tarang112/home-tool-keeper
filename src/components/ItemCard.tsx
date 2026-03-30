import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Pencil, Trash2, MapPin, ArrowRightLeft, Share2 } from "lucide-react";
import { CATEGORIES, type InventoryItem } from "@/hooks/use-inventory";

function proxyImg(url?: string) {
  if (!url) return "";
  if (url.includes("supabase.co/")) return url; // our own storage, no proxy needed
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=200&h=200&fit=contain&bg=white`;
}

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
  const hasProductImg = !!item.productImage;
  const hasItemImg = !!item.itemImage;
  const hasLocationImg = !!item.locationImage;

  return (
    <Card className="animate-slide-up">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Product thumbnail */}
          {hasProductImg && (
            <img
              src={proxyImg(item.productImage)}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-lg object-contain bg-white border shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

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

            {/* Thumbnails row: product + location side by side */}
            {(hasProductImg || hasItemImg || hasLocationImg) && (
              <div className="flex gap-2 mb-2">
                {hasProductImg && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-1">Product</p>
                    <img
                      src={proxyImg(item.productImage)}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-20 object-contain rounded-md bg-white border"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                  </div>
                )}
                {hasItemImg && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-1">Item</p>
                    <img
                      src={proxyImg(item.itemImage)}
                      alt="Item"
                      className="w-full h-20 object-contain rounded-md border bg-white"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                  </div>
                )}
                {hasLocationImg && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-1">Location</p>
                    <img
                      src={item.locationImage}
                      alt="Location"
                      className="w-full h-20 object-contain rounded-md border bg-white"
                    />
                  </div>
                )}
              </div>
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

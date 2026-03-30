import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Pencil, Trash2, MapPin, ArrowRightLeft, Share2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { CATEGORIES, MAIN_CATEGORIES, type InventoryItem } from "@/hooks/use-inventory";
import { useState } from "react";

function proxyImg(url?: string, size = 200) {
  if (!url) return "";
  if (url.includes("supabase.co/")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=contain&bg=white`;
}

function fullImg(url?: string) {
  if (!url) return "";
  if (url.includes("supabase.co/")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800&h=800&fit=contain&bg=white`;
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
  const mainCat = MAIN_CATEGORIES.find((c) => c.value === item.category);
  const subLabel = item.subcategory
    ? (mainCat?.subcategories.find(s => s.value === item.subcategory)?.label || item.subcategory)
    : undefined;
  const categoryLabel = item.category === "custom" ? (item.customCategory || "Custom") : cat?.label;
  const categoryIcon = item.category === "custom" ? "✏️" : cat?.icon;
  const hasProductImg = !!item.productImage;
  const hasItemImg = !!item.itemImage;
  const hasLocationImg = !!item.locationImage;
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const hasAnyImage = hasProductImg || hasItemImg || hasLocationImg;

  return (
    <Card className="animate-slide-up">
      <CardContent className="p-4">
        {/* Always visible: icon, name, category, expiration, quantity */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{categoryIcon}</span>
              <h3 className="font-heading font-semibold text-base truncate">{item.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">{categoryLabel}{subLabel ? ` › ${subLabel}` : ""}</Badge>
              {item.expirationDate && (() => {
                const exp = new Date(item.expirationDate);
                const now = new Date();
                const diffMs = exp.getTime() - now.getTime();
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const isExpired = diffDays < 0;
                const isExpiringSoon = diffDays >= 0 && diffDays <= 90;
                return (
                  <Badge
                    variant={isExpired ? "destructive" : isExpiringSoon ? "default" : "outline"}
                    className={`text-xs gap-1 ${isExpiringSoon && !isExpired ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                  >
                    <Clock className="h-3 w-3" />
                    {isExpired ? "Expired" : `Exp: ${exp.toLocaleDateString()}`}
                  </Badge>
                );
              })()}
              <span className="text-muted-foreground">
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAdjust(item.id, -1)}
              disabled={item.quantity <= 0}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className={`font-heading font-bold text-lg text-center min-w-[2ch] ${item.quantity === 0 ? "text-destructive" : ""}`}>
              {item.quantity}{item.quantityUnit && item.quantityUnit !== "pcs" ? ` ${item.quantityUnit}` : ""}
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
        </div>

        {/* Action buttons - bottom right */}
        <div className="flex justify-end gap-0.5 mt-2">
          {onMove && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(item)} title="Move to house">
              <ArrowRightLeft className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2 animate-fade-in">
            {item.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.location}
                {item.locationDetail && ` · ${item.locationDetail}`}
              </span>
            )}

            {item.sharedFromHouse && (
              <Badge variant="outline" className="text-xs gap-1">
                <Share2 className="h-3 w-3" />
                Shared from {item.sharedFromHouse}
              </Badge>
            )}

            {item.barcode && (
              <p className="text-xs text-muted-foreground font-mono">Barcode: {item.barcode}</p>
            )}
            {item.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
            )}

            {/* Images */}
            {hasAnyImage && (
              <div className="flex gap-2 flex-wrap">
                {hasProductImg && (
                  <div className="shrink-0 cursor-pointer" onClick={() => setZoomedImg(fullImg(item.productImage))}>
                    <p className="text-[10px] text-muted-foreground mb-1">Product</p>
                    <img
                      src={proxyImg(item.productImage)}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="h-20 max-w-[120px] object-contain rounded-md bg-white border"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                  </div>
                )}
                {hasItemImg && (
                  <div className="shrink-0 cursor-pointer" onClick={() => setZoomedImg(fullImg(item.itemImage))}>
                    <p className="text-[10px] text-muted-foreground mb-1">Item</p>
                    <img
                      src={proxyImg(item.itemImage)}
                      alt="Item"
                      className="h-20 max-w-[120px] object-contain rounded-md border bg-white"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                  </div>
                )}
                {hasLocationImg && (
                  <div className="shrink-0 cursor-pointer" onClick={() => setZoomedImg(item.locationImage || "")}>
                    <p className="text-[10px] text-muted-foreground mb-1">Location</p>
                    <img
                      src={item.locationImage}
                      alt="Location"
                      className="h-20 max-w-[120px] object-contain rounded-md border bg-white"
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Full-size image overlay */}
        {zoomedImg && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer"
            onClick={() => setZoomedImg(null)}
          >
            <img
              src={zoomedImg}
              alt="Full size"
              referrerPolicy="no-referrer"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-lg bg-white animate-scale-in"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

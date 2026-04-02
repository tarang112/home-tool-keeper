import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Pencil, Trash2, MapPin, ArrowRightLeft, Share2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { CATEGORIES, MAIN_CATEGORIES, type InventoryItem, type MainCategory } from "@/hooks/use-inventory";
import { BUSINESS_TYPES } from "@/config/business-categories";
import { useState, useMemo } from "react";

const ALL_CATEGORIES: MainCategory[] = [
  ...MAIN_CATEGORIES,
  ...BUSINESS_TYPES.flatMap((bt) => bt.categories),
];

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

interface ItemCardBatchEntry {
  id: string;
  quantity: number;
  quantityUnit: string;
  expirationDate: string | null;
}

interface ItemCardProps {
  item: InventoryItem & { batchEntries?: ItemCardBatchEntry[] };
  onAdjust: (id: string, delta: number) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onMove?: (item: InventoryItem) => void;
  /** All raw items for resolving batch entry editing */
  allItems?: InventoryItem[];
}

export function ItemCard({ item, onAdjust, onEdit, onDelete, onMove, allItems }: ItemCardProps) {
  const allCat = ALL_CATEGORIES.find((c) => c.value === item.category);
  const cat = CATEGORIES.find((c) => c.value === item.category) || (allCat ? { value: allCat.value, label: allCat.label, icon: allCat.icon } : undefined);
  const subLabel = item.subcategory
    ? (allCat?.subcategories.find(s => s.value === item.subcategory)?.label || item.subcategory)
    : undefined;
  const categoryLabel = item.category === "custom" ? (item.customCategory || "Custom") : cat?.label || item.category;
  const categoryIcon = item.category === "custom" ? "✏️" : cat?.icon || "📦";
  const hasItemImg = !!item.itemImage;
  const hasProductImg = !!item.productImage;
  const hasLocationImg = !!item.locationImage;
  const primaryImage = hasItemImg ? item.itemImage : (hasProductImg ? item.productImage : "");
  const hasPrimaryImg = !!primaryImage;
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const hasAnyImage = hasPrimaryImg || hasLocationImg;
  const batchEntries = (item.batchEntries || []).filter((entry) => entry.quantity > 0);
  const batchExpiries = batchEntries.filter((entry) => !!entry.expirationDate).sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());

  return (
    <Card className="animate-slide-up">
      <CardContent className="px-3 py-2 space-y-1">
        {/* Row 1: icon, name, quantity */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
            {hasPrimaryImg ? (
              <img
                src={proxyImg(primaryImage, 32)}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="h-6 w-6 rounded object-cover shrink-0"
              />
            ) : (
              <span className="text-sm">{categoryIcon}</span>
            )}
            <h3 className="font-heading font-semibold text-sm truncate">{item.name}</h3>
            <span className="text-muted-foreground shrink-0">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onAdjust(item.id, -1)} disabled={item.quantity <= 0}>
              <Minus className="h-2.5 w-2.5" />
            </Button>
            <span className={`font-heading font-bold text-sm text-center min-w-[2ch] ${item.quantity === 0 ? "text-destructive" : ""}`}>
              {item.quantity}{item.quantityUnit && item.quantityUnit !== "pcs" ? ` ${item.quantityUnit}` : ""}
            </span>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onAdjust(item.id, 1)}>
              <Plus className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        {/* Row 2: badges + actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 max-w-[40vw] truncate" title={`${categoryLabel}${subLabel ? ` › ${subLabel}` : ""}`}>
              {categoryLabel}{subLabel ? ` › ${subLabel}` : ""}
            </Badge>
            {item.location && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 max-w-[30vw] truncate" title={item.location}>
                <MapPin className="h-2.5 w-2.5 shrink-0" />{item.location}
              </Badge>
            )}
            {batchExpiries.length > 1 ? batchExpiries.map((entry, idx) => {
              const exp = new Date(entry.expirationDate!);
              const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isExpired = diffDays < 0;
              const isExpiringSoon = diffDays >= 0 && diffDays <= 90;
              return (
                <Badge
                  key={`${entry.id}-${idx}`}
                  variant={isExpired ? "destructive" : isExpiringSoon ? "default" : "outline"}
                  className={`text-[10px] px-1.5 py-0 gap-0.5 ${isExpiringSoon && !isExpired ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {exp.toLocaleDateString()}
                </Badge>
              );
            }) : item.expirationDate && (() => {
              const exp = new Date(item.expirationDate);
              const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isExpired = diffDays < 0;
              const isExpiringSoon = diffDays >= 0 && diffDays <= 90;
              return (
                <Badge
                  variant={isExpired ? "destructive" : isExpiringSoon ? "default" : "outline"}
                  className={`text-[10px] px-1.5 py-0 gap-0.5 ${isExpiringSoon && !isExpired ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {isExpired ? "Expired" : `${exp.toLocaleDateString()}`}
                </Badge>
              );
            })()}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {onMove && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(item)} title="Move">
                <ArrowRightLeft className="h-2.5 w-2.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(item)} title="Edit">
              <Pencil className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(item.id)} title="Delete">
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2 animate-fade-in">
            {/* Per-batch controls when multiple batches exist */}
            {batchEntries.length > 1 && (
              <div className="space-y-1.5 p-2 rounded-md bg-muted/50 border border-dashed">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">Stock Batches:</p>
                {batchEntries
                  .slice()
                  .sort((a, b) => {
                    if (!a.expirationDate && !b.expirationDate) return 0;
                    if (!a.expirationDate) return 1;
                    if (!b.expirationDate) return -1;
                    return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
                  })
                  .map((entry) => {
                    const exp = entry.expirationDate ? new Date(entry.expirationDate) : null;
                    const diffDays = exp ? Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                    const isExpired = diffDays != null && diffDays < 0;
                    const isExpiringSoon = diffDays != null && diffDays >= 0 && diffDays <= 90;
                    const resolvedItem = allItems?.find((i) => i.id === entry.id);
                    return (
                      <div key={entry.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center gap-0.5">
                            <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => onAdjust(entry.id, -1)} disabled={entry.quantity <= 0}>
                              <Minus className="h-2 w-2" />
                            </Button>
                            <span className={`font-heading font-bold text-xs text-center min-w-[2ch] ${entry.quantity === 0 ? "text-destructive" : ""}`}>
                              {entry.quantity}{entry.quantityUnit && entry.quantityUnit !== "pcs" ? ` ${entry.quantityUnit}` : ""}
                            </span>
                            <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => onAdjust(entry.id, 1)}>
                              <Plus className="h-2 w-2" />
                            </Button>
                          </div>
                          {exp ? (
                            <Badge
                              variant={isExpired ? "destructive" : isExpiringSoon ? "default" : "outline"}
                              className={`text-[10px] px-1.5 py-0 gap-0.5 ${isExpiringSoon && !isExpired ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {isExpired ? "Expired" : exp.toLocaleDateString()}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No expiry</span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {resolvedItem && (
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(resolvedItem)} title="Edit batch">
                              <Pencil className="h-2.5 w-2.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onDelete(entry.id)} title="Delete batch">
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

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
            {(item.unitPrice != null || item.totalPrice != null) && (
              <div className="flex items-center gap-2 text-xs">
                {item.totalPrice != null && (
                  <Badge variant="secondary" className="text-xs gap-0.5">
                    💰 ${item.totalPrice.toFixed(2)}
                  </Badge>
                )}
                {item.unitPrice != null && (
                  <span className="text-muted-foreground">${item.unitPrice.toFixed(2)}/ea</span>
                )}
              </div>
            )}
            {item.notes && (() => {
              const lines = item.notes.split("\n");
              const batchLines = lines.filter(l => /^(Previous|New batch):/i.test(l.trim()));
              const receiptLines = lines.filter(l => /^Receipt:\s/i.test(l.trim()));
              const otherLines = lines.filter(l => !/^(Previous|New batch|---|Receipt:)/i.test(l.trim()));
              return (
                <div className="space-y-1">
                  {batchLines.length > 0 && (
                    <div className="space-y-0.5 p-1.5 rounded bg-muted/50 border border-dashed">
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Stock Batches:</p>
                      {batchLines.map((line, idx) => (
                        <p key={idx} className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          {line.trim()}
                        </p>
                      ))}
                    </div>
                  )}
                  {receiptLines.length > 0 && receiptLines.map((line, idx) => {
                    const url = line.trim().replace(/^Receipt:\s*/i, "");
                    return (
                      <a key={`receipt-${idx}`} href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline flex items-center gap-1">
                        🧾 View Receipt
                      </a>
                    );
                  })}
                  {otherLines.filter(Boolean).length > 0 && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{otherLines.filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              );
            })()}

            {/* Images */}
            {hasAnyImage && (
              <div className="flex gap-2 flex-wrap">
                {hasPrimaryImg && (
                  <div className="shrink-0 cursor-pointer" onClick={() => setZoomedImg(fullImg(primaryImage))}>
                    <p className="text-[10px] text-muted-foreground mb-1">{hasItemImg ? "Item" : "Product"}</p>
                    <img
                      src={proxyImg(primaryImage)}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="h-20 max-w-[120px] object-contain rounded-md bg-white border"
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

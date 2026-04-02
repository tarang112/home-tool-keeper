import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Pencil, Trash2, MapPin, ArrowRightLeft, Share2, Clock, ChevronDown, ChevronUp, HandHelping, Undo2 } from "lucide-react";
import { CATEGORIES, MAIN_CATEGORIES, type InventoryItem, type MainCategory } from "@/hooks/use-inventory";
import { BUSINESS_TYPES } from "@/config/business-categories";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onLend?: (id: string, lentTo: string | null, lentNotes: string | null) => void;
  /** All raw items for resolving batch entry editing */
  allItems?: InventoryItem[];
  /** House members for lend-to selection */
  houseMembers?: { user_id: string; display_name: string }[];
}

export function ItemCard({ item, onAdjust, onEdit, onDelete, onMove, onLend, allItems, houseMembers }: ItemCardProps) {
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
  const [lendOpen, setLendOpen] = useState(false);
  const [lendName, setLendName] = useState(item.lentTo || "");
  const [lendNotes, setLendNotes] = useState(item.lentNotes || "");
  const hasAnyImage = hasPrimaryImg || hasLocationImg;
  const batchEntries = (item.batchEntries || []).filter((entry) => entry.quantity > 0);
  const batchExpiries = batchEntries.filter((entry) => !!entry.expirationDate).sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
  const isLent = !!item.lentTo;
  const LENDABLE_CATEGORIES = ["hardware-tools", "building-materials", "electrical", "plumbing", "outdoor", "automotive"];

  // Determine left border color based on item status
  const borderColor = isLent
    ? "border-l-orange-500"
    : item.quantity === 0
      ? "border-l-destructive"
      : item.expirationDate && Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 7
        ? "border-l-amber-500"
        : "border-l-emerald-500";

  // Expiry/Lent tags for bottom-right — always show expiry if present
  const expiryTag = useMemo(() => {
    if (item.expirationDate) {
      const exp = new Date(item.expirationDate);
      const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { label: "Expired", color: "text-destructive" };
      if (diffDays <= 7) return { label: `Exp ${exp.toLocaleDateString()}`, color: "text-destructive" };
      if (diffDays <= 90) return { label: `Exp ${exp.toLocaleDateString()}`, color: "text-amber-500" };
      return { label: `Exp ${exp.toLocaleDateString()}`, color: "text-muted-foreground" };
    }
    return null;
  }, [item.expirationDate]);

  return (
    <Card className={`animate-slide-up border-l-[3px] ${borderColor} cursor-pointer`} onClick={() => setExpanded((v) => !v)}>
      <CardContent className="px-3 py-2.5 space-y-0">
        {/* Main row: thumbnail + info + quantity/price */}
        <div className="flex gap-3 items-start">
          {/* Thumbnail */}
          <div className="shrink-0" onClick={(e) => { if (hasPrimaryImg) { e.stopPropagation(); setZoomedImg(fullImg(primaryImage)); } }}>
            {hasPrimaryImg ? (
              <img
                src={proxyImg(primaryImage, 160)}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-muted/60 dark:bg-muted/30 flex items-center justify-center text-2xl">
                {categoryIcon}
              </div>
            )}
          </div>

          {/* Info + tags */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-base leading-tight truncate">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.location || "No location"} · {subLabel || categoryLabel}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-heading font-bold text-sm">
                  x{item.quantity}{item.quantityUnit && item.quantityUnit !== "pcs" ? ` ${item.quantityUnit}` : ""}
                </span>
                {item.totalPrice != null && (
                  <p className="text-xs font-medium text-muted-foreground">${item.totalPrice.toFixed(2)}</p>
                )}
              </div>
            </div>
            {/* Bottom-right tags */}
            {(expiryTag || isLent) && (
              <div className="flex items-center justify-end gap-2 mt-1">
                {expiryTag && (
                  <span className={`text-[11px] font-semibold ${expiryTag.color}`}>{expiryTag.label}</span>
                )}
                {isLent && (
                  <span className="text-[11px] font-semibold text-orange-500">Lent<sup>+</sup></span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-2 pt-2 border-t space-y-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              {onLend && LENDABLE_CATEGORIES.includes(item.category) && (
                isLent ? (
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 text-orange-500" onClick={() => onLend(item.id, null, null)}>
                    <Undo2 className="h-3 w-3" /> Return
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => { setLendName(""); setLendNotes(""); setLendOpen(true); }}>
                    <HandHelping className="h-3 w-3" /> Lend
                  </Button>
                )
              )}
              {onMove && (
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => onMove(item)}>
                  <ArrowRightLeft className="h-3 w-3" /> Move
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => onEdit(item)}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}>
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            </div>
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

        {/* Lend dialog */}
        <Dialog open={lendOpen} onOpenChange={setLendOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HandHelping className="h-4 w-4" /> Lend "{item.name}"
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Lent to</label>
                {houseMembers && houseMembers.length > 0 ? (
                  <div className="space-y-2">
                    <Select value={lendName} onValueChange={setLendName}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {houseMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.display_name || m.user_id}>
                            {m.display_name || "Member"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Or type a name..."
                      value={lendName}
                      onChange={(e) => setLendName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                ) : (
                  <Input
                    placeholder="Enter name..."
                    value={lendName}
                    onChange={(e) => setLendName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
                <Input
                  placeholder="e.g. Return by Friday"
                  value={lendNotes}
                  onChange={(e) => setLendNotes(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setLendOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!lendName.trim()}
                onClick={() => {
                  onLend?.(item.id, lendName.trim(), lendNotes.trim() || null);
                  setLendOpen(false);
                }}
              >
                Mark as Lent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

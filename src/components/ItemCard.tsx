import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Pencil, Trash2, MapPin, ArrowRightLeft, Share2, Clock, HandHelping, Undo2, MoreHorizontal, AlertTriangle } from "lucide-react";
import { CATEGORIES, MAIN_CATEGORIES, WARRANTY_CATEGORIES, type InventoryItem, type MainCategory } from "@/hooks/use-inventory";
import { BUSINESS_TYPES } from "@/config/business-categories";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WarrantyReminders } from "@/components/WarrantyReminders";

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

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [lendName, setLendName] = useState(item.lentTo || "");
  const [lendNotes, setLendNotes] = useState(item.lentNotes || "");
  const hasAnyImage = hasPrimaryImg || hasLocationImg;
  const batchEntries = (item.batchEntries || []).filter((entry) => entry.quantity > 0);
  const batchExpiries = batchEntries.filter((entry) => !!entry.expirationDate).sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
  const isLent = !!item.lentTo;
  const LENDABLE_CATEGORIES = ["hardware-tools", "building-materials", "electrical", "plumbing", "outdoor", "automotive"];

  const isWarrantyItem = WARRANTY_CATEGORIES.includes(item.category);

  // Primary status — drives both the labelled pill and the (exception-only) border tint
  const status = useMemo(() => {
    if (item.quantity === 0) {
      return { label: "Out of stock", tone: "destructive" as const, icon: AlertTriangle };
    }
    if (isLent) {
      return { label: `Lent to ${item.lentTo}`, tone: "lent" as const, icon: HandHelping };
    }
    if (item.expirationDate) {
      const diff = daysUntil(item.expirationDate);
      const prefix = isWarrantyItem ? "Warranty" : "Expires";
      if (diff < 0) return { label: isWarrantyItem ? "Warranty expired" : "Expired", tone: "destructive" as const, icon: Clock };
      if (diff <= 7) return { label: `${prefix} ${new Date(item.expirationDate).toLocaleDateString()}`, tone: "destructive" as const, icon: Clock };
      if (diff <= 90) return { label: `${prefix} ${new Date(item.expirationDate).toLocaleDateString()}`, tone: "warning" as const, icon: Clock };
    }
    if (item.quantity <= 1) {
      return { label: "Low stock", tone: "warning" as const, icon: AlertTriangle };
    }
    return null;
  }, [item.quantity, item.expirationDate, item.lentTo, isLent, isWarrantyItem]);

  const toneClasses: Record<string, string> = {
    destructive: "bg-destructive text-destructive-foreground",
    warning: "bg-warning text-warning-foreground",
    lent: "bg-lent text-lent-foreground",
  };
  const borderClasses: Record<string, string> = {
    destructive: "border-l-[3px] border-l-destructive",
    warning: "border-l-[3px] border-l-warning",
    lent: "border-l-[3px] border-l-lent",
  };

  const expiryBadgeClass = (diffDays: number) =>
    diffDays <= 7 ? "bg-destructive text-destructive-foreground"
      : diffDays <= 90 ? "bg-warning text-warning-foreground"
      : "bg-muted text-muted-foreground";

  const StatusIcon = status?.icon;

  return (
    <Card className={`animate-slide-up ${status ? borderClasses[status.tone] : ""}`}>
      <CardContent className="space-y-2 px-3 py-3">
        {/* Row 1: image + tap-to-expand name/status + stepper */}
        <div className="flex items-center gap-2">
          {hasPrimaryImg ? (
            <button
              type="button"
              className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setZoomedImg(fullImg(primaryImage))}
              aria-label={`View full-size image of ${item.name}`}
            >
              <img
                src={proxyImg(primaryImage, 96)}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded object-cover bg-muted"
              />
            </button>
          ) : (
            <span className="shrink-0 text-xl" aria-hidden="true">{categoryIcon}</span>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h3 className="w-full truncate font-heading text-[15px] font-bold leading-tight">
              {item.name}
            </h3>
            {status && StatusIcon && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses[status.tone]}`}>
                <StatusIcon className="h-3 w-3" aria-hidden="true" />
                {status.label}
              </span>
            )}
          </button>

          {/* Quantity stepper pill */}
          <div className="flex shrink-0 items-center rounded-full border bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => onAdjust(item.id, -1)}
              disabled={item.quantity <= 0}
              aria-label={`Decrease quantity of ${item.name}`}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span
              aria-live="polite"
              className={`min-w-[3ch] px-1 text-center font-heading text-sm font-bold ${item.quantity === 0 ? "text-destructive" : ""}`}
            >
              {item.quantity}{item.quantityUnit && item.quantityUnit !== "pcs" ? ` ${item.quantityUnit}` : ""}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => onAdjust(item.id, 1)}
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Row 2: category + location + expiry badges + actions */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="px-1.5 py-0.5 text-xs font-medium">
              {categoryLabel}{subLabel ? ` › ${subLabel}` : ""}
            </Badge>
            {item.location && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {item.location}
              </span>
            )}
            {batchExpiries.map((entry) => {
              const diffDays = daysUntil(entry.expirationDate!);
              const exp = new Date(entry.expirationDate!);
              return (
                <Badge key={entry.id} className={`gap-0.5 px-1.5 py-0.5 text-xs ${expiryBadgeClass(diffDays)}`}>
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {diffDays < 0 ? "Expired" : exp.toLocaleDateString()}
                </Badge>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
              <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`More actions for ${item.name}`}>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onMove && (
                  <DropdownMenuItem onSelect={() => onMove(item)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Move
                  </DropdownMenuItem>
                )}
                {onLend && LENDABLE_CATEGORIES.includes(item.category) && (
                  isLent ? (
                    <DropdownMenuItem onSelect={() => onLend(item.id, null, null)}>
                      <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" /> Mark returned
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => { setLendName(""); setLendNotes(""); setLendOpen(true); }}>
                      <HandHelping className="mr-2 h-4 w-4" aria-hidden="true" /> Lend
                    </DropdownMenuItem>
                  )
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => { setEntryToDelete(null); setDeleteOpen(true); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Per-entry controls - visible only when expanded */}
        {expanded && batchEntries.length > 1 && (
          <div className="space-y-1 border-t pt-2">
            {batchEntries
              .sort((a, b) => {
                if (!a.expirationDate && !b.expirationDate) return 0;
                if (!a.expirationDate) return 1;
                if (!b.expirationDate) return -1;
                return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
              })
              .map((entry) => {
                const exp = entry.expirationDate ? new Date(entry.expirationDate) : null;
                const diffDays = entry.expirationDate ? daysUntil(entry.expirationDate) : null;
                const badgeClass = diffDays !== null ? expiryBadgeClass(diffDays) : "bg-muted text-muted-foreground";
                const expiryLabel = exp ? (diffDays! < 0 ? "Expired" : exp.toLocaleDateString()) : "no expiry";
                const entryItem = allItems?.find((i) => i.id === entry.id);
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-1 pl-2">
                    <Badge className={`gap-0.5 px-1.5 py-0.5 text-xs ${badgeClass}`}>
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {expiryLabel}
                    </Badge>
                    <div className="flex shrink-0 items-center gap-1">
                      <div className="flex items-center rounded-full border bg-background">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => onAdjust(entry.id, -1)} disabled={entry.quantity <= 0} aria-label="Decrease batch quantity">
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <span className="min-w-[2ch] px-1 text-center text-xs font-bold">
                          {entry.quantity}{entry.quantityUnit && entry.quantityUnit !== "pcs" ? entry.quantityUnit : ""}
                        </span>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => onAdjust(entry.id, 1)} aria-label="Increase batch quantity">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                      {entryItem && (
                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => onEdit(entryItem)} aria-label="Edit batch entry">
                          <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="More actions for batch entry">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {onMove && entryItem && (
                            <DropdownMenuItem onSelect={() => onMove(entryItem)}>
                              <ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Move
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => { setEntryToDelete(entry.id); setDeleteOpen(true); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-1.5 animate-fade-in space-y-1.5 border-t pt-1.5">
            {item.category === "electronics" && item.expirationDate && (
              <WarrantyReminders itemId={item.id} expirationDate={item.expirationDate} />
            )}
            {item.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {item.location}
                {item.locationDetail && ` · ${item.locationDetail}`}
              </span>
            )}
            {(item.unitPrice != null || item.totalPrice != null) && (
              <div className="flex items-center gap-2 text-xs">
                {item.totalPrice != null && (
                  <Badge variant="secondary" className="gap-0.5 text-xs">
                    💰 ${item.totalPrice.toFixed(2)}
                  </Badge>
                )}
                {item.unitPrice != null && (
                  <span className="text-muted-foreground">${item.unitPrice.toFixed(2)}/ea</span>
                )}
              </div>
            )}
            {item.sharedFromHouse && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Share2 className="h-3 w-3" aria-hidden="true" />
                Shared from {item.sharedFromHouse}
              </Badge>
            )}
            {item.barcode && (
              <p className="font-mono text-xs text-muted-foreground">Barcode: {item.barcode}</p>
            )}
            {item.notes && (() => {
              const lines = item.notes.split("\n");
              const receiptLines = lines.filter(l => /^Receipt:\s/i.test(l.trim()));
              const otherLines = lines.filter(l => !/^(Previous|New batch|---|Receipt:)/i.test(l.trim()));
              return (
                <div className="space-y-1">
                  {receiptLines.length > 0 && receiptLines.map((line, idx) => {
                    const rest = line.trim().replace(/^Receipt:\s*/i, "");
                    const storeDateMatch = item.notes?.match(/Store:\s*(.+?)(?:\s*·\s*Date:\s*(.+?))?$/m);
                    return (
                      <span key={`receipt-${idx}`} className="text-xs text-muted-foreground">
                        {storeDateMatch?.[1] && `Store: ${storeDateMatch[1]}`}
                        {storeDateMatch?.[2] && ` · Date: ${storeDateMatch[2]}`}
                        {storeDateMatch?.[2] && " · "}
                        <a href={rest} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Receipt</a>
                      </span>
                    );
                  })}
                  {otherLines.filter(Boolean).length > 0 && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{otherLines.filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              );
            })()}
            {/* Images */}
            {hasAnyImage && (
              <div className="flex flex-wrap gap-2">
                {hasPrimaryImg && (
                  <button type="button" className="shrink-0 text-left" onClick={() => setZoomedImg(fullImg(primaryImage))} aria-label={`View full-size ${hasItemImg ? "item" : "product"} image`}>
                    <p className="mb-1 text-xs text-muted-foreground">{hasItemImg ? "Item" : "Product"}</p>
                    <img
                      src={proxyImg(primaryImage)}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="h-20 max-w-[120px] rounded-md border bg-card object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                  </button>
                )}
                {hasLocationImg && (
                  <button type="button" className="shrink-0 text-left" onClick={() => setZoomedImg(item.locationImage || "")} aria-label="View full-size location image">
                    <p className="mb-1 text-xs text-muted-foreground">Location</p>
                    <img
                      src={item.locationImage}
                      alt={`Location of ${item.name}`}
                      className="h-20 max-w-[120px] rounded-md border bg-card object-contain"
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Delete confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                {entryToDelete ? "This batch entry" : "This item"} will move to Recently Deleted, where you can restore it for 24 hours.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { onDelete(entryToDelete || item.id); setEntryToDelete(null); }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Lend dialog */}
        <Dialog open={lendOpen} onOpenChange={setLendOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HandHelping className="h-4 w-4" aria-hidden="true" /> Lend "{item.name}"
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label htmlFor={`lend-name-${item.id}`} className="mb-1 block text-xs font-medium text-muted-foreground">Lent to</label>
                {houseMembers && houseMembers.length > 0 ? (
                  <div className="space-y-2">
                    <Select value={lendName} onValueChange={setLendName}>
                      <SelectTrigger className="h-9 text-sm" aria-label="Select house member">
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
                      id={`lend-name-${item.id}`}
                      placeholder="Or type a name..."
                      value={lendName}
                      onChange={(e) => setLendName(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                ) : (
                  <Input
                    id={`lend-name-${item.id}`}
                    placeholder="Enter name..."
                    value={lendName}
                    onChange={(e) => setLendName(e.target.value)}
                    className="h-9 text-sm"
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label htmlFor={`lend-notes-${item.id}`} className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
                <Input
                  id={`lend-notes-${item.id}`}
                  placeholder="e.g. Return by Friday"
                  value={lendNotes}
                  onChange={(e) => setLendNotes(e.target.value)}
                  className="h-9 text-sm"
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

        {/* Full-size image dialog */}
        <Dialog open={!!zoomedImg} onOpenChange={(o) => { if (!o) setZoomedImg(null); }}>
          <DialogContent className="max-w-[95vw] p-2 sm:max-w-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>{item.name} image</DialogTitle>
            </DialogHeader>
            {zoomedImg && (
              <img
                src={zoomedImg}
                alt={`Full size image of ${item.name}`}
                referrerPolicy="no-referrer"
                className="max-h-[80vh] w-full rounded-md object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Check, Loader2, Receipt, Trash2, Pencil, MapPin, RefreshCw, PlusSquare, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MAIN_CATEGORIES, LOCATIONS } from "@/hooks/use-inventory";
import type { InventoryItem } from "@/hooks/use-inventory";

interface ExtractedItem {
  name: string;
  category: string;
  subcategory?: string;
  quantity: number;
  quantityUnit: string;
  location: string;
  expirationDate?: string | null;
  unitPrice?: number;
  totalPrice?: number;
  selected: boolean;
  editing?: boolean;
  duplicateAction?: "update" | "replace" | "add";
}

const DEFAULT_EXPIRY_DAYS: Record<string, number> = {
  snack: 90,
  snacks: 90,
  dairy: 14,
  frozen: 180,
};

const normalizeValue = (value?: string | null) => (value ?? "").trim().toLowerCase();

const getDefaultExpiryDate = (category?: string | null, subcategory?: string | null) => {
  const key = normalizeValue(subcategory) || normalizeValue(category);
  const days = DEFAULT_EXPIRY_DAYS[key];
  if (!days) return null;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate.toISOString().split("T")[0];
};

const getDefaultLocationByCategory = (category?: string | null, subcategory?: string | null): string => {
  const cat = normalizeValue(category);
  const sub = normalizeValue(subcategory);
  if (cat === "produce" || sub === "fruits" || sub === "vegetables" || sub === "herbs") return "Refrigerator";
  if (sub === "dairy" || sub === "condiments") return "Refrigerator";
  if (sub === "frozen") return "Freezer";
  if (sub === "snacks") return "Pantry";
  return "";
};

const applyDefaultExpiry = <T extends { category?: string | null; subcategory?: string | null; expirationDate?: string | null }>(item: T): T => {
  if (item.expirationDate) return item;
  const defaultExpiryDate = getDefaultExpiryDate(item.category, item.subcategory);
  return defaultExpiryDate ? { ...item, expirationDate: defaultExpiryDate } : item;
};

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\bmixrure\b/g, "mixture")
    .replace(/\bmixure\b/g, "mixture")
    .replace(/\bjerra\b/g, "jeera")
    .replace(/\bkhahara\b/g, "khakhra")
    .replace(/\bbomnay\b/g, "bombay")
    .replace(/\bcilntro\b/g, "cilantro")
    .replace(/\bcilatro\b/g, "cilantro")
    .replace(/\bcinlatro\b/g, "cilantro")
    .replace(/\s+\d+(\.\d+)?\s*(ct|pcs|pc|pack|pk|oz|gm|g|kg|lb|lbs|ml|l|bunch|ea)?$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface ReceiptScannerProps {
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => Promise<void> | void;
  onUpdateItem?: (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => Promise<void> | void;
  onDeleteItem?: (id: string) => Promise<void> | void;
  existingItems?: InventoryItem[];
  customLocations: string[];
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  houseId?: string | null;
}

export function ReceiptScanner({ onAdd, onUpdateItem, onDeleteItem, existingItems = [], customLocations, externalOpen, onExternalOpenChange, houseId }: ReceiptScannerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onExternalOpenChange || setInternalOpen;
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [storeName, setStoreName] = useState<string>("");
  const [storeDetails, setStoreDetails] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const allLocations = [...LOCATIONS, ...customLocations];

  const findExisting = useCallback((name: string) => {
    const normalized = normalizeName(name);
    if (!normalized) return null;

    const exact = existingItems.find((item) => normalizeName(item.name) === normalized);
    if (exact) return exact;

    // Substring match for longer names
    const substringMatch = existingItems.find((item) => {
      const existingNormalized = normalizeName(item.name);
      const minLen = Math.min(existingNormalized.length, normalized.length);
      return minLen >= 4 && (existingNormalized.includes(normalized) || normalized.includes(existingNormalized));
    });
    if (substringMatch) return substringMatch;

    // Word-based fuzzy: if all words of the shorter name appear in the longer
    const words = normalized.split(" ").filter(w => w.length >= 3);
    if (words.length >= 1) {
      return existingItems.find((item) => {
        const existingNormalized = normalizeName(item.name);
        return words.every(w => existingNormalized.includes(w));
      }) || null;
    }

    return null;
  }, [existingItems]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large (max 10MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setExtractedItems([]);
      setStoreName("");
      setStoreDetails("");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleScan = async () => {
    if (!imagePreview) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: imagePreview, locations: allLocations },
      });

      if (error) {
        const errMsg = typeof error === "object" && error?.context?.status ? undefined : error?.message;
        const status = error?.context?.status;
        if (status === 402 || /credits exhausted/i.test(errMsg || "")) {
          toast.error("AI credits exhausted.");
          return;
        }
        if (status === 429 || /rate limit/i.test(errMsg || "")) {
          toast.error("Too many requests. Please wait.");
          return;
        }
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const items: ExtractedItem[] = (data.items || []).map((item: any) => {
        const existing = findExisting(item.name);
        return {
          ...applyDefaultExpiry(item),
          subcategory: item.subcategory || "",
          location: item.location || getDefaultLocationByCategory(item.category, item.subcategory),
          expirationDate: item.expirationDate || getDefaultExpiryDate(item.category, item.subcategory),
          unitPrice: item.unitPrice ?? null,
          totalPrice: item.totalPrice ?? null,
          selected: true,
          editing: false,
          duplicateAction: existing ? "replace" : "add",
        };
      });

      setExtractedItems(items);
      setStoreName(data.storeName || "");
      setStoreDetails(data.storeDetails || "");

      if (items.length === 0) {
        toast.info("No items found. Try a clearer photo.");
      } else {
        toast.success(`Found ${items.length} item${items.length > 1 ? "s" : ""}`);
      }
    } catch (err: any) {
      console.error("Receipt scan error:", err);
      toast.error("Failed to scan receipt.");
    } finally {
      setScanning(false);
    }
  };

  const toggleItem = (index: number) => {
    setExtractedItems((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  };

  const removeItem = (index: number) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAll = () => {
    const allSelected = extractedItems.every((i) => i.selected);
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const toggleEditing = (index: number) => {
    setExtractedItems((prev) => prev.map((item, i) => (i === index ? { ...item, editing: !item.editing } : item)));
  };

  const updateItemField = (index: number, field: keyof ExtractedItem, value: any) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const updatedItem = { ...item, [field]: value };

        if ((field === "category" || field === "subcategory") && !updatedItem.expirationDate) {
          updatedItem.expirationDate = getDefaultExpiryDate(updatedItem.category, updatedItem.subcategory);
        }

        if (field === "name") {
          updatedItem.duplicateAction = findExisting(String(value)) ? (updatedItem.duplicateAction === "replace" ? "replace" : "update") : "add";
        }

        return updatedItem;
      })
    );
  };

  const setDuplicateAction = (index: number, action: "update" | "replace" | "add") => {
    setExtractedItems((prev) => prev.map((item, i) => (i === index ? { ...item, duplicateAction: action } : item)));
  };

  const setBulkDuplicateAction = (action: "update" | "replace") => {
    let count = 0;
    setExtractedItems((prev) =>
      prev.map((item) => {
        // Use either fresh lookup or existing duplicateAction to identify duplicates
        const isDuplicate = findExisting(item.name) || (item.duplicateAction && item.duplicateAction !== "add");
        if (isDuplicate && item.selected) {
          count++;
          return { ...item, duplicateAction: action };
        }
        return item;
      })
    );
    toast.success(`${action === "update" ? "Update qty" : "Replace"} set for all duplicates`);
  };

  const handleAddSelected = async () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.error("No items selected");
      return;
    }

    let receiptUrl = "";
    if (imagePreview) {
      try {
        const res = await fetch(imagePreview);
        const blob = await res.blob();
        const ext = blob.type.includes("png") ? "png" : "jpg";
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const path = `${user.id}/receipts/${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("inventory-images").upload(path, blob, { contentType: blob.type });
          if (!uploadErr) {
            const { data: urlData } = await supabase.storage.from("inventory-images").createSignedUrl(path, 60 * 60 * 24 * 365);
            receiptUrl = urlData?.signedUrl || "";
          }
        }
      } catch (e) {
        console.error("Receipt upload failed:", e);
      }
    }

    const notesParts: string[] = [];
    if (storeName) notesParts.push(`Store: ${storeName}`);
    if (storeDetails) notesParts.push(storeDetails);
    if (receiptUrl) notesParts.push(`Receipt: ${receiptUrl}`);
    const notesText = notesParts.join("\n");

    let addedCount = 0;
    let updatedCount = 0;
    let replacedCount = 0;

    for (const item of selected) {
      const existing = findExisting(item.name);
      const duplicateAction = item.duplicateAction ?? (existing ? "replace" : "add");

      if (existing && duplicateAction === "update" && onUpdateItem) {
        const mergedNotes = existing.notes
          ? `${existing.notes}\n---\nNew batch (${new Date().toLocaleDateString()}): ${item.quantity} ${item.quantityUnit}${item.expirationDate ? `, exp ${item.expirationDate}` : ""}`
          : `Previous: ${existing.quantity} ${existing.quantityUnit}${existing.expirationDate ? `, exp ${existing.expirationDate}` : ""}\nNew batch: ${item.quantity} ${item.quantityUnit}${item.expirationDate ? `, exp ${item.expirationDate}` : ""}`;

        await onUpdateItem(existing.id, {
          quantity: existing.quantity + item.quantity,
          expirationDate: item.expirationDate || existing.expirationDate,
          category: item.category || existing.category,
          subcategory: item.subcategory || existing.subcategory,
          location: item.location || existing.location,
          notes: mergedNotes,
        });
        updatedCount++;
      } else if (existing && duplicateAction === "replace" && onDeleteItem) {
        await onDeleteItem(existing.id);
        await onAdd({
          name: item.name,
          category: item.category,
          subcategory: item.subcategory || "",
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          location: item.location,
          locationDetail: "",
          locationImage: "",
          productImage: "",
          itemImage: "",
          notes: notesText,
          barcode: "",
          expirationDate: item.expirationDate || null,
          houseId: houseId ?? null,
          unitPrice: item.unitPrice ?? null,
          totalPrice: item.totalPrice ?? null,
        });
        replacedCount++;
      } else {
        await onAdd({
          name: item.name,
          category: item.category,
          subcategory: item.subcategory || "",
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          location: item.location,
          locationDetail: "",
          locationImage: "",
          productImage: "",
          itemImage: "",
          notes: notesText,
          barcode: "",
          expirationDate: item.expirationDate || null,
          houseId: houseId ?? null,
          unitPrice: item.unitPrice ?? null,
          totalPrice: item.totalPrice ?? null,
        });
        addedCount++;
      }
    }

    const parts: string[] = [];
    if (addedCount) parts.push(`${addedCount} added`);
    if (updatedCount) parts.push(`${updatedCount} updated`);
    if (replacedCount) parts.push(`${replacedCount} replaced`);
    toast.success(parts.join(", "));
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setImagePreview(null);
    setExtractedItems([]);
    setStoreName("");
    setStoreDetails("");
  };

  const selectedCount = extractedItems.filter((i) => i.selected).length;
  const duplicateCount = extractedItems.filter((i) => i.selected && (findExisting(i.name) || (i.duplicateAction && i.duplicateAction !== "add"))).length;

  const getCategoryBadge = (category: string, subcategory?: string) => {
    const cat = MAIN_CATEGORIES.find((c) => c.value === category);
    const label = subcategory
      ? `${cat?.label || category} › ${cat?.subcategories.find((s) => s.value === subcategory)?.label || subcategory}`
      : (cat?.label || category);
    return (
      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
        {label}
      </Badge>
    );
  };

  return (
    <>
      {externalOpen === undefined && (
        <Button size="sm" variant="outline" className="gap-1 h-8 px-2 text-xs" onClick={() => setOpen(true)}>
          <Receipt className="h-3.5 w-3.5" /> Scan
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Receipt Scanner
            </DialogTitle>
            <DialogDescription>
              Upload a receipt or order screenshot to extract items
            </DialogDescription>
          </DialogHeader>

          {!imagePreview && (
            <div className="space-y-3">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Drop an image here or click to browse</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Upload Photo
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-4 w-4" /> Take Photo
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ""; }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ""; }} />
            </div>
          )}

          {imagePreview && extractedItems.length === 0 && (
            <div className="space-y-3">
              <div className="relative">
                <img src={imagePreview} alt="Receipt" className="w-full max-h-48 object-contain rounded-lg border" />
                <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7 bg-background/80" onClick={() => { setImagePreview(null); setExtractedItems([]); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full gap-2" onClick={handleScan} disabled={scanning}>
                {scanning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Scanning receipt...</>
                ) : (
                  <><Receipt className="h-4 w-4" /> Extract Items</>
                )}
              </Button>
            </div>
          )}

          {extractedItems.length > 0 && (
            <div className="flex flex-col flex-1 min-h-0 space-y-2 overflow-hidden">
              {storeName && (
                <p className="text-sm text-muted-foreground">
                  Store: <span className="font-medium text-foreground">{storeName}</span>
                </p>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAll}>
                  {extractedItems.every((i) => i.selected) ? "Deselect All" : "Select All"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedCount} of {extractedItems.length} selected
                </span>
              </div>

              {duplicateCount > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-muted-foreground shrink-0">{duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""}:</span>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={() => setBulkDuplicateAction("update")}>
                    <PlusSquare className="h-3 w-3" /> Update All Qty
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={() => setBulkDuplicateAction("replace")}>
                    <RefreshCw className="h-3 w-3" /> Replace All
                  </Button>
                </div>
              )}

              <div className="flex-1 min-h-0 max-h-[calc(90vh-16rem)] overflow-y-scroll overscroll-contain pr-2 [scrollbar-color:hsl(var(--border))_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="space-y-1">
                  {extractedItems.map((item, i) => {
                    const existing = findExisting(item.name);
                    const duplicateAction = item.duplicateAction ?? (existing ? "replace" : "add");

                    return (
                      <div key={i} className={`p-2 rounded-md border text-sm transition-colors ${item.selected ? "bg-primary/5 border-primary/20" : "opacity-50"}`}>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={item.selected} onCheckedChange={() => toggleItem(i)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium truncate">{item.name}</span>
                              {getCategoryBadge(item.category, item.subcategory)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {item.location && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{item.location}</span>}
                              {item.totalPrice != null && <span>· ${item.totalPrice.toFixed(2)}</span>}
                              {item.expirationDate && <span>· exp {item.expirationDate}</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <label className="text-[10px] text-muted-foreground">Qty:</label>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateItemField(i, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                className="h-6 w-16 text-xs px-1.5"
                              />
                              <span className="text-[10px] text-muted-foreground">{item.quantityUnit}</span>
                            </div>

                            {existing && item.selected && (
                              <div className="mt-1.5 p-1.5 rounded bg-muted/50 border border-dashed">
                                <p className="text-[10px] text-muted-foreground mb-1">
                                  ⚠ Already in stock: {existing.quantity} {existing.quantityUnit}
                                  {existing.expirationDate ? ` · exp ${existing.expirationDate}` : ""}
                                </p>
                                <div className="flex gap-1 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant={duplicateAction === "update" ? "default" : "outline"}
                                    className="h-5 text-[10px] gap-0.5 px-1.5"
                                    onClick={() => setDuplicateAction(i, "update")}
                                  >
                                    <PlusSquare className="h-2.5 w-2.5" />
                                    Update Qty ({existing.quantity + item.quantity})
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={duplicateAction === "replace" ? "default" : "outline"}
                                    className="h-5 text-[10px] gap-0.5 px-1.5"
                                    onClick={() => setDuplicateAction(i, "replace")}
                                  >
                                    <RefreshCw className="h-2.5 w-2.5" />
                                    Replace
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={duplicateAction === "add" ? "default" : "outline"}
                                    className="h-5 text-[10px] gap-0.5 px-1.5"
                                    onClick={() => setDuplicateAction(i, "add")}
                                  >
                                    <PlusCircle className="h-2.5 w-2.5" />
                                    Add New
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => toggleEditing(i)} title="Edit">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeItem(i)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {item.editing && (
                          <div className="mt-2 pt-2 border-t space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground">Category</label>
                                <Select value={item.category} onValueChange={(v) => { updateItemField(i, "category", v); updateItemField(i, "subcategory", ""); }}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {MAIN_CATEGORIES.map((c) => (
                                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.icon} {c.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Subcategory</label>
                                <Select value={item.subcategory || "none"} onValueChange={(v) => updateItemField(i, "subcategory", v === "none" ? "" : v)}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-xs">— General —</SelectItem>
                                    {(MAIN_CATEGORIES.find((c) => c.value === item.category)?.subcategories || []).map((s) => (
                                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Location</label>
                              <Select value={item.location || "none"} onValueChange={(v) => updateItemField(i, "location", v === "none" ? "" : v)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" className="text-xs">— None —</SelectItem>
                                  {allLocations.map((l) => (
                                    <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Expiration Date</label>
                              <Input
                                type="date"
                                className="h-7 text-xs"
                                value={item.expirationDate || ""}
                                onChange={(e) => updateItemField(i, "expirationDate", e.target.value || null)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setImagePreview(null); setExtractedItems([]); setStoreName(""); setStoreDetails(""); }}>
                  Scan Another
                </Button>
                <Button className="flex-1 gap-1" onClick={handleAddSelected} disabled={selectedCount === 0}>
                  <Check className="h-4 w-4" />
                  Add {selectedCount} Item{selectedCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

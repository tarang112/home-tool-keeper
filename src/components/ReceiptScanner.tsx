import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Check, Loader2, Receipt, Trash2, Pencil, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  expirationDate?: string;
  unitPrice?: number;
  totalPrice?: number;
  selected: boolean;
  editing?: boolean;
}

interface ReceiptScannerProps {
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void;
  customLocations: string[];
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function ReceiptScanner({ onAdd, customLocations, externalOpen, onExternalOpenChange }: ReceiptScannerProps) {
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
        const errMsg = typeof error === "object" && error?.context?.status
          ? undefined : error?.message;
        const status = error?.context?.status;
        if (status === 402 || /credits exhausted/i.test(errMsg || "")) {
          toast.error("AI credits exhausted. Please add funds in Settings → Workspace → Usage.");
          return;
        }
        if (status === 429 || /rate limit/i.test(errMsg || "")) {
          toast.error("Too many requests. Please wait a moment and try again.");
          return;
        }
        throw error;
      }
      if (data?.error) {
        if (/credits exhausted/i.test(data.error)) {
          toast.error("AI credits exhausted. Please add funds in Settings → Workspace → Usage.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      const items: ExtractedItem[] = (data.items || []).map((item: any) => ({
        ...item,
        subcategory: item.subcategory || "",
        location: item.location || "",
        expirationDate: item.expirationDate || null,
        unitPrice: item.unitPrice ?? null,
        totalPrice: item.totalPrice ?? null,
        selected: true,
        editing: false,
      }));

      setExtractedItems(items);
      setStoreName(data.storeName || "");
      setStoreDetails(data.storeDetails || "");

      if (items.length === 0) {
        toast.info("No items found in this image. Try a clearer photo.");
      } else {
        toast.success(`Found ${items.length} item${items.length > 1 ? "s" : ""}`);
      }
    } catch (err: any) {
      console.error("Receipt scan error:", err);
      toast.error("Failed to scan receipt. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const toggleItem = (index: number) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const removeItem = (index: number) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAll = () => {
    const allSelected = extractedItems.every((i) => i.selected);
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const toggleEditing = (index: number) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, editing: !item.editing } : item))
    );
  };

  const updateItemField = (index: number, field: keyof ExtractedItem, value: any) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const buildNotesText = () => {
    const parts: string[] = [];
    if (storeName) parts.push(`Store: ${storeName}`);
    if (storeDetails) parts.push(storeDetails);
    return parts.join("\n");
  };

  const handleAddSelected = () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.error("No items selected");
      return;
    }

    const notesText = buildNotesText();

    for (const item of selected) {
      onAdd({
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
        houseId: null,
        unitPrice: item.unitPrice ?? null,
        totalPrice: item.totalPrice ?? null,
      });
    }

    toast.success(`Added ${selected.length} item${selected.length > 1 ? "s" : ""} to inventory`);
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

  const getCategoryBadge = (category: string, subcategory?: string) => {
    const cat = MAIN_CATEGORIES.find(c => c.value === category);
    const label = subcategory
      ? `${cat?.label || category} › ${cat?.subcategories.find(s => s.value === subcategory)?.label || subcategory}`
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
        <Button
          size="sm"
          variant="outline"
          className="gap-1 h-8 px-2 text-xs"
          onClick={() => setOpen(true)}
        >
          <Receipt className="h-3.5 w-3.5" /> Scan
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Receipt Scanner
            </DialogTitle>
            <DialogDescription>
              Upload a receipt or order screenshot to extract items
            </DialogDescription>
          </DialogHeader>

          {/* Upload area */}
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
                <p className="text-sm text-muted-foreground">
                  Drop an image here or click to browse
                </p>
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

          {/* Image preview + scan */}
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

          {/* Extracted items list */}
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

              <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: "50vh" }}>
                <div className="space-y-1 pr-2">
                  {extractedItems.map((item, i) => (
                    <div key={i} className={`p-2 rounded-md border text-sm transition-colors ${item.selected ? "bg-primary/5 border-primary/20" : "opacity-50"}`}>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={item.selected} onCheckedChange={() => toggleItem(i)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium truncate">{item.name}</span>
                            {getCategoryBadge(item.category, item.subcategory)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{item.quantity} {item.quantityUnit}</span>
                            {item.location && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{item.location}</span>}
                            {item.totalPrice != null && <span>· ${item.totalPrice.toFixed(2)}</span>}
                            {item.expirationDate && <span>· exp {item.expirationDate}</span>}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => toggleEditing(i)} title="Edit">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Inline edit */}
                      {item.editing && (
                        <div className="mt-2 pt-2 border-t space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground">Category</label>
                              <Select value={item.category} onValueChange={(v) => { updateItemField(i, "category", v); updateItemField(i, "subcategory", ""); }}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {MAIN_CATEGORIES.map(c => (
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
                                  {(MAIN_CATEGORIES.find(c => c.value === item.category)?.subcategories || []).map(s => (
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
                                {allLocations.map(l => (
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
                  ))}
                </div>
              </ScrollArea>

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

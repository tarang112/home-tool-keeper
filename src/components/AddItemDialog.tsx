import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "@/components/ui/drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Camera, X, ScanBarcode, Loader2, Link } from "lucide-react";
import { MAIN_CATEGORIES, LOCATIONS, EXPIRABLE_CATEGORIES, WARRANTY_CATEGORIES, QUANTITY_UNITS, type InventoryItem, type ItemCategory, type MainCategory } from "@/hooks/use-inventory";
import { format } from "date-fns";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeGroupedItemName } from "@/lib/item-matching";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CustomCategory, CustomLocation } from "@/hooks/use-custom-options";
import { uploadItemImage } from "@/lib/image-upload";


interface BatchEntry {
  id?: string; // existing entry ID (for edit mode)
  quantity: string;
  quantityUnit: string;
  expirationDate: Date | undefined;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void;
  editItem?: InventoryItem | null;
  onUpdate?: (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => void;
  onDelete?: (id: string) => void;
  customCategories?: CustomCategory[];
  customLocations?: CustomLocation[];
  onEnsureCategory?: (name: string, icon?: string) => Promise<void>;
  onEnsureLocation?: (name: string) => Promise<void>;
  businessCategories?: MainCategory[];
  initialBarcodeScan?: boolean;
  /** All inventory items - used to find sibling batch entries when editing */
  allItems?: InventoryItem[];
}

export function AddItemDialog({
  open, onOpenChange, onAdd, editItem, onUpdate, onDelete,
  customCategories = [], customLocations = [],
  onEnsureCategory, onEnsureLocation, businessCategories,
  initialBarcodeScan, allItems = [],
}: AddItemDialogProps) {
  const isMobile = useIsMobile();
  const activeCategoryList = businessCategories || MAIN_CATEGORIES;
  const defaultCategory = (activeCategoryList[0]?.value || "hardware-tools") as ItemCategory;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>(defaultCategory);
  const [subcategory, setSubcategory] = useState("");
  const [useCustomSubcategory, setUseCustomSubcategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [locationMode, setLocationMode] = useState("Garage");
  const [customLocation, setCustomLocation] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [locationImage, setLocationImage] = useState("");
  const [productImage, setProductImage] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [notes, setNotes] = useState("");
  const [barcode, setBarcode] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("pcs");
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
  const [productUrl, setProductUrl] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationImageUploading, setLocationImageUploading] = useState(false);
  const [itemImageUploading, setItemImageUploading] = useState(false);
  const imageUploading = locationImageUploading || itemImageUploading;


  // Auto-open barcode scanner when initialBarcodeScan is set
  useEffect(() => {
    if (open && initialBarcodeScan && !editItem) {
      setScannerOpen(true);
    }
  }, [open, initialBarcodeScan, editItem]);
  const [lookingUp, setLookingUp] = useState(false);
  const [urlLookingUp, setUrlLookingUp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  const allLocations = [...LOCATIONS, ...customLocations.map(l => l.name)];

  const selectedMain = activeCategoryList.find(c => c.value === category);
  const subcategories = selectedMain?.subcategories || [];

  const namePlaceholder = (() => {
    if (!businessCategories) return "e.g. Hammer, Nails, Milk...";
    const firstCat = businessCategories[0]?.value || "";
    if (firstCat.includes("rooms") || firstCat.includes("linens")) return "e.g. Bath Towels, Bed Sheets, Pillows...";
    if (firstCat.includes("food") || firstCat.includes("ingredients")) return "e.g. Olive Oil, Flour, Chicken Breast...";
    if (firstCat.includes("merchandise")) return "e.g. T-Shirt, Phone Case, Candle...";
    if (firstCat.includes("office-supplies")) return "e.g. Printer Paper, Stapler, Toner...";
    if (firstCat.includes("hair")) return "e.g. Shampoo, Hair Dye, Styling Gel...";
    if (firstCat.includes("medical")) return "e.g. Latex Gloves, Gauze, Thermometer...";
    return "e.g. Item name...";
  })();

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setShowUrlInput(false);
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setSubcategory(editItem.subcategory || "");
      setUseCustomSubcategory(false);
      setCustomCategory(editItem.customCategory || "");
      setQuantity(String(editItem.quantity));
      setQuantityUnit(editItem.quantityUnit || "pcs");
      const loc = editItem.location;
      if (allLocations.includes(loc)) {
        setLocationMode(loc);
        setCustomLocation("");
      } else {
        setLocationMode("custom");
        setCustomLocation(loc);
      }
      setLocationDetail(editItem.locationDetail ?? "");
      setLocationImage(editItem.locationImage ?? "");
      setProductImage(editItem.productImage ?? "");
      setItemImage(editItem.itemImage ?? "");
      setNotes(editItem.notes ?? "");
      setBarcode(editItem.barcode ?? "");
      setExpirationDate(editItem.expirationDate ? new Date(editItem.expirationDate) : undefined);
      setProductUrl("");
      // Expand "More details" when editing an item that already has any of those values
      setMoreOpen(!!(
        editItem.expirationDate || editItem.locationDetail || editItem.locationImage ||
        editItem.itemImage || editItem.notes
      ));
      // Find sibling batch entries (same name, category, location)
      const siblings = allItems.filter(
        (i) => normalizeGroupedItemName(i.name) === normalizeGroupedItemName(editItem.name) && i.category === editItem.category && i.location === editItem.location && i.id !== editItem.id
      );
      if (siblings.length > 0) {
        setBatchEntries([
          { id: editItem.id, quantity: String(editItem.quantity), quantityUnit: editItem.quantityUnit || "pcs", expirationDate: editItem.expirationDate ? new Date(editItem.expirationDate) : undefined },
          ...siblings.map((s) => ({ id: s.id, quantity: String(s.quantity), quantityUnit: s.quantityUnit || "pcs", expirationDate: s.expirationDate ? new Date(s.expirationDate) : undefined })),
        ]);
      } else {
        setBatchEntries([]);
      }
    } else {
      setName("");
      setCategory(defaultCategory);
      setSubcategory("");
      setUseCustomSubcategory(false);
      setCustomCategory("");
      setQuantity("1");
      setQuantityUnit("pcs");
      setLocationMode("Garage");
      setCustomLocation("");
      setLocationDetail("");
      setLocationImage("");
      setProductImage("");
      setItemImage("");
      setNotes("");
      setBarcode("");
      setExpirationDate(undefined);
      setBatchEntries([]);
      setProductUrl("");
      setMoreOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem, open]);

  const LEGACY_CATEGORY_MAP: Record<string, string> = {
    tools: "hardware-tools",
    materials: "hardware-tools",
    hardware: "hardware-tools",
    electrical: "electrical",
    plumbing: "plumbing",
    paint: "paint",
  };

  const getDefaultExpiryForSubcategory = (value: string) => {
    const normalized = value.trim().toLowerCase();
    const nextDate = new Date();

    if (normalized === "snacks") {
      nextDate.setMonth(nextDate.getMonth() + 3);
      return nextDate;
    }

    if (normalized === "frozen") {
      nextDate.setMonth(nextDate.getMonth() + 6);
      return nextDate;
    }

    if (normalized === "dairy") {
      nextDate.setDate(nextDate.getDate() + 14);
      return nextDate;
    }

    return undefined;
  };

  const formatDateInputValue = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : "");

  const parseDateInputValue = (value: string) => {
    if (!value) return undefined;
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const applyProduct = (p: any) => {
    if (p.name) setName(p.name);
    if (p.category) {
      const mapped = LEGACY_CATEGORY_MAP[p.category] || p.category;
      const mainMatch = activeCategoryList.find(c => c.value === mapped);
      if (mainMatch) {
        setCategory(mapped);
        if (p.subcategory && mainMatch.subcategories.some(s => s.value === p.subcategory)) {
          setSubcategory(p.subcategory);
          setUseCustomSubcategory(false);
          const defaultExpiry = getDefaultExpiryForSubcategory(p.subcategory);
          if (defaultExpiry && !expirationDate) {
            setExpirationDate(defaultExpiry);
          }
        }
      }
    }
    if (p.quantity && Number(p.quantity) > 0) setQuantity(String(p.quantity));
    if (p.notes) setNotes(p.notes);
    if (p.image_url) {
      setProductImage(p.image_url);
      if (!itemImage) setItemImage(p.image_url);
    }
  };

  const handleBarcodeLookup = async (code: string) => {
    setBarcode(code);
    setLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("barcode-lookup", {
        body: { barcode: code },
      });
      if (error) throw error;
      if (data?.success && data.product) {
        applyProduct(data.product);
        toast.success(`Found: ${data.product.name || "Product details loaded"}`);
      } else {
        toast.info("Product not found. You can fill details manually.");
      }
    } catch {
      toast.error("Barcode lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  const handleUrlLookup = async () => {
    if (!productUrl.trim()) return;
    setUrlLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("barcode-lookup", {
        body: { url: productUrl.trim() },
      });
      if (error) throw error;
      if (data?.success && data.product) {
        applyProduct(data.product);
        toast.success(`Found: ${data.product.name || "Product details loaded"}`);
      } else {
        toast.info("Could not extract product details from URL.");
      }
    } catch {
      toast.error("URL lookup failed");
    } finally {
      setUrlLookingUp(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLocationImageUploading(true);
    try {
      setLocationImage(await uploadItemImage(file, "locations"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setLocationImageUploading(false);
    }
  };

  const handleItemImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setItemImageUploading(true);
    try {
      setItemImage(await uploadItemImage(file, "items"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setItemImageUploading(false);
    }
  };


  const handleCategoryChange = (val: string) => {
    if (val.startsWith("customsaved:")) {
      setCategory("custom");
      setCustomCategory(val.slice(12));
      setSubcategory("");
      setUseCustomSubcategory(false);
    } else if (val === "custom") {
      setCategory("custom");
      setCustomCategory("");
      setSubcategory("");
      setUseCustomSubcategory(false);
    } else {
      setCategory(val);
      setCustomCategory("");
      setSubcategory("");
      setUseCustomSubcategory(false);
      // Auto-set location for top-level categories
      if (val === "produce" || val === "herbs") setLocationMode("Refrigerator");
    }
  };

  const handleSubcategoryChange = (val: string) => {
    setSubcategory(val);
    const defaultExpiry = getDefaultExpiryForSubcategory(val);
    if (defaultExpiry && !expirationDate) {
      setExpirationDate(defaultExpiry);
    }
    // Auto-set location for frozen/dairy/produce subcategories
    if (val === "frozen") setLocationMode("Freezer");
    if (val === "dairy" || val === "condiments") setLocationMode("Refrigerator");
    if (val === "snacks") setLocationMode("Pantry");
    if (val === "fruits" || val === "vegetables" || val === "herbs") setLocationMode("Refrigerator");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);

    try {
      const finalLocation = locationMode === "custom" ? customLocation.trim() : locationMode;

      if (category === "custom" && customCategory.trim() && onEnsureCategory) {
        await onEnsureCategory(customCategory.trim());
      }
      if (locationMode === "custom" && customLocation.trim() && onEnsureLocation) {
        await onEnsureLocation(customLocation.trim());
      }

      const baseData = {
        name: name.trim(),
        category,
        subcategory: subcategory || "",
        customCategory: category === "custom" ? customCategory.trim() : undefined,
        quantityUnit,
        location: finalLocation,
        locationDetail: locationDetail.trim(),
        locationImage,
        productImage,
        itemImage,
        notes: notes.trim(),
        barcode: barcode.trim(),
        houseId: editItem?.houseId || null,
        unitPrice: editItem?.unitPrice ?? null,
        totalPrice: editItem?.totalPrice ?? null,
        lentTo: editItem?.lentTo ?? null,
        lentAt: editItem?.lentAt ?? null,
        lentNotes: editItem?.lentNotes ?? null,
      };

      if (batchEntries.length > 0) {
        // Handle batch entries
        for (const entry of batchEntries) {
          const entryData = {
            ...baseData,
            quantity: Math.max(0, parseFloat(entry.quantity) || 0),
            quantityUnit: entry.quantityUnit,
            expirationDate: entry.expirationDate ? format(entry.expirationDate, 'yyyy-MM-dd') : null,
          };
          if (entry.id && onUpdate) {
            onUpdate(entry.id, entryData);
          } else {
            onAdd(entryData);
          }
        }
      } else {
        const data = {
          ...baseData,
          quantity: Math.max(0, parseFloat(quantity) || 0),
          expirationDate: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : null,
        };
        if (editItem && onUpdate) {
          onUpdate(editItem.id, data);
        } else {
          onAdd(data);
        }
      }

      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const title = editItem ? "Edit Item" : "Add New Item";
  const description = editItem ? "Update the details below." : "Add a tool or material to your inventory.";

  const quickFill = (
    <div className="space-y-2 rounded-lg border border-dashed p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Optional shortcut — fill the form automatically</p>
        {lookingUp && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="h-9 flex-1 gap-1.5" onClick={() => setScannerOpen(true)}>
          <ScanBarcode className="h-4 w-4" aria-hidden="true" /> Scan barcode
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9 flex-1 gap-1.5" onClick={() => setShowUrlInput((v) => !v)} aria-expanded={showUrlInput}>
          <Link className="h-4 w-4" aria-hidden="true" /> Paste link
        </Button>
      </div>
      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="Paste product page link..."
            className="h-9 flex-1"
            aria-label="Product URL"
          />
          <Button type="button" variant="secondary" size="sm" className="h-9 gap-1" onClick={handleUrlLookup} disabled={!productUrl.trim() || urlLookingUp}>
            {urlLookingUp ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link className="h-4 w-4" aria-hidden="true" />}
            Fetch
          </Button>
        </div>
      )}
      {barcode && (
        <div className="flex items-center gap-2">
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="h-9 flex-1 font-mono text-xs" aria-label="Barcode" />
          <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => handleBarcodeLookup(barcode)} disabled={lookingUp}>Look up</Button>
        </div>
      )}
    </div>
  );

  const dateFields = (() => {
    const isWarranty = WARRANTY_CATEGORIES.includes(category);
    const isExpirable = EXPIRABLE_CATEGORIES.includes(category);
    const dateLabel = isWarranty
      ? "Warranty Expiry"
      : isExpirable
        ? "Expiration Date"
        : "Warranty / Expiry Date (optional)";
    return (
      <div className="space-y-2">
        <Label htmlFor="expiry">{dateLabel}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="expiry"
            type="date"
            value={formatDateInputValue(expirationDate)}
            onChange={(e) => setExpirationDate(parseDateInputValue(e.target.value))}
            className="flex-1"
          />
          {expirationDate && (
            <Button type="button" variant="ghost" size="icon" onClick={() => setExpirationDate(undefined)} aria-label="Clear date">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        {isWarranty && (
          <p className="text-xs text-muted-foreground">
            Defaults to 1 year. Adjust for extended warranties.
          </p>
        )}
      </div>
    );
  })();

  const quantitySection = batchEntries.length > 0 ? (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Entries ({batchEntries.length})</Label>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setBatchEntries([...batchEntries, { quantity: "1", quantityUnit, expirationDate: undefined }])}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add Entry
        </Button>
      </div>
      {batchEntries.map((entry, idx) => (
        <div key={idx} className="relative space-y-2 rounded-md border p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Qty</Label>
              <Input type="number" min="0" step="any" value={entry.quantity} onChange={(e) => {
                const updated = [...batchEntries];
                updated[idx] = { ...updated[idx], quantity: e.target.value };
                setBatchEntries(updated);
              }} className="h-9" aria-label={`Quantity for entry ${idx + 1}`} />
            </div>
            <div className="w-24">
              <Label className="text-xs text-muted-foreground">Unit</Label>
              <Select value={entry.quantityUnit} onValueChange={(v) => {
                const updated = [...batchEntries];
                updated[idx] = { ...updated[idx], quantityUnit: v };
                setBatchEntries(updated);
              }}>
                <SelectTrigger className="h-9" aria-label={`Unit for entry ${idx + 1}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUANTITY_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {batchEntries.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="mt-4 h-9 w-9 shrink-0" aria-label={`Remove entry ${idx + 1}`} onClick={() => {
                if (entry.id && onDelete) onDelete(entry.id);
                setBatchEntries(batchEntries.filter((_, i) => i !== idx));
              }}>
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
              </Button>
            )}
          </div>
          {EXPIRABLE_CATEGORIES.includes(category) && (
            <div>
              <Label className="text-xs text-muted-foreground">
                {WARRANTY_CATEGORIES.includes(category) ? "Warranty Expiry" : "Expiration Date"}
              </Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={formatDateInputValue(entry.expirationDate)}
                  onChange={(e) => {
                    const updated = [...batchEntries];
                    updated[idx] = {
                      ...updated[idx],
                      expirationDate: parseDateInputValue(e.target.value),
                    };
                    setBatchEntries(updated);
                  }}
                  className="h-9 flex-1"
                  aria-label={`Expiry for entry ${idx + 1}`}
                />
                {entry.expirationDate && (
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Clear date" onClick={() => {
                    const updated = [...batchEntries];
                    updated[idx] = { ...updated[idx], expirationDate: undefined };
                    setBatchEntries(updated);
                  }}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="quantity">Quantity</Label>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={() => setBatchEntries([
          { quantity, quantityUnit, expirationDate },
          { quantity: "1", quantityUnit, expirationDate: undefined },
        ])}>
          <Plus className="h-3 w-3" aria-hidden="true" /> Add batch entry
        </Button>
      </div>
      <div className="flex gap-2">
        <Input id="quantity" type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="flex-1" />
        <Select value={quantityUnit} onValueChange={setQuantityUnit}>
          <SelectTrigger className="w-28" aria-label="Quantity unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUANTITY_UNITS.map((u) => (
              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const formFields = (
    <>
      {quickFill}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={namePlaceholder} required />
      </div>

      {/* Quantity + unit (batch aware) */}
      {quantitySection}

      {/* Location */}
      <div className="space-y-2">
        <Label>Location</Label>
        <Select value={locationMode} onValueChange={setLocationMode}>
          <SelectTrigger aria-label="Location"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
            {customLocations.map((l) => (
              <SelectItem key={`cloc-${l.name}`} value={l.name}>{l.name}</SelectItem>
            ))}
            <SelectItem value="custom">Custom Location</SelectItem>
          </SelectContent>
        </Select>
        {locationMode === "custom" && (
          <Input value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} placeholder="Enter custom location name..." aria-label="Custom location name" />
        )}
      </div>

      {/* Category & Subcategory */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={category === "custom" ? (customCategory ? `customsaved:${customCategory}` : "custom") : category}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent>
            {activeCategoryList.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
            ))}
            {customCategories.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground">Your Custom Categories</SelectLabel>
                {customCategories.map((c) => (
                  <SelectItem key={`custom-${c.name}`} value={`customsaved:${c.name}`}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectGroup>
            )}
            <SelectItem value="custom">✏️ New Custom</SelectItem>
          </SelectContent>
        </Select>
        {category === "custom" && (
          <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Enter custom category name..." className="mt-2" aria-label="Custom category name" />
        )}
      </div>

      {(subcategories.length > 0 || category === "custom") && (
        <div className="space-y-2">
          <Label>Subcategory</Label>
          {category === "custom" ? (
            <Input
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="Enter custom subcategory (optional)..."
              aria-label="Subcategory"
            />
          ) : (
            <>
              <Select
                value={
                  useCustomSubcategory || (subcategory && !subcategories.some((s) => s.value === subcategory))
                    ? "__custom__"
                    : (subcategory || "none")
                }
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setUseCustomSubcategory(true);
                    return;
                  }
                  setUseCustomSubcategory(false);
                  handleSubcategoryChange(v === "none" ? "" : v);
                }}
              >
                <SelectTrigger aria-label="Subcategory"><SelectValue placeholder="Select subcategory..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— General —</SelectItem>
                  {subcategories.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">✏️ Other (custom)…</SelectItem>
                </SelectContent>
              </Select>
              {(useCustomSubcategory || (subcategory && !subcategories.some((s) => s.value === subcategory))) && (
                <Input
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Enter custom subcategory..."
                  className="mt-2"
                  aria-label="Custom subcategory"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* More details */}
      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="w-full justify-between px-2" aria-expanded={moreOpen}>
            More details
            <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {batchEntries.length === 0 && dateFields}

          <div className="space-y-2">
            <Label htmlFor="locationDetail">Location Detail</Label>
            <Input id="locationDetail" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="e.g. Top shelf, left drawer..." />
          </div>

          <div className="space-y-2">
            <Label>Location Photo</Label>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleImageChange} aria-hidden="true" tabIndex={-1} />
            {locationImage ? (
              <div className="relative overflow-hidden rounded-lg border">
                <img src={locationImage} alt="Location" className="h-32 w-full object-cover" />
                <Button type="button" variant="destructive" size="icon" className="absolute right-2 top-2 h-9 w-9" onClick={() => setLocationImage("")} aria-label="Remove location photo">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4" aria-hidden="true" /> Take or Choose Photo
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Item Photo</Label>
            <input ref={itemFileInputRef} type="file" className="hidden" onChange={handleItemImageChange} aria-hidden="true" tabIndex={-1} />
            {itemImage ? (
              <div className="relative overflow-hidden rounded-lg border">
                <img src={itemImage} alt="Item" className="h-32 w-full object-cover" />
                <Button type="button" variant="destructive" size="icon" className="absolute right-2 top-2 h-9 w-9" onClick={() => setItemImage("")} aria-label="Remove item photo">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => itemFileInputRef.current?.click()}>
                <Camera className="h-4 w-4" aria-hidden="true" /> Take or Upload Item Photo
              </Button>
            )}
          </div>

          {productImage && (
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="relative overflow-hidden rounded-lg border">
                <img src={productImage} alt="Product" className="h-32 w-full bg-card object-contain" referrerPolicy="no-referrer" />
                <Button type="button" variant="destructive" size="icon" className="absolute right-2 top-2 h-9 w-9" onClick={() => setProductImage("")} aria-label="Remove product image">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );

  const actions = (
    <>
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button type="submit" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : editItem ? "Save Changes" : "Add Item"}
      </Button>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[92dvh]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="font-heading">{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                {formFields}
              </div>
              <DrawerFooter className="sticky bottom-0 flex-row justify-end gap-2 border-t bg-background">
                {actions}
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formFields}
              <DialogFooter>{actions}</DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScanned={handleBarcodeLookup} />
    </>
  );
}

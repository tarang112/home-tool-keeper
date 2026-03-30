import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Camera, X, ScanBarcode, Loader2, Link, CalendarIcon } from "lucide-react";
import { MAIN_CATEGORIES, LOCATIONS, EXPIRABLE_CATEGORIES, type InventoryItem, type ItemCategory } from "@/hooks/use-inventory";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CustomCategory, CustomLocation } from "@/hooks/use-custom-options";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void;
  editItem?: InventoryItem | null;
  onUpdate?: (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => void;
  customCategories?: CustomCategory[];
  customLocations?: CustomLocation[];
  onEnsureCategory?: (name: string, icon?: string) => Promise<void>;
  onEnsureLocation?: (name: string) => Promise<void>;
}

export function AddItemDialog({
  open, onOpenChange, onAdd, editItem, onUpdate,
  customCategories = [], customLocations = [],
  onEnsureCategory, onEnsureLocation,
}: AddItemDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>("hardware-tools");
  const [subcategory, setSubcategory] = useState("");
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
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const [productUrl, setProductUrl] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [urlLookingUp, setUrlLookingUp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  const allLocations = [...LOCATIONS, ...customLocations.map(l => l.name)];

  const selectedMain = MAIN_CATEGORIES.find(c => c.value === category);
  const subcategories = selectedMain?.subcategories || [];

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setSubcategory(editItem.subcategory || "");
      setCustomCategory(editItem.customCategory || "");
      setQuantity(String(editItem.quantity));
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
    } else {
      setName("");
      setCategory("hardware-tools");
      setSubcategory("");
      setCustomCategory("");
      setQuantity("1");
      setLocationMode("Garage");
      setCustomLocation("");
      setLocationDetail("");
      setLocationImage("");
      setProductImage("");
      setItemImage("");
      setNotes("");
      setBarcode("");
      setExpirationDate(undefined);
      setProductUrl("");
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

  const applyProduct = (p: any) => {
    if (p.name) setName(p.name);
    if (p.category) {
      const mapped = LEGACY_CATEGORY_MAP[p.category] || p.category;
      const mainMatch = MAIN_CATEGORIES.find(c => c.value === mapped);
      if (mainMatch) {
        setCategory(mapped);
        if (p.subcategory && mainMatch.subcategories.some(s => s.value === p.subcategory)) {
          setSubcategory(p.subcategory);
        }
      }
    }
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLocationImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setItemImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCategoryChange = (val: string) => {
    if (val.startsWith("customsaved:")) {
      setCategory("custom");
      setCustomCategory(val.slice(12));
      setSubcategory("");
    } else if (val === "custom") {
      setCategory("custom");
      setCustomCategory("");
      setSubcategory("");
    } else {
      setCategory(val);
      setCustomCategory("");
      setSubcategory("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalLocation = locationMode === "custom" ? customLocation.trim() : locationMode;

    if (category === "custom" && customCategory.trim() && onEnsureCategory) {
      await onEnsureCategory(customCategory.trim());
    }
    if (locationMode === "custom" && customLocation.trim() && onEnsureLocation) {
      await onEnsureLocation(customLocation.trim());
    }

    const data = {
      name: name.trim(),
      category,
      subcategory: subcategory || "",
      customCategory: category === "custom" ? customCategory.trim() : undefined,
      quantity: Math.max(0, parseInt(quantity) || 0),
      location: finalLocation,
      locationDetail: locationDetail.trim(),
      locationImage,
      productImage,
      itemImage,
      notes: notes.trim(),
      barcode: barcode.trim(),
      expirationDate: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : null,
      houseId: editItem?.houseId || null,
    };

    if (editItem && onUpdate) {
      onUpdate(editItem.id, data);
    } else {
      onAdd(data);
    }

    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            <DialogDescription>
              {editItem ? "Update the details below." : "Add a tool or material to your inventory."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Barcode section */}
            <div className="space-y-2">
              <Label>Barcode</Label>
              <div className="flex gap-2">
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or enter barcode..." className="flex-1" />
                <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)} title="Scan barcode">
                  <ScanBarcode className="h-4 w-4" />
                </Button>
                {barcode && !lookingUp && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleBarcodeLookup(barcode)}>Look Up</Button>
                )}
                {lookingUp && <Loader2 className="h-5 w-5 animate-spin self-center text-muted-foreground" />}
              </div>
            </div>

            {/* Product URL section */}
            <div className="space-y-2">
              <Label>Product URL</Label>
              <div className="flex gap-2">
                <Input value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="Paste product page link..." className="flex-1" />
                <Button type="button" variant="secondary" size="sm" onClick={handleUrlLookup} disabled={!productUrl.trim() || urlLookingUp} className="gap-1">
                  {urlLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                  Fetch
                </Button>
              </div>
            </div>

            {/* Product Image */}
            {productImage && (
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={productImage} alt="Product" className="w-full h-32 object-contain bg-white" referrerPolicy="no-referrer" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setProductImage("")}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hammer, Nails..." required />
            </div>

            {/* Category & Subcategory */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category === "custom" ? (customCategory ? `customsaved:${customCategory}` : "custom") : category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORIES.map((c) => (
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
                <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Enter custom category name..." className="mt-2" />
              )}
            </div>

            {/* Subcategory - show for built-in categories with subs, or free-text for custom */}
            {(subcategories.length > 0 || category === "custom") && (
              <div className="space-y-2">
                <Label>Subcategory</Label>
                {category === "custom" ? (
                  <Input
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="Enter custom subcategory (optional)..."
                  />
                ) : (
                  <Select value={subcategory || "none"} onValueChange={(v) => setSubcategory(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select subcategory..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— General —</SelectItem>
                      {subcategories.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            {/* Expiration Date - only for food/medicine categories */}
            {EXPIRABLE_CATEGORIES.includes(category) && (
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expirationDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate ? format(expirationDate, "PPP") : <span>Pick expiration date...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expirationDate}
                      onSelect={setExpirationDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {expirationDate && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setExpirationDate(undefined)}>
                    Clear expiration date
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationMode} onValueChange={setLocationMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} placeholder="Enter custom location name..." />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationDetail">Location Detail</Label>
              <Input id="locationDetail" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="e.g. Top shelf, left drawer..." />
            </div>

            <div className="space-y-2">
              <Label>Location Photo</Label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
              {locationImage ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={locationImage} alt="Location" className="w-full h-32 object-cover" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setLocationImage("")}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4" /> Take or Choose Photo
                </Button>
              )}
            </div>

            {/* Item Photo */}
            <div className="space-y-2">
              <Label>Item Photo</Label>
              <input ref={itemFileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleItemImageChange} />
              {itemImage ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={itemImage} alt="Item" className="w-full h-32 object-cover" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setItemImage("")}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => itemFileInputRef.current?.click()}>
                  <Camera className="h-4 w-4" /> Take or Upload Item Photo
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{editItem ? "Save Changes" : "Add Item"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onScanned={handleBarcodeLookup} />
    </>
  );
}

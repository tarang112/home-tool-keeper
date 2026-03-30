import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Camera, X, ScanBarcode, Loader2, Link } from "lucide-react";
import { CATEGORIES, LOCATIONS, type InventoryItem, type ItemCategory } from "@/hooks/use-inventory";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void;
  editItem?: InventoryItem | null;
  onUpdate?: (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => void;
}

export function AddItemDialog({ open, onOpenChange, onAdd, editItem, onUpdate }: AddItemDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>("tools");
  const [customCategory, setCustomCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [locationMode, setLocationMode] = useState("Garage");
  const [customLocation, setCustomLocation] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [locationImage, setLocationImage] = useState("");
  const [notes, setNotes] = useState("");
  const [barcode, setBarcode] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [urlLookingUp, setUrlLookingUp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setCustomCategory(editItem.customCategory || "");
      setQuantity(String(editItem.quantity));
      const loc = editItem.location;
      if (LOCATIONS.includes(loc)) {
        setLocationMode(loc);
        setCustomLocation("");
      } else {
        setLocationMode("custom");
        setCustomLocation(loc);
      }
      setLocationDetail(editItem.locationDetail ?? "");
      setLocationImage(editItem.locationImage ?? "");
      setNotes(editItem.notes ?? "");
      setBarcode(editItem.barcode ?? "");
    } else {
      setName("");
      setCategory("tools");
      setCustomCategory("");
      setQuantity("1");
      setLocationMode("Garage");
      setCustomLocation("");
      setLocationDetail("");
      setLocationImage("");
      setNotes("");
      setBarcode("");
    }
  }, [editItem, open]);

  const handleBarcodeLookup = async (code: string) => {
    setBarcode(code);
    setLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("barcode-lookup", {
        body: { barcode: code },
      });
      if (error) throw error;
      if (data?.success && data.product) {
        const p = data.product;
        if (p.name && !name) setName(p.name);
        if (p.category && CATEGORIES.some((c) => c.value === p.category)) {
          setCategory(p.category as ItemCategory);
        }
        if (p.notes && !notes) setNotes(p.notes);
        toast.success(`Found: ${p.name || "Product details loaded"}`);
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
        const p = data.product;
        if (p.name && !name) setName(p.name);
        if (p.category && CATEGORIES.some((c) => c.value === p.category)) {
          setCategory(p.category as ItemCategory);
        }
        if (p.notes && !notes) setNotes(p.notes);
        toast.success(`Found: ${p.name || "Product details loaded"}`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      category,
      customCategory: category === "custom" ? customCategory.trim() : undefined,
      quantity: Math.max(0, parseInt(quantity) || 0),
      location: locationMode === "custom" ? customLocation.trim() : locationMode,
      locationDetail: locationDetail.trim(),
      locationImage,
      notes: notes.trim(),
      barcode: barcode.trim(),
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
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setScannerOpen(true)}
                  title="Scan barcode"
                >
                  <ScanBarcode className="h-4 w-4" />
                </Button>
                {barcode && !lookingUp && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleBarcodeLookup(barcode)}
                  >
                    Look Up
                  </Button>
                )}
                {lookingUp && <Loader2 className="h-5 w-5 animate-spin self-center text-muted-foreground" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hammer, Nails..." required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ItemCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">✏️ Custom</SelectItem>
                  </SelectContent>
                </Select>
                {category === "custom" && (
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category name..."
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationMode} onValueChange={setLocationMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Location</SelectItem>
                </SelectContent>
              </Select>
              {locationMode === "custom" && (
                <Input
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="Enter custom location name..."
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationDetail">Location Detail</Label>
              <Input
                id="locationDetail"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="e.g. Top shelf, left drawer..."
              />
            </div>

            <div className="space-y-2">
              <Label>Location Photo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
              />
              {locationImage ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={locationImage} alt="Location" className="w-full h-32 object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => setLocationImage("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> Take or Choose Photo
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

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScanned={handleBarcodeLookup}
      />
    </>
  );
}

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
import { Camera, X } from "lucide-react";
import { CATEGORIES, LOCATIONS, type InventoryItem, type ItemCategory } from "@/hooks/use-inventory";

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
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("Garage");
  const [locationDetail, setLocationDetail] = useState("");
  const [locationImage, setLocationImage] = useState("");
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setQuantity(String(editItem.quantity));
      setLocation(editItem.location);
      setLocationDetail(editItem.locationDetail ?? "");
      setLocationImage(editItem.locationImage ?? "");
      setNotes(editItem.notes ?? "");
    } else {
      setName("");
      setCategory("tools");
      setQuantity("1");
      setLocation("Garage");
      setLocationDetail("");
      setLocationImage("");
      setNotes("");
    }
  }, [editItem, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocationImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      category,
      quantity: Math.max(0, parseInt(quantity) || 0),
      location,
      locationDetail: locationDetail.trim(),
      locationImage,
      notes: notes.trim(),
      houseId: editItem?.houseId || null,
    };

    if (editItem && onUpdate) {
      onUpdate(editItem.id, data);
    } else {
      onAdd(data);
    }

    setName("");
    setCategory("tools");
    setQuantity("1");
    setLocation("Garage");
    setLocationDetail("");
    setLocationImage("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          <DialogDescription>
            {editItem ? "Update the details below." : "Add a tool or material to your inventory."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  );
}

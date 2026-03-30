import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { House } from "@/hooks/use-houses";
import type { InventoryItem } from "@/hooks/use-inventory";

interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  houses: House[];
  onMove: (itemId: string, houseId: string | null) => void;
}

export function MoveItemDialog({ open, onOpenChange, item, houses, onMove }: MoveItemDialogProps) {
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  const handleMove = () => {
    if (!item) return;
    onMove(item.id, selectedHouseId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move Item</DialogTitle>
          <DialogDescription>
            Move <strong>{item?.name}</strong> to a different house or back to personal items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedHouseId === null ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
            onClick={() => setSelectedHouseId(null)}
          >
            <Checkbox checked={selectedHouseId === null} />
            <span className="text-sm font-medium">📋 Personal Items</span>
          </label>

          {houses.map((house) => (
            <label
              key={house.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedHouseId === house.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
              onClick={() => setSelectedHouseId(house.id)}
            >
              <Checkbox checked={selectedHouseId === house.id} />
              <span className="text-sm font-medium">🏠 {house.name}</span>
            </label>
          ))}

          {houses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No houses created yet. Create a house first to move items.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMove}>Move Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

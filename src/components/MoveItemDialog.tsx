import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { House } from "@/hooks/use-houses";
import type { InventoryItem } from "@/hooks/use-inventory";

interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  houses: House[];
  onMove: (itemId: string, houseId: string | null) => void;
}

function locationIcon(house: House) {
  return house.propertyType === "business" ? "🏢" : "🏠";
}

export function MoveItemDialog({ open, onOpenChange, item, houses, onMove }: MoveItemDialogProps) {
  const { user } = useAuth();
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [sharedHouseIds, setSharedHouseIds] = useState<Set<string>>(new Set());
  const [loadingShares, setLoadingShares] = useState(false);
  const [tab, setTab] = useState<string>("share");

  // Load current shares when dialog opens
  useEffect(() => {
    if (!open || !item) return;
    setSelectedHouseId(null);
    loadShares();
  }, [open, item?.id]);

  const loadShares = async () => {
    if (!item) return;
    setLoadingShares(true);
    const { data } = await supabase
      .from("item_shares")
      .select("house_id")
      .eq("item_id", item.id);
    setSharedHouseIds(new Set((data || []).map((s: any) => s.house_id)));
    setLoadingShares(false);
  };

  const toggleShare = async (houseId: string) => {
    if (!item || !user) return;
    const isShared = sharedHouseIds.has(houseId);

    if (isShared) {
      const { error } = await supabase
        .from("item_shares")
        .delete()
        .eq("item_id", item.id)
        .eq("house_id", houseId);
      if (error) { toast.error("Failed to unshare"); return; }
      setSharedHouseIds((prev) => {
        const next = new Set(prev);
        next.delete(houseId);
        return next;
      });
      toast.success(`Unshared from location`);
    } else {
      const { error } = await supabase
        .from("item_shares")
        .insert({ item_id: item.id, house_id: houseId, shared_by: user.id });
      if (error) { toast.error("Failed to share"); return; }
      setSharedHouseIds((prev) => new Set(prev).add(houseId));
      toast.success(`Shared to location`);
    }
  };

  const handleMove = () => {
    if (!item) return;
    onMove(item.id, selectedHouseId);
    onOpenChange(false);
  };

  const availableHousesForShare = houses.filter((h) => h.id !== item?.houseId);
  const availableHousesForMove = houses;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share or Move Item</DialogTitle>
          <DialogDescription>
            <strong>{item?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="move">Move</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Share this item so it's visible in other locations too. The item stays in its current location.
            </p>
            {availableHousesForShare.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other locations to share with. Create more locations first.
              </p>
            ) : (
              availableHousesForShare.map((house) => (
                <label
                  key={house.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    sharedHouseIds.has(house.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => toggleShare(house.id)}
                >
                  <Checkbox checked={sharedHouseIds.has(house.id)} />
                  <span className="text-sm font-medium">{locationIcon(house)} {house.name}</span>
                  {sharedHouseIds.has(house.id) && (
                    <span className="ml-auto text-xs text-primary">Shared</span>
                  )}
                </label>
              ))
            )}
          </TabsContent>

          <TabsContent value="move" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Move this item permanently to a different location or back to personal.
            </p>
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedHouseId === null ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
              onClick={() => setSelectedHouseId(null)}
            >
              <Checkbox checked={selectedHouseId === null} />
              <span className="text-sm font-medium">📋 Personal Items</span>
            </label>

            {availableHousesForMove.map((house) => (
              <label
                key={house.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedHouseId === house.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setSelectedHouseId(house.id)}
              >
                <Checkbox checked={selectedHouseId === house.id} />
                <span className="text-sm font-medium">{locationIcon(house)} {house.name}</span>
              </label>
            ))}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleMove}>Move Item</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

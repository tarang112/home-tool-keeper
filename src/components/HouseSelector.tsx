import { useState } from "react";
import { Home, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { House } from "@/hooks/use-houses";

interface HouseSelectorProps {
  houses: House[];
  selectedHouseId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onManage: () => void;
}

export function HouseSelector({ houses, selectedHouseId, onSelect, onCreate, onManage }: HouseSelectorProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setCreateOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={selectedHouseId || "all"}
          onValueChange={(v) => onSelect(v === "all" ? null : v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All Items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items (Personal)</SelectItem>
            {houses.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                🏠 {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
        {selectedHouseId && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onManage}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Create House</DialogTitle>
            <DialogDescription>Name your house or property to organize and share inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="houseName">House Name</Label>
            <Input
              id="houseName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Main House, Beach House..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from "react";
import { Home, Plus, Settings, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BUSINESS_TYPES } from "@/config/business-categories";
import type { House } from "@/hooks/use-houses";

interface HouseSelectorProps {
  houses: House[];
  selectedHouseId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, propertyType: "personal" | "business", businessType?: string) => void;
  onManage: () => void;
}

export function HouseSelector({ houses, selectedHouseId, onSelect, onCreate, onManage }: HouseSelectorProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [propertyType, setPropertyType] = useState<"personal" | "business">("personal");
  const [businessType, setBusinessType] = useState("");

  const personalHouses = houses.filter((h) => h.propertyType !== "business");
  const businessHouses = houses.filter((h) => h.propertyType === "business");

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (propertyType === "business" && !businessType) return;
    onCreate(newName.trim(), propertyType, propertyType === "business" ? businessType : undefined);
    setNewName("");
    setPropertyType("personal");
    setBusinessType("");
    setCreateOpen(false);
  };

  const resetAndOpen = () => {
    setNewName("");
    setPropertyType("personal");
    setBusinessType("");
    setCreateOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={selectedHouseId || "all-personal"}
          onValueChange={(v) => onSelect(v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All Items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-personal">All Personal</SelectItem>
            {businessHouses.length > 0 && (
              <SelectItem value="all-business">All Business</SelectItem>
            )}
            {personalHouses.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground">🏠 Personal</SelectLabel>
                {personalHouses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    <span className="flex items-center gap-2">
                      {h.imageUrl ? (
                        <img src={h.imageUrl} alt="" className="h-4 w-4 rounded object-cover shrink-0" />
                      ) : (
                        <span>🏠</span>
                      )}
                      {h.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {businessHouses.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs text-muted-foreground">🏢 Business</SelectLabel>
                {businessHouses.map((h) => {
                  const bt = BUSINESS_TYPES.find((b) => b.value === h.businessType);
                  return (
                    <SelectItem key={h.id} value={h.id}>
                      <span className="flex items-center gap-2">
                        {h.imageUrl ? (
                          <img src={h.imageUrl} alt="" className="h-4 w-4 rounded object-cover shrink-0" />
                        ) : (
                          <span>{bt?.icon || "🏢"}</span>
                        )}
                        {h.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={resetAndOpen}>
          <Plus className="h-4 w-4" />
        </Button>
        {selectedHouseId && !selectedHouseId.startsWith("all-") && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onManage}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Create Property</DialogTitle>
            <DialogDescription>Set up a personal house or a business to organize inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Property Type</Label>
              <RadioGroup value={propertyType} onValueChange={(v) => { setPropertyType(v as any); setBusinessType(""); }} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal" className="flex items-center gap-1 cursor-pointer font-normal">
                    <Home className="h-4 w-4" /> Personal / House
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="flex items-center gap-1 cursor-pointer font-normal">
                    <Building2 className="h-4 w-4" /> Business
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {propertyType === "business" && (
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((bt) => (
                      <SelectItem key={bt.value} value={bt.value}>
                        {bt.icon} {bt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="houseName">
                {propertyType === "business" ? "Business Name" : "House Name"}
              </Label>
              <Input
                id="houseName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={propertyType === "business" ? "e.g. Grand Hotel, Joe's Cafe..." : "e.g. Main House, Beach House..."}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || (propertyType === "business" && !businessType)}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

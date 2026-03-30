import { useState, useMemo } from "react";
import { Plus, Search, Package, LogOut, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useInventory, CATEGORIES, type ItemCategory, type InventoryItem } from "@/hooks/use-inventory";
import { useHouses } from "@/hooks/use-houses";
import { useAuth } from "@/hooks/use-auth";
import { useCustomOptions } from "@/hooks/use-custom-options";
import { StatsBar } from "@/components/StatsBar";
import { ItemCard } from "@/components/ItemCard";
import { AddItemDialog } from "@/components/AddItemDialog";
import { HouseSelector } from "@/components/HouseSelector";
import { HouseManageDialog } from "@/components/HouseManageDialog";
import { MoveItemDialog } from "@/components/MoveItemDialog";
import { ManageOptionsDialog } from "@/components/ManageOptionsDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { user, signOut } = useAuth();
  const {
    houses, selectedHouseId, selectedHouse, setSelectedHouseId,
    members, isOwner, loading: housesLoading,
    createHouse, deleteHouse, inviteMember, removeMember,
  } = useHouses();
  const { items, loading, addItem, updateItem, deleteItem, adjustQuantity } = useInventory(selectedHouseId);
  const {
    customCategories, customLocations,
    addCategory, updateCategory, deleteCategory,
    addLocation, updateLocation, deleteLocation,
    ensureCategory, ensureLocation,
  } = useCustomOptions();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ItemCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase()) ||
        item.notes.toLowerCase().includes(search.toLowerCase()) ||
        (item.customCategory?.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory]);

  const handleEdit = (item: InventoryItem) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditItem(null);
  };

  const handleAddItem = (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    addItem({ ...item, houseId: selectedHouseId });
  };

  const handleMoveItem = (itemId: string, houseId: string | null) => {
    updateItem(itemId, { houseId });
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="font-heading font-bold text-xl">HomeStock</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
            <NotificationBell />
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setOptionsOpen(true)} title="Manage categories & locations">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={signOut} className="h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* House selector */}
        <HouseSelector
          houses={houses}
          selectedHouseId={selectedHouseId}
          onSelect={setSelectedHouseId}
          onCreate={createHouse}
          onManage={() => setManageOpen(true)}
        />

        <StatsBar items={items} />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Badge
            variant={activeCategory === "all" ? "default" : "secondary"}
            className="cursor-pointer shrink-0 select-none"
            onClick={() => setActiveCategory("all")}
          >
            All
          </Badge>
          {CATEGORIES.map((c) => (
            <Badge
              key={c.value}
              variant={activeCategory === c.value ? "default" : "secondary"}
              className="cursor-pointer shrink-0 select-none"
              onClick={() => setActiveCategory(c.value)}
            >
              {c.icon} {c.label}
            </Badge>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {items.length === 0 ? "No items yet" : "No items match your search"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {items.length === 0
                ? selectedHouseId
                  ? "Tap \"Add\" to start tracking inventory for this house."
                  : "Tap \"Add\" to start tracking your inventory."
                : "Try a different search or category."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onAdjust={adjustQuantity}
                onEdit={handleEdit}
                onDelete={deleteItem}
                onMove={(item) => setMoveItem(item)}
              />
            ))}
          </div>
        )}
      </main>

      <AddItemDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onAdd={handleAddItem}
        editItem={editItem}
        onUpdate={updateItem}
        customCategories={customCategories}
        customLocations={customLocations}
        onEnsureCategory={ensureCategory}
        onEnsureLocation={ensureLocation}
      />

      <HouseManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        house={selectedHouse}
        members={members}
        isOwner={isOwner}
        onInvite={inviteMember}
        onRemoveMember={removeMember}
        onDelete={deleteHouse}
        currentUserId={user?.id}
      />

      <MoveItemDialog
        open={!!moveItem}
        onOpenChange={(open) => { if (!open) setMoveItem(null); }}
        item={moveItem}
        houses={houses}
        onMove={handleMoveItem}
      />

      <ManageOptionsDialog
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        customCategories={customCategories}
        customLocations={customLocations}
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onAddLocation={addLocation}
        onUpdateLocation={updateLocation}
        onDeleteLocation={deleteLocation}
      />
    </div>
  );
};

export default Index;

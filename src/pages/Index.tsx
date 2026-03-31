import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Package, LogOut, Settings2, UserCog, ChevronDown, ChevronRight, ScanLine, Mail, PlusCircle, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useInventory, CATEGORIES, MAIN_CATEGORIES, type ItemCategory, type InventoryItem, type MainCategory } from "@/hooks/use-inventory";
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
import { ProfileSettingsDialog } from "@/components/ProfileSettingsDialog";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { EmailImport } from "@/components/EmailImport";
import { useItemDefaults } from "@/hooks/use-item-defaults";
import { Skeleton } from "@/components/ui/skeleton";
import { getBusinessCategories } from "@/config/business-categories";
import { InstallBanner } from "@/components/InstallBanner";

const Index = () => {
  const { user, signOut } = useAuth();
  const {
    houses, selectedHouseId, selectedHouse, setSelectedHouseId,
    members, pendingInvites, isOwner, loading: housesLoading,
    defaultHouseId, setDefaultHouse,
    createHouse, renameHouse, deleteHouse, inviteMember, createInviteLink, cancelInvite, removeMember, uploadHouseImage, removeHouseImage,
  } = useHouses();

  // Compute inventory filter based on selection
  const isAllPersonal = selectedHouseId === "all-personal" || !selectedHouseId;
  const isAllBusiness = selectedHouseId === "all-business";
  const isSpecificHouse = selectedHouseId && !selectedHouseId.startsWith("all-");

  const personalHouseIds = useMemo(() => houses.filter(h => h.propertyType !== "business").map(h => h.id), [houses]);
  const businessHouseIds = useMemo(() => houses.filter(h => h.propertyType === "business").map(h => h.id), [houses]);

  const effectiveHouseId = isSpecificHouse ? selectedHouseId : null;
  const effectiveHouseIds = isAllPersonal
    ? personalHouseIds
    : isAllBusiness
      ? businessHouseIds
      : undefined;

  const { items, loading, addItem, updateItem, deleteItem, adjustQuantity } = useInventory(effectiveHouseId, effectiveHouseIds, isAllPersonal);
  const {
    customCategories, customLocations,
    addCategory, updateCategory, deleteCategory,
    addLocation, updateLocation, deleteLocation,
    ensureCategory, ensureLocation,
  } = useCustomOptions(isAllBusiness || selectedHouse?.propertyType === "business" ? "business" : "personal");
  const { saveDefaults } = useItemDefaults();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ItemCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);
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
    if (!open) { setEditItem(null); setBarcodeMode(false); }
  };

  const handleAddItem = useCallback((item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    let houseIdForItem: string | null = null;
    if (isSpecificHouse) {
      houseIdForItem = selectedHouseId;
    } else if (isAllPersonal && personalHouseIds.length === 1) {
      houseIdForItem = personalHouseIds[0];
    } else if (isAllBusiness && businessHouseIds.length === 1) {
      houseIdForItem = businessHouseIds[0];
    } else if (isAllPersonal && personalHouseIds.length > 1) {
      houseIdForItem = personalHouseIds[0];
    } else if (isAllBusiness && businessHouseIds.length > 1) {
      houseIdForItem = businessHouseIds[0];
    }
    addItem({ ...item, houseId: houseIdForItem });
    // Save defaults for future voice commands
    saveDefaults(item.name, {
      category: item.category,
      subcategory: item.subcategory,
      location: item.location,
      quantityUnit: item.quantityUnit,
    });
  }, [isSpecificHouse, selectedHouseId, isAllPersonal, personalHouseIds, isAllBusiness, businessHouseIds, addItem, saveDefaults]);

  const handleMoveItem = (itemId: string, houseId: string | null) => {
    updateItem(itemId, { houseId });
  };

  return (
    <div className="min-h-screen pb-24 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[max(6rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="max-w-lg lg:max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="font-heading font-bold text-xl">HomeStock</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="gap-1 h-8 px-2 text-xs" onClick={() => setDialogOpen(true)} title="Manual Entry">
              <PlusCircle className="h-4 w-4" /> Add
            </Button>
            <Button size="sm" variant="outline" className="gap-1 h-8 px-2 text-xs" onClick={() => { setBarcodeMode(true); setDialogOpen(true); }} title="Scan Barcode">
              <ScanBarcode className="h-4 w-4" /> Barcode
            </Button>
            <Button size="sm" variant="outline" className="gap-1 h-8 px-2 text-xs" onClick={() => setScannerOpen(true)} title="Scan Receipt">
              <ScanLine className="h-4 w-4" /> Receipt
            </Button>
            <Button size="sm" variant="outline" className="gap-1 h-8 px-2 text-xs" onClick={() => setEmailOpen(true)} title="Import Email">
              <Mail className="h-4 w-4" /> Email
            </Button>
            <NotificationBell />
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setOptionsOpen(true)} title="Manage categories & locations">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setProfileOpen(true)} title="Profile settings">
              <UserCog className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={signOut} className="h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg lg:max-w-5xl mx-auto px-4 py-4 space-y-4">
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

        {(() => {
          const activeCategories: { value: string; label: string; icon: string }[] =
            selectedHouse?.propertyType === "business" && selectedHouse.businessType
              ? getBusinessCategories(selectedHouse.businessType).map((c) => ({ value: c.value, label: c.label, icon: c.icon }))
              : CATEGORIES;
          return (
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              <Badge
                variant={activeCategory === "all" ? "default" : "secondary"}
                className="cursor-pointer shrink-0 select-none"
                onClick={() => setActiveCategory("all")}
              >
                All
              </Badge>
              {activeCategories.map((c) => (
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
          );
        })()}

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
        ) : (() => {
          // Group items by category
          const grouped = new Map<string, InventoryItem[]>();
          for (const item of filtered) {
            const key = item.category;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(item);
          }

          // Sort category groups by a consistent order (known categories first, then custom)
          const categoryOrder = CATEGORIES.map(c => c.value);
          const sortedGroups = [...grouped.entries()].sort(([a], [b]) => {
            const ai = categoryOrder.indexOf(a);
            const bi = categoryOrder.indexOf(b);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          });

          return (
            <div className="space-y-5">
              {sortedGroups.map(([catValue, catItems]) => {
                const cat = CATEGORIES.find(c => c.value === catValue);
                const label = catValue.startsWith("custom:") ? catValue.replace("custom:", "") : (cat?.label || catValue);
                const icon = cat?.icon || "📦";
                return (
                  <div key={catValue}>
                    <button
                      className="flex items-center gap-1.5 mb-2 px-1 w-full text-left hover:opacity-80 transition-opacity"
                      onClick={() => toggleCategory(catValue)}
                    >
                      {collapsedCategories.has(catValue)
                        ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                      <span className="text-sm">{icon}</span>
                      <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wide">{label}</h2>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">{catItems.length}</Badge>
                    </button>
                    {!collapsedCategories.has(catValue) && (
                      <div className="space-y-2 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:space-y-0">
                        {catItems.map((item) => (
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
                  </div>
                );
              })}
            </div>
          );
        })()}
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
        businessCategories={
          selectedHouse?.propertyType === "business" && selectedHouse.businessType
            ? getBusinessCategories(selectedHouse.businessType)
            : undefined
        }
        initialBarcodeScan={barcodeMode}
      />

      <ReceiptScanner
        onAdd={handleAddItem}
        customLocations={customLocations.map((l) => l.name)}
        externalOpen={scannerOpen}
        onExternalOpenChange={setScannerOpen}
      />

      <EmailImport
        onAdd={handleAddItem}
        customLocations={customLocations.map((l) => l.name)}
        externalOpen={emailOpen}
        onExternalOpenChange={setEmailOpen}
      />

      <HouseManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        house={selectedHouse}
        members={members}
        pendingInvites={pendingInvites}
        isOwner={isOwner}
        onInvite={inviteMember}
        onCreateInviteLink={createInviteLink}
        onRename={renameHouse}
        onRemoveMember={removeMember}
        onCancelInvite={cancelInvite}
        onDelete={deleteHouse}
        onUploadImage={uploadHouseImage}
        onRemoveImage={removeHouseImage}
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

      <ProfileSettingsDialog open={profileOpen} onOpenChange={setProfileOpen} houses={houses} defaultHouseId={defaultHouseId} onSetDefaultHouse={setDefaultHouse} />

      <VoiceAssistant
        items={items}
        onAdd={handleAddItem}
        onUpdate={updateItem}
        onDelete={deleteItem}
        customLocations={customLocations.map((l) => l.name)}
        houseId={effectiveHouseId}
      />
      <InstallBanner />
    </div>
  );
};

export default Index;

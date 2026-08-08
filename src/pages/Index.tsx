import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Package, LogOut, Settings2, UserCog, ChevronDown, ChevronRight, ScanLine, Mail, PlusCircle, ScanBarcode, RefreshCw, PlusSquare, Trash2, RotateCcw, Download, FileText, Table2, AlertTriangle, ReceiptText, Moon, Sun, HandCoins, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTheme } from "@/hooks/use-theme";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { BottomActionBar } from "@/components/BottomActionBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeGroupedItemName } from "@/lib/item-matching";

const getEarliestExpiry = (dates: Array<string | null | undefined>) => {
  const validDates = dates.filter(Boolean) as string[];
  if (validDates.length === 0) return null;
  return [...validDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
};

const Index = () => {
  const { user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Resolve house ID for imports (receipt scanner, email import)
  const resolvedHouseIdForImport = useMemo(() => {
    if (isSpecificHouse) return selectedHouseId;
    if (isAllPersonal && personalHouseIds.length >= 1) return personalHouseIds[0];
    if (isAllBusiness && businessHouseIds.length >= 1) return businessHouseIds[0];
    return null;
  }, [isSpecificHouse, selectedHouseId, isAllPersonal, personalHouseIds, isAllBusiness, businessHouseIds]);
  const effectiveHouseIds = isAllPersonal
    ? personalHouseIds
    : isAllBusiness
      ? businessHouseIds
      : undefined;

  const { items, loading, addItem, updateItem, deleteItem, adjustQuantity, findDuplicateCandidate, restoreItem, fetchDeletedItems } = useInventory(effectiveHouseId, effectiveHouseIds, isAllPersonal);
  const {
    customCategories, customLocations,
    addCategory, updateCategory, deleteCategory,
    addLocation, updateLocation, deleteLocation,
    ensureCategory, ensureLocation,
  } = useCustomOptions(isAllBusiness || selectedHouse?.propertyType === "business" ? "business" : "personal");
  const { saveDefaults } = useItemDefaults();

  const { theme, toggle: toggleTheme } = useTheme();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const accountInitials = (user?.user_metadata?.display_name || user?.email || "U")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "expiring" | "lent">("all");
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
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedItems, setDeletedItems] = useState<InventoryItem[]>([]);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    existing: InventoryItem;
    incoming: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">;
    resolve: (action: "update" | "replace" | "cancel") => void;
  } | null>(null);

  useEffect(() => {
    if (!user || searchParams.get("checkout") !== "pending") return;
    const selection = user.user_metadata?.billing_selection;
    if (!selection?.plan || !selection?.billingCycle) return;

    void supabase.from("billing_preferences" as any).upsert({
      user_id: user.id,
      plan: selection.plan,
      billing_cycle: selection.billingCycle,
      location_count: selection.locationCount || 1,
      unit_amount_cents: selection.unitAmountCents || 0,
      total_amount_cents: selection.totalAmountCents || 0,
      status: "checkout_started",
    } as any, { onConflict: "user_id" }).then(({ error }) => {
      if (!error) toast.success(`Checkout ready: ${selection.plan} ${selection.billingCycle}`);
      setSearchParams({}, { replace: true });
    });
  }, [searchParams, setSearchParams, user]);

  // Load deleted items when section is opened
  useEffect(() => {
    if (showDeleted) {
      fetchDeletedItems().then(setDeletedItems);
    }
  }, [showDeleted, fetchDeletedItems]);

  const lowStockItems = useMemo(() => items.filter((item) => item.quantity <= 1), [items]);
  const [expiringDays, setExpiringDays] = useState(7);

  const daysUntil = useCallback((date?: string | null) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, []);

  const matchesStockFilter = useCallback((item: InventoryItem, filter: typeof stockFilter) => {
    if (filter === "low") return item.quantity <= 1;
    if (filter === "out") return item.quantity === 0;
    if (filter === "lent") return !!item.lentTo;
    if (filter === "expiring") {
      const diff = daysUntil(item.expirationDate);
      return diff !== null && diff >= 0 && diff <= expiringDays;
    }
    return true;
  }, [daysUntil, expiringDays]);

  const filterCounts = useMemo(() => ({
    all: items.length,
    low: items.filter((i) => matchesStockFilter(i, "low")).length,
    out: items.filter((i) => matchesStockFilter(i, "out")).length,
    expiring: items.filter((i) => matchesStockFilter(i, "expiring")).length,
    lent: items.filter((i) => matchesStockFilter(i, "lent")).length,
  }), [items, matchesStockFilter]);

  // Legacy typed shortcuts (qty:0, low, exp:7) now drive the filter chips instead of the search string.
  useEffect(() => {
    const typed = search.trim().toLowerCase();
    if (!typed) return;
    const expiringMatch = typed.match(/^exp(?:iring)?:?(\d+)?$/);
    if (typed === "qty:0" || typed === "out") {
      setStockFilter("out");
      setSearch("");
    } else if (typed === "low" || typed === "low-stock") {
      setStockFilter("low");
      setSearch("");
    } else if (typed === "lent") {
      setStockFilter("lent");
      setSearch("");
    } else if (expiringMatch) {
      setExpiringDays(Number(expiringMatch[1] || 7));
      setStockFilter("expiring");
      setSearch("");
    }
  }, [search]);

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesStockFilter(item, stockFilter)) return false;
      const matchesSearch = !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch) ||
        item.location.toLowerCase().includes(normalizedSearch) ||
        item.notes.toLowerCase().includes(normalizedSearch) ||
        item.quantityUnit.toLowerCase().includes(normalizedSearch) ||
        (item.subcategory?.toLowerCase().includes(normalizedSearch)) ||
        (item.customCategory?.toLowerCase().includes(normalizedSearch));
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory, stockFilter, matchesStockFilter]);

  const exportRowsRef = useRef<((format: "csv" | "excel" | "pdf") => void) | null>(null);

  const exportRows = useCallback((format: "csv" | "excel" | "pdf") => {
    const rows = filtered.map((item) => ({
      Name: item.name,
      Category: item.customCategory || item.category,
      Quantity: item.quantity,
      Unit: item.quantityUnit,
      Location: item.location,
      Expiration: item.expirationDate || "",
      Notes: item.notes || "",
    }));

    if (format === "pdf") {
      const html = `<!doctype html><html><head><title>Inventory Export</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left}th{background:#f4f4f5}h1{font-size:20px}</style></head><body><h1>HomeStock Inventory</h1><table><thead><tr>${Object.keys(rows[0] || { Name: "", Category: "", Quantity: "", Unit: "", Location: "", Expiration: "", Notes: "" }).map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${Object.values(row).map((value) => `<td>${String(value).replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Popup blocked", {
          description: "Allow popups for this site to export as PDF, or use the CSV export instead.",
          action: { label: "Download CSV", onClick: () => exportRowsRef.current?.("csv") },
        });
        return;
      }
      win.document.write(html);
      win.document.close();
      win.print();
      return;
    }

    const csv = [Object.keys(rows[0] || { Name: "", Category: "", Quantity: "", Unit: "", Location: "", Expiration: "", Notes: "" }).join(","), ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: format === "excel" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `homestock-inventory.${format === "excel" ? "xls" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  exportRowsRef.current = exportRows;

  const handleEdit = (item: InventoryItem) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) { setEditItem(null); setBarcodeMode(false); }
  };

  const handleAddItem = useCallback(async (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
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

    const nextItem = { ...item, houseId: houseIdForItem };

    if (scannerOpen) {
      await addItem(nextItem);
      await saveDefaults(nextItem.name, {
        category: nextItem.category,
        subcategory: nextItem.subcategory,
        location: nextItem.location,
        quantityUnit: nextItem.quantityUnit,
      });
      return;
    }

    const duplicateMatch = findDuplicateCandidate(nextItem);

    if (duplicateMatch) {
      const action = await new Promise<"update" | "replace" | "cancel">((resolve) => {
        setDuplicatePrompt({ existing: duplicateMatch, incoming: nextItem, resolve });
      });
      setDuplicatePrompt(null);

      if (action === "cancel") return;

      if (action === "replace") {
        await deleteItem(duplicateMatch.id);
        await addItem(nextItem);
      } else {
        await updateItem(duplicateMatch.id, {
          quantity: duplicateMatch.quantity + nextItem.quantity,
          expirationDate: nextItem.expirationDate || duplicateMatch.expirationDate,
          category: nextItem.category || duplicateMatch.category,
          subcategory: nextItem.subcategory || duplicateMatch.subcategory,
          location: nextItem.location || duplicateMatch.location,
        });
      }
    } else {
      await addItem(nextItem);
    }

    await saveDefaults(nextItem.name, {
      category: nextItem.category,
      subcategory: nextItem.subcategory,
      location: nextItem.location,
      quantityUnit: nextItem.quantityUnit,
    });
  }, [isSpecificHouse, selectedHouseId, isAllPersonal, personalHouseIds, isAllBusiness, businessHouseIds, addItem, deleteItem, findDuplicateCandidate, saveDefaults, updateItem, scannerOpen]);

  const handleMoveItem = (itemId: string, houseId: string | null) => {
    updateItem(itemId, { houseId });
  };

  return (
    <>
    <div className="min-h-screen pb-28 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="sticky top-0 z-40 bg-background/80 dark:bg-background/90 backdrop-blur-xl border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="max-w-lg lg:max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="font-heading font-bold text-xl">HomeStock</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-11 w-11 rounded-full" aria-label="Account menu">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{accountInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user?.email || "Signed in"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/receipts"><ReceiptText className="mr-2 h-4 w-4" aria-hidden="true" /> Receipt imports</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setOptionsOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" /> Categories &amp; locations
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                  <UserCog className="mr-2 h-4 w-4" aria-hidden="true" /> Profile settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggleTheme(); }}>
                  {theme === "dark"
                    ? <><Sun className="mr-2 h-4 w-4" aria-hidden="true" /> Light mode</>
                    : <><Moon className="mr-2 h-4 w-4" aria-hidden="true" /> Dark mode</>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setSignOutOpen(true)}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

        <StatsBar
          items={items}
          onLowStockClick={() => setStockFilter((prev) => (prev === "low" ? "all" : "low"))}
          onCategoryClick={(category) => setActiveCategory(category)}
          activeFilter={stockFilter === "low" ? "lowStock" : undefined}
        />

        {lowStockItems.length > 0 && (
          <button onClick={() => setStockFilter("low")} className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/15">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-medium">{lowStockItems.length} low-stock item{lowStockItems.length === 1 ? "" : "s"}</span>
            <span className="ml-auto text-xs">View</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search items, locations, units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search inventory"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Export inventory">
                <Download className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Export as</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => exportRows("pdf")}><FileText className="mr-2 h-4 w-4" aria-hidden="true" /> PDF</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportRows("excel")}><Table2 className="mr-2 h-4 w-4" aria-hidden="true" /> Excel</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportRows("csv")}><Download className="mr-2 h-4 w-4" aria-hidden="true" /> CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stock state filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Filter by stock state">
          {([
            { value: "all", label: "All", count: filterCounts.all },
            { value: "low", label: "Low stock", count: filterCounts.low },
            { value: "out", label: "Out", count: filterCounts.out },
            { value: "expiring", label: "Expiring", count: filterCounts.expiring },
            { value: "lent", label: "Lent", count: filterCounts.lent },
          ] as const).map((chip) => {
            const isActive = stockFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStockFilter(chip.value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
              >
                {chip.label}
                <span className={isActive ? "opacity-90" : "text-muted-foreground"}>{chip.count}</span>
              </button>
            );
          })}
        </div>

        {(() => {
          const activeCategories: { value: string; label: string; icon: string }[] =
            selectedHouse?.propertyType === "business" && selectedHouse.businessType
              ? getBusinessCategories(selectedHouse.businessType).map((c) => ({ value: c.value, label: c.label, icon: c.icon }))
              : CATEGORIES;
          const chipClass = (isActive: boolean) =>
            `inline-flex shrink-0 select-none items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"}`;
          return (
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide" role="group" aria-label="Filter by category">
              <button
                type="button"
                aria-pressed={activeCategory === "all"}
                className={chipClass(activeCategory === "all")}
                onClick={() => setActiveCategory("all")}
              >
                All
              </button>
              {activeCategories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={activeCategory === c.value}
                  className={chipClass(activeCategory === c.value)}
                  onClick={() => setActiveCategory(c.value)}
                >
                  {c.icon} {c.label}
                </button>
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
          // Group items by category, then collapse duplicate product rows into one display card
          const grouped = new Map<string, Array<InventoryItem & { batchEntries?: Array<{ id: string; quantity: number; quantityUnit: string; expirationDate: string | null }> }>>();
          for (const item of filtered) {
            const categoryKey = item.category;
            if (!grouped.has(categoryKey)) grouped.set(categoryKey, []);

            const categoryItems = grouped.get(categoryKey)!;
            const itemKey = normalizeGroupedItemName(item.name);
            const existingGroup = categoryItems.find((entry) => normalizeGroupedItemName(entry.name) === itemKey);

            if (existingGroup) {
              existingGroup.quantity += item.quantity;
              existingGroup.expirationDate = getEarliestExpiry([existingGroup.expirationDate, item.expirationDate]);
              existingGroup.batchEntries = [
                ...(existingGroup.batchEntries || []),
                {
                  id: item.id,
                  quantity: item.quantity,
                  quantityUnit: item.quantityUnit,
                  expirationDate: item.expirationDate,
                },
              ];
            } else {
              categoryItems.push({
                ...item,
                batchEntries: [
                  {
                    id: item.id,
                    quantity: item.quantity,
                    quantityUnit: item.quantityUnit,
                    expirationDate: item.expirationDate,
                  },
                ],
              });
            }
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
                      <Badge variant="outline" className="ml-auto px-1.5 py-0 text-xs">{catItems.length}</Badge>
                    </button>
                    {!collapsedCategories.has(catValue) && (
                      <div className="space-y-2 lg:columns-2 xl:columns-3 lg:gap-3 lg:space-y-0 [&>*]:mb-3 [&>*]:break-inside-avoid">
                        {catItems.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            onAdjust={adjustQuantity}
                            onEdit={handleEdit}
                            onDelete={deleteItem}
                            onMove={(item) => setMoveItem(item)}
                            onLend={(id, lentTo, lentNotes) => {
                              updateItem(id, {
                                lentTo,
                                lentAt: lentTo ? new Date().toISOString() : null,
                                lentNotes,
                              });
                            }}
                            allItems={items}
                            houseMembers={members.map(m => ({ user_id: m.userId, display_name: m.displayName }))}
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

        {/* Recently Deleted Section */}
        <div className="mt-6 border-t pt-4">
          <button
            className="flex items-center gap-1.5 px-1 w-full text-left hover:opacity-80 transition-opacity"
            onClick={() => setShowDeleted((v) => !v)}
          >
            {showDeleted ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wide">Recently Deleted</h2>
            <span className="ml-1 text-xs text-muted-foreground">(24h)</span>
          </button>
          {showDeleted && (
            <div className="mt-2 space-y-2">
              {deletedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No recently deleted items</p>
              ) : (
                deletedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-muted/30 opacity-70">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} · {item.location || "No location"}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 shrink-0"
                      onClick={async () => {
                        await restoreItem(item.id);
                        setDeletedItems((prev) => prev.filter((d) => d.id !== item.id));
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      <AddItemDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onAdd={handleAddItem}
        editItem={editItem}
        onUpdate={updateItem}
        onDelete={deleteItem}
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
        allItems={items}
      />

      <ReceiptScanner
        onAdd={addItem}
        onUpdateItem={updateItem}
        onDeleteItem={deleteItem}
        existingItems={items}
        customLocations={customLocations.map((l) => l.name)}
        externalOpen={scannerOpen}
        onExternalOpenChange={setScannerOpen}
        houseId={resolvedHouseIdForImport}
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
        externalOpen={voiceOpen}
        onExternalOpenChange={setVoiceOpen}
      />
      <InstallBanner />
      <BottomActionBar
        onAdd={() => setDialogOpen(true)}
        onBarcode={() => { setBarcodeMode(true); setDialogOpen(true); }}
        onReceipt={() => setScannerOpen(true)}
        onEmail={() => setEmailOpen(true)}
        onVoice={() => setVoiceOpen(true)}
      />
    </div>

    <Dialog open={!scannerOpen && !!duplicatePrompt} onOpenChange={(o) => { if (!o && duplicatePrompt) duplicatePrompt.resolve("cancel"); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Item Already Exists</DialogTitle>
          <DialogDescription asChild>
            <div>
              <span className="font-semibold text-foreground">"{duplicatePrompt?.existing.name}"</span> is already in your inventory
              {duplicatePrompt?.existing.quantity != null && (
                <> with <span className="font-semibold text-foreground">{duplicatePrompt.existing.quantity} {duplicatePrompt.existing.quantityUnit}</span></>
              )}.
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button
            className="w-full gap-2 justify-start h-auto py-3"
            variant="default"
            onClick={() => duplicatePrompt?.resolve("update")}
          >
            <PlusSquare className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Update Quantity</div>
              <div className="text-xs opacity-80">
                Add {duplicatePrompt?.incoming.quantity} {duplicatePrompt?.incoming.quantityUnit} to existing ({(duplicatePrompt?.existing.quantity ?? 0) + (duplicatePrompt?.incoming.quantity ?? 0)} total)
              </div>
            </div>
          </Button>
          <Button
            className="w-full gap-2 justify-start h-auto py-3"
            variant="outline"
            onClick={() => duplicatePrompt?.resolve("replace")}
          >
            <RefreshCw className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Replace Old Item</div>
              <div className="text-xs text-muted-foreground">Delete previous entry and add this as new</div>
            </div>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => duplicatePrompt?.resolve("cancel")}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default Index;

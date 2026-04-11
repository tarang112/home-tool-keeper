import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type ItemCategory = string;

export interface SubCategory {
  value: string;
  label: string;
}

export interface MainCategory {
  value: string;
  label: string;
  icon: string;
  subcategories: SubCategory[];
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  subcategory?: string;
  customCategory?: string;
  quantity: number;
  quantityUnit: string;
  location: string;
  locationDetail: string;
  locationImage: string;
  productImage: string;
  itemImage: string;
  notes: string;
  barcode: string;
  expirationDate: string | null;
  houseId: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  createdAt: string;
  updatedAt: string;
  sharedFromHouse?: string;
  lentTo: string | null;
  lentAt: string | null;
  lentNotes: string | null;
}

export const QUANTITY_UNITS = [
  { value: "pcs", label: "No. (pcs)" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "gal", label: "gal" },
  { value: "fl oz", label: "fl oz" },
];

// Categories that should show expiration date picker
export const EXPIRABLE_CATEGORIES = ['groceries', 'produce', 'medicine'];

function normalizeLookupName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\bmixrure\b/g, "mixture")
    .replace(/\bmixure\b/g, "mixture")
    .replace(/\bjerra\b/g, "jeera")
    .replace(/\bkhahara\b/g, "khakhra")
    .replace(/\bkhahara\b/g, "khakhra")
    .replace(/\bbomnay\b/g, "bombay")
    .replace(/\s+/g, " ")
    .trim();
}

function buildImageLookupName(name: string) {
  const normalized = normalizeLookupName(name);

  if (/\bbombay mixture\b/.test(normalized) || /\bmixture\b/.test(normalized)) {
    return "Bombay mixture snack";
  }

  if (/\bkhakhra\b/.test(normalized) && /\bjeera\b/.test(normalized)) {
    return "Jeera khakhra";
  }

  if (/\bkhakhra\b/.test(normalized)) {
    return "Khakhra";
  }

  return normalized || name;
}

function normalizeInventoryName(name: string) {
  return normalizeLookupName(name);
}

function rowToItem(row: any): InventoryItem {
  const rawCat = row.category as string;
  const isCustom = rawCat?.startsWith("custom:");
  return {
    id: row.id,
    name: row.name,
    category: isCustom ? "custom" : rawCat,
    subcategory: row.subcategory || "",
    customCategory: isCustom ? rawCat.slice(7) : undefined,
    quantity: row.quantity,
    quantityUnit: row.quantity_unit || "pcs",
    location: row.location,
    locationDetail: row.location_detail || "",
    locationImage: row.location_image_url || "",
    productImage: row.product_image_url || "",
    itemImage: row.item_image_url || "",
    notes: row.notes || "",
    barcode: row.barcode || "",
    expirationDate: row.expiration_date || null,
    houseId: row.house_id || null,
    unitPrice: row.unit_price ?? null,
    totalPrice: row.total_price ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lentTo: row.lent_to || null,
    lentAt: row.lent_at || null,
    lentNotes: row.lent_notes || null,
  };
}

export function useInventory(houseId?: string | null, houseIds?: string[], includeUnassigned?: boolean) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }

    if (houseIds) {
      if (houseIds.length === 0) {
        // Houses not loaded yet — wait
        setItems([]);
        setLoading(true);
        return;
      }
      // Fetch items for multiple houses + optionally unassigned items
      const queries = [
        supabase
          .from("inventory_items")
          .select("*")
          .in("house_id", houseIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
      ];

      if (includeUnassigned) {
        queries.push(
          supabase
            .from("inventory_items")
            .select("*")
            .is("house_id", null)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        );
      }

      const results = await Promise.all(queries);
      let allItems: InventoryItem[] = [];
      for (const res of results) {
        if (res.error) {
          toast.error("Failed to load items");
          console.error(res.error);
        } else {
          allItems = [...allItems, ...(res.data || []).map(rowToItem)];
        }
      }
      // Deduplicate
      const seen = new Set<string>();
      allItems = allItems.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setItems(allItems);
      setLoading(false);
      return;
    }

    if (houseId) {
      const [ownedRes, sharedRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("*")
          .eq("house_id", houseId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("item_shares")
          .select("item_id, house_id")
          .eq("house_id", houseId),
      ]);

      let allItems = (ownedRes.data || []).map(rowToItem);

      if (sharedRes.data && sharedRes.data.length > 0) {
        const sharedIds = sharedRes.data.map((s: any) => s.item_id);
        const { data: sharedItems } = await supabase
          .from("inventory_items")
          .select("*")
          .in("id", sharedIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        if (sharedItems) {
          const existingIds = new Set(allItems.map(i => i.id));
          const sourceHouseIds = sharedItems
            .filter((s: any) => s.house_id && s.house_id !== houseId)
            .map((s: any) => s.house_id);
          let houseNameMap: Record<string, string> = {};
          if (sourceHouseIds.length > 0) {
            const { data: houseData } = await supabase
              .from("houses")
              .select("id, name")
              .in("id", [...new Set(sourceHouseIds)]);
            if (houseData) {
              houseData.forEach((h: any) => { houseNameMap[h.id] = h.name; });
            }
          }
          const newShared = sharedItems
            .filter((s: any) => !existingIds.has(s.id))
            .map((s: any) => ({
              ...rowToItem(s),
              sharedFromHouse: houseNameMap[s.house_id] || "Another house",
            }));
          allItems = [...allItems, ...newShared];
        }
      }

      setItems(allItems);
    } else {
      const { data: ownedItems, error: ownedErr } = await supabase
        .from("inventory_items")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (ownedErr) {
        toast.error("Failed to load items");
        console.error(ownedErr);
      } else {
        let allItems = (ownedItems || []).map(rowToItem);

        const { data: allShares } = await supabase
          .from("item_shares")
          .select("item_id");

        if (allShares && allShares.length > 0) {
          const sharedIds = allShares.map((s: any) => s.item_id);
          const existingIds = new Set(allItems.map(i => i.id));
          const missingIds = sharedIds.filter(id => !existingIds.has(id));
          if (missingIds.length > 0) {
            const { data: sharedItems } = await supabase
              .from("inventory_items")
              .select("*")
              .in("id", missingIds)
              .is("deleted_at", null);
            if (sharedItems) {
              allItems = [...allItems, ...sharedItems.map(rowToItem)];
            }
          }
        }

        setItems(allItems);
      }
    }
    setLoading(false);
  }, [user, houseId, houseIds, includeUnassigned]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const uploadImage = useCallback(async (file: File | string): Promise<string> => {
    if (!user) return "";
    if (typeof file === "string" && file.startsWith("http")) return file;
    let blob: Blob;
    let ext = "jpg";
    if (typeof file === "string" && file.startsWith("data:")) {
      const res = await fetch(file);
      blob = await res.blob();
      ext = blob.type.split("/")[1] || "jpg";
    } else if (file instanceof File) {
      blob = file;
      ext = file.name.split(".").pop() || "jpg";
    } else {
      return "";
    }
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("inventory-images").upload(path, blob);
    if (error) { toast.error("Image upload failed"); return ""; }
    const { data } = await supabase.storage.from("inventory-images").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl || "";
  }, [user]);

  const addItem = useCallback(async (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    if (!user) return;

    // For produce items: auto-delete older duplicate entries of the same name
    const isProduce = item.category === "produce";
    if (isProduce) {
      const { data: existingItems } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("category", "produce")
        .ilike("name", item.name);

      if (existingItems && existingItems.length > 0) {
        const idsToDelete = existingItems.map((e: any) => e.id);
        await supabase.from("inventory_items").delete().in("id", idsToDelete);
        setItems((prev) => prev.filter((i) => !idsToDelete.includes(i.id)));
        toast.info(`Replaced old "${item.name}" entry with fresh one`);
      }
    }

    let imageUrl = "";
    if (item.locationImage) {
      imageUrl = await uploadImage(item.locationImage);
    }
    let itemImageUrl = "";
    if (item.itemImage) {
      itemImageUrl = await uploadImage(item.itemImage);
    }
    const { data, error } = await supabase.from("inventory_items").insert({
      user_id: user.id,
      name: item.name,
      category: item.category === "custom" ? `custom:${item.customCategory || "Other"}` : item.category,
      subcategory: item.subcategory || "",
      quantity: item.quantity,
      quantity_unit: item.quantityUnit || "pcs",
      location: item.location,
      location_detail: item.locationDetail,
      location_image_url: imageUrl,
      product_image_url: item.productImage || "",
      item_image_url: itemImageUrl,
      notes: item.notes,
      barcode: item.barcode || "",
      expiration_date: item.expirationDate || null,
      house_id: item.houseId || null,
      unit_price: item.unitPrice ?? null,
      total_price: item.totalPrice ?? null,
    } as any).select().single();
    if (error) { toast.error("Failed to add item"); return; }
    const newItem = rowToItem(data);
    setItems((prev) => [newItem, ...prev]);
    toast.success("Item added!");

    // Auto-generate image for items without a product image (background, non-blocking)
    if (!item.productImage && !item.itemImage) {
      supabase.functions.invoke("generate-item-image", {
        body: { itemName: buildImageLookupName(item.name), itemId: data.id },
      }).then(({ data: imgData }) => {
        if (imgData?.imageUrl) {
          setItems((prev) =>
            prev.map((i) => i.id === data.id ? { ...i, productImage: imgData.imageUrl } : i)
          );
        }
      }).catch((e) => console.error("Image generation failed:", e));
    }
  }, [user, uploadImage]);

  const updateItem = useCallback(async (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) {
      dbUpdates.category = updates.category === "custom" ? `custom:${updates.customCategory || "Other"}` : updates.category;
    }
    if (updates.subcategory !== undefined) dbUpdates.subcategory = updates.subcategory;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.quantityUnit !== undefined) dbUpdates.quantity_unit = updates.quantityUnit;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.locationDetail !== undefined) dbUpdates.location_detail = updates.locationDetail;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
    if (updates.expirationDate !== undefined) dbUpdates.expiration_date = updates.expirationDate || null;
    if (updates.productImage !== undefined) dbUpdates.product_image_url = updates.productImage || "";
    if (updates.itemImage !== undefined) {
      if (updates.itemImage && !updates.itemImage.startsWith("http")) {
        dbUpdates.item_image_url = await uploadImage(updates.itemImage);
      } else {
        dbUpdates.item_image_url = updates.itemImage || "";
      }
    }
    if (updates.houseId !== undefined) dbUpdates.house_id = updates.houseId || null;
    if (updates.lentTo !== undefined) dbUpdates.lent_to = updates.lentTo || null;
    if (updates.lentAt !== undefined) dbUpdates.lent_at = updates.lentAt || null;
    if (updates.lentNotes !== undefined) dbUpdates.lent_notes = updates.lentNotes || null;
    if (updates.locationImage !== undefined) {
      if (updates.locationImage && !updates.locationImage.startsWith("http")) {
        dbUpdates.location_image_url = await uploadImage(updates.locationImage);
      } else {
        dbUpdates.location_image_url = updates.locationImage || "";
      }
    }
    const { data, error } = await supabase.from("inventory_items").update(dbUpdates).eq("id", id).select().single();
    if (error) { toast.error("Failed to update item"); return; }
    setItems((prev) => prev.map((i) => i.id === id ? rowToItem(data) : i));
  }, [user, uploadImage]);

  const deleteItem = useCallback(async (id: string) => {
    const deletedItem = items.find((i) => i.id === id);
    // Soft delete: set deleted_at timestamp
    const { error } = await supabase
      .from("inventory_items")
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to delete item"); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    
    // Show undo toast
    toast.success("Item deleted", {
      description: deletedItem ? `${deletedItem.name} can be restored within 24 hours` : undefined,
      action: {
        label: "Undo",
        onClick: async () => {
          const { error: restoreErr } = await supabase
            .from("inventory_items")
            .update({ deleted_at: null } as any)
            .eq("id", id);
          if (restoreErr) { toast.error("Failed to restore item"); return; }
          if (deletedItem) {
            setItems((prev) => [deletedItem, ...prev]);
            toast.success("Item restored!");
          } else {
            fetchItems();
          }
        },
      },
      duration: 10000,
    });
  }, [items, fetchItems]);

  const restoreItem = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("inventory_items")
      .update({ deleted_at: null } as any)
      .eq("id", id)
      .select()
      .single();
    if (error) { toast.error("Failed to restore item"); return; }
    const restored = rowToItem(data);
    setItems((prev) => [restored, ...prev]);
    toast.success("Item restored!");
  }, []);

  const fetchDeletedItems = useCallback(async () => {
    if (!user) return [];
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false });
    return (data || []).map(rowToItem);
  }, [user]);

  const adjustQuantity = useCallback(async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    const { error } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", id);
    if (error) { toast.error("Failed to update quantity"); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: newQty } : i));
  }, [items]);

  const findDuplicateCandidate = useCallback((item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    const incomingName = normalizeInventoryName(item.name);

    return items.find((existingItem) => {
      if (normalizeInventoryName(existingItem.name) !== incomingName) return false;
      const sameHouse = (existingItem.houseId || null) === (item.houseId || null);

      return sameHouse;
    }) || null;
  }, [items]);

  return { items, loading, addItem, updateItem, deleteItem, adjustQuantity, findDuplicateCandidate, restoreItem, fetchDeletedItems };
}

export const MAIN_CATEGORIES: MainCategory[] = [
  {
    value: "hardware-tools", label: "Hardware & Tools", icon: "🔧",
    subcategories: [
      { value: "hand-tools", label: "Hand Tools" },
      { value: "power-tools", label: "Power Tools" },
      { value: "fasteners", label: "Fasteners & Nails" },
      { value: "measuring", label: "Measuring & Layout" },
      { value: "safety", label: "Safety Equipment" },
    ],
  },
  {
    value: "groceries", label: "Groceries", icon: "🛒",
    subcategories: [
      { value: "dairy", label: "Dairy & Eggs" },
      { value: "snacks", label: "Snacks" },
      { value: "beverages", label: "Beverages" },
      { value: "canned", label: "Canned Goods" },
      { value: "frozen", label: "Frozen Foods" },
      { value: "bakery", label: "Bakery & Bread" },
      { value: "condiments", label: "Condiments & Sauces" },
    ],
  },
  {
    value: "produce", label: "Produce", icon: "🥬",
    subcategories: [
      { value: "fruits", label: "Fruits" },
      { value: "vegetables", label: "Vegetables" },
      { value: "herbs", label: "Herbs & Spices" },
    ],
  },
  {
    value: "household", label: "Household", icon: "🏠",
    subcategories: [
      { value: "cleaning", label: "Cleaning Supplies" },
      { value: "kitchen", label: "Kitchen" },
      { value: "bathroom", label: "Bathroom" },
      { value: "laundry", label: "Laundry" },
      { value: "storage", label: "Storage & Organization" },
    ],
  },
  {
    value: "electrical", label: "Electrical", icon: "⚡",
    subcategories: [
      { value: "wiring", label: "Wiring & Cable" },
      { value: "lighting", label: "Lighting" },
      { value: "switches", label: "Switches & Outlets" },
      { value: "batteries", label: "Batteries" },
    ],
  },
  {
    value: "plumbing", label: "Plumbing", icon: "🚿",
    subcategories: [
      { value: "pipes", label: "Pipes & Fittings" },
      { value: "fixtures", label: "Fixtures" },
      { value: "valves", label: "Valves & Connectors" },
    ],
  },
  {
    value: "paint", label: "Paint & Finishing", icon: "🎨",
    subcategories: [
      { value: "interior-paint", label: "Interior Paint" },
      { value: "exterior-paint", label: "Exterior Paint" },
      { value: "stain", label: "Stain & Sealers" },
      { value: "brushes-rollers", label: "Brushes & Rollers" },
    ],
  },
  {
    value: "outdoor", label: "Outdoor & Garden", icon: "🌿",
    subcategories: [
      { value: "garden-tools", label: "Garden Tools" },
      { value: "seeds-plants", label: "Seeds & Plants" },
      { value: "fertilizer", label: "Fertilizer & Soil" },
      { value: "outdoor-furniture", label: "Outdoor Furniture" },
    ],
  },
  {
    value: "automotive", label: "Automotive", icon: "🚗",
    subcategories: [
      { value: "fluids", label: "Fluids & Lubricants" },
      { value: "parts", label: "Parts & Accessories" },
      { value: "car-care", label: "Car Care" },
    ],
  },
  {
    value: "medicine", label: "Medicine & Health", icon: "💊",
    subcategories: [
      { value: "prescription", label: "Prescription" },
      { value: "otc", label: "Over-the-Counter" },
      { value: "vitamins", label: "Vitamins & Supplements" },
      { value: "first-aid", label: "First Aid" },
      { value: "medical-devices", label: "Medical Devices" },
    ],
  },
  {
    value: "stationery", label: "Stationery", icon: "✏️",
    subcategories: [
      { value: "pens-pencils", label: "Pens & Pencils" },
      { value: "notebooks", label: "Notebooks & Pads" },
      { value: "paper", label: "Paper & Envelopes" },
      { value: "art-supplies", label: "Art Supplies" },
    ],
  },
  {
    value: "office-supply", label: "Office Supply", icon: "🖨️",
    subcategories: [
      { value: "desk-accessories", label: "Desk Accessories" },
      { value: "filing", label: "Filing & Folders" },
      { value: "printer-supplies", label: "Printer Supplies" },
      { value: "tech-accessories", label: "Tech Accessories" },
    ],
  },
  {
    value: "building-materials", label: "Building Materials", icon: "🧱",
    subcategories: [
      { value: "lumber", label: "Lumber & Wood" },
      { value: "concrete-masonry", label: "Concrete & Masonry" },
      { value: "bricks-blocks", label: "Bricks & Blocks" },
      { value: "drywall-insulation", label: "Drywall & Insulation" },
      { value: "roofing", label: "Roofing Materials" },
      { value: "doors-windows", label: "Doors & Windows" },
      { value: "flooring", label: "Flooring" },
      { value: "siding", label: "Siding & Cladding" },
    ],
  },
  {
    value: "other", label: "Other", icon: "📦",
    subcategories: [],
  },
];

// Flat list for backward compat in filters
export const CATEGORIES: { value: string; label: string; icon: string }[] =
  MAIN_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.icon }));

export const LOCATIONS = [
  "Garage", "Shed", "Basement", "Kitchen", "Pantry", "Bathroom", "Workshop",
  "Utility Room", "Closet", "Attic", "Refrigerator", "Freezer", "Other"
];

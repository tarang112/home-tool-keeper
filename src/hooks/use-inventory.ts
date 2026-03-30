import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type ItemCategory = "tools" | "materials" | "hardware" | "electrical" | "plumbing" | "paint" | "other" | "custom";

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  customCategory?: string;
  quantity: number;
  location: string;
  locationDetail: string;
  locationImage: string;
  notes: string;
  barcode: string;
  houseId: string | null;
  createdAt: string;
  updatedAt: string;
  sharedFromHouse?: string;
}

function rowToItem(row: any): InventoryItem {
  const rawCat = row.category as string;
  const isCustom = rawCat?.startsWith("custom:");
  return {
    id: row.id,
    name: row.name,
    category: isCustom ? "custom" as ItemCategory : rawCat as ItemCategory,
    customCategory: isCustom ? rawCat.slice(7) : undefined,
    quantity: row.quantity,
    location: row.location,
    locationDetail: row.location_detail || "",
    locationImage: row.location_image_url || "",
    notes: row.notes || "",
    barcode: row.barcode || "",
    houseId: row.house_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useInventory(houseId?: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }

    if (houseId) {
      // Fetch items that belong to this house OR are shared to this house
      const [ownedRes, sharedRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("*")
          .eq("house_id", houseId)
          .order("created_at", { ascending: false }),
        supabase
          .from("item_shares")
          .select("item_id, house_id")
          .eq("house_id", houseId),
      ]);

      let allItems = (ownedRes.data || []).map(rowToItem);

      // Fetch shared items by their IDs
      if (sharedRes.data && sharedRes.data.length > 0) {
        const sharedIds = sharedRes.data.map((s: any) => s.item_id);
        const { data: sharedItems } = await supabase
          .from("inventory_items")
          .select("*")
          .in("id", sharedIds)
          .order("created_at", { ascending: false });
        if (sharedItems) {
          const existingIds = new Set(allItems.map(i => i.id));
          // Look up source house name for shared items
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
      // Show ALL items: personal + owned houses + shared items
      const { data: ownedItems, error: ownedErr } = await supabase
        .from("inventory_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (ownedErr) {
        toast.error("Failed to load items");
        console.error(ownedErr);
      } else {
        let allItems = (ownedItems || []).map(rowToItem);

        // Also fetch items shared to any of the user's houses
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
              .in("id", missingIds);
            if (sharedItems) {
              allItems = [...allItems, ...sharedItems.map(rowToItem)];
            }
          }
        }

        setItems(allItems);
      }
    }
    setLoading(false);
  }, [user, houseId]);

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
    const { data } = supabase.storage.from("inventory-images").getPublicUrl(path);
    return data.publicUrl;
  }, [user]);

  const addItem = useCallback(async (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    if (!user) return;
    let imageUrl = "";
    if (item.locationImage) {
      imageUrl = await uploadImage(item.locationImage);
    }
    const { data, error } = await supabase.from("inventory_items").insert({
      user_id: user.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      location: item.location,
      location_detail: item.locationDetail,
      location_image_url: imageUrl,
      notes: item.notes,
      barcode: item.barcode || "",
      house_id: item.houseId || null,
    }).select().single();
    if (error) { toast.error("Failed to add item"); return; }
    setItems((prev) => [rowToItem(data), ...prev]);
    toast.success("Item added!");
  }, [user, uploadImage]);

  const updateItem = useCallback(async (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.locationDetail !== undefined) dbUpdates.location_detail = updates.locationDetail;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
    if (updates.houseId !== undefined) dbUpdates.house_id = updates.houseId || null;
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
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) { toast.error("Failed to delete item"); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Item deleted");
  }, []);

  const adjustQuantity = useCallback(async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    const { error } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", id);
    if (error) { toast.error("Failed to update quantity"); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: newQty } : i));
  }, [items]);

  return { items, loading, addItem, updateItem, deleteItem, adjustQuantity };
}

export const CATEGORIES: { value: ItemCategory; label: string; icon: string }[] = [
  { value: "tools", label: "Tools", icon: "🔧" },
  { value: "materials", label: "Materials", icon: "🪵" },
  { value: "hardware", label: "Hardware", icon: "🔩" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "plumbing", label: "Plumbing", icon: "🔧" },
  { value: "paint", label: "Paint", icon: "🎨" },
  { value: "other", label: "Other", icon: "📦" },
];

export const LOCATIONS = [
  "Garage", "Shed", "Basement", "Kitchen", "Bathroom", "Workshop",
  "Utility Room", "Closet", "Attic", "Other"
];

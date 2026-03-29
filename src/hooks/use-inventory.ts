import { useState, useCallback, useEffect } from "react";

export type ItemCategory = "tools" | "materials" | "hardware" | "electrical" | "plumbing" | "paint" | "other";

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  location: string;
  locationDetail: string;
  locationImage: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "household-inventory";
const DB_NAME = "inventory-images";
const STORE_NAME = "images";

// IndexedDB helpers for images
function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveImage(id: string, data: string) {
  const db = await openImageDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(data, id);
}

async function loadImage(id: string): Promise<string> {
  const db = await openImageDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve((req.result as string) || "");
    req.onerror = () => resolve("");
  });
}

async function deleteImage(id: string) {
  const db = await openImageDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
}

function loadItems(): InventoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveItems(items: InventoryItem[]) {
  // Strip locationImage from localStorage — images live in IndexedDB
  const stripped = items.map(({ locationImage: _, ...rest }) => ({ ...rest, locationImage: "" }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
  } catch {
    // quota still exceeded — shouldn't happen without images
  }
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(loadItems);

  // Hydrate images from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const loaded = loadItems();
      const hydrated = await Promise.all(
        loaded.map(async (item) => {
          const img = await loadImage(item.id);
          return { ...item, locationImage: img };
        })
      );
      if (!cancelled) setItems(hydrated);
    }
    hydrate();
    return () => { cancelled = true; };
  }, []);

  const addItem = useCallback((item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    if (newItem.locationImage) {
      saveImage(newItem.id, newItem.locationImage);
    }
    setItems((prev) => {
      const updated = [newItem, ...prev];
      saveItems(updated);
      return updated;
    });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => {
    if (updates.locationImage !== undefined) {
      if (updates.locationImage) {
        saveImage(id, updates.locationImage);
      } else {
        deleteImage(id);
      }
    }
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      );
      saveItems(updated);
      return updated;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    deleteImage(id);
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveItems(updated);
      return updated;
    });
  }, []);

  const adjustQuantity = useCallback((id: string, delta: number) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta), updatedAt: new Date().toISOString() }
          : item
      );
      saveItems(updated);
      return updated;
    });
  }, []);

  return { items, addItem, updateItem, deleteItem, adjustQuantity };
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

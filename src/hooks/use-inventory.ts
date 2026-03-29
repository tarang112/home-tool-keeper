import { useState, useCallback } from "react";

export type ItemCategory = "tools" | "materials" | "hardware" | "electrical" | "plumbing" | "paint" | "other";

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "household-inventory";

function loadItems(): InventoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveItems(items: InventoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(loadItems);

  const addItem = useCallback((item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setItems((prev) => {
      const updated = [newItem, ...prev];
      saveItems(updated);
      return updated;
    });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => {
    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      );
      saveItems(updated);
      return updated;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
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

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
}

export interface CustomLocation {
  id: string;
  name: string;
  propertyType: string;
}

export function useCustomOptions(propertyType: string = "personal") {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [allCustomLocations, setAllCustomLocations] = useState<CustomLocation[]>([]);

  const customLocations = allCustomLocations.filter(l => l.propertyType === propertyType);

  const fetchOptions = useCallback(async () => {
    if (!user) return;
    const [catRes, locRes] = await Promise.all([
      supabase.from("custom_categories").select("*").order("name"),
      supabase.from("custom_locations").select("*").order("name"),
    ]);
    if (catRes.data) setCustomCategories(catRes.data.map((c: any) => ({ id: c.id, name: c.name, icon: c.icon || "📦" })));
    if (locRes.data) setAllCustomLocations(locRes.data.map((l: any) => ({ id: l.id, name: l.name, propertyType: l.property_type || "personal" })));
  }, [user]);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const addCategory = useCallback(async (name: string, icon = "📦") => {
    if (!user || !name.trim()) return;
    const { data, error } = await supabase.from("custom_categories").insert({ user_id: user.id, name: name.trim(), icon }).select().single();
    if (error) {
      if (error.code === "23505") { toast.info("Category already exists"); return; }
      toast.error("Failed to add category"); return;
    }
    setCustomCategories(prev => [...prev, { id: data.id, name: data.name, icon: data.icon }]);
    toast.success("Category added");
  }, [user]);

  const updateCategory = useCallback(async (id: string, name: string, icon: string) => {
    const { error } = await supabase.from("custom_categories").update({ name, icon }).eq("id", id);
    if (error) { toast.error("Failed to update category"); return; }
    setCustomCategories(prev => prev.map(c => c.id === id ? { ...c, name, icon } : c));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from("custom_categories").delete().eq("id", id);
    if (error) { toast.error("Failed to delete category"); return; }
    setCustomCategories(prev => prev.filter(c => c.id !== id));
    toast.success("Category deleted");
  }, []);

  const addLocation = useCallback(async (name: string) => {
    if (!user || !name.trim()) return;
    const { data, error } = await supabase.from("custom_locations").insert({ user_id: user.id, name: name.trim(), property_type: propertyType } as any).select().single();
    if (error) {
      if (error.code === "23505") { toast.info("Location already exists"); return; }
      toast.error("Failed to add location"); return;
    }
    setAllCustomLocations(prev => [...prev, { id: data.id, name: data.name, propertyType }]);
    toast.success("Location added");
  }, [user, propertyType]);

  const updateLocation = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from("custom_locations").update({ name }).eq("id", id);
    if (error) { toast.error("Failed to update location"); return; }
    setAllCustomLocations(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  }, []);

  const deleteLocation = useCallback(async (id: string) => {
    const { error } = await supabase.from("custom_locations").delete().eq("id", id);
    if (error) { toast.error("Failed to delete location"); return; }
    setAllCustomLocations(prev => prev.filter(l => l.id !== id));
    toast.success("Location deleted");
  }, []);

  const ensureCategory = useCallback(async (name: string, icon = "📦") => {
    if (!user || !name.trim()) return;
    if (customCategories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) return;
    await addCategory(name, icon);
  }, [user, customCategories, addCategory]);

  const ensureLocation = useCallback(async (name: string) => {
    if (!user || !name.trim()) return;
    if (customLocations.some(l => l.name.toLowerCase() === name.trim().toLowerCase())) return;
    await addLocation(name);
  }, [user, customLocations, addLocation]);

  return {
    customCategories, customLocations,
    addCategory, updateCategory, deleteCategory,
    addLocation, updateLocation, deleteLocation,
    ensureCategory, ensureLocation,
  };
}

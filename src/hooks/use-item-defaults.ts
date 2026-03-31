import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useItemDefaults() {
  const { user } = useAuth();

  const saveDefaults = useCallback(
    async (itemName: string, defaults: {
      category?: string;
      subcategory?: string;
      location?: string;
      quantityUnit?: string;
    }) => {
      if (!user || !itemName) return;
      const normalized = itemName.trim().toLowerCase();
      await (supabase as any)
        .from("item_defaults")
        .upsert(
          {
            user_id: user.id,
            item_name: normalized,
            category: defaults.category || null,
            subcategory: defaults.subcategory || null,
            location: defaults.location || null,
            quantity_unit: defaults.quantityUnit || "pcs",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,item_name" }
        );
    },
    [user]
  );

  const getDefaults = useCallback(
    async (itemName: string) => {
      if (!user || !itemName) return null;
      const normalized = itemName.trim().toLowerCase();
      const { data } = await (supabase as any)
        .from("item_defaults")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_name", normalized)
        .maybeSingle();
      return data;
    },
    [user]
  );

  return { saveDefaults, getDefaults };
}

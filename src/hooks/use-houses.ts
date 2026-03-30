import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
...
export function useHouses() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const hasAutoSelectedHouse = useRef(false);

  const fetchHouses = useCallback(async () => {
    if (!user) {
      setHouses([]);
      setSelectedHouseId(null);
      hasAutoSelectedHouse.current = false;
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Failed to load houses");
    } else {
      const mapped = (data || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        ownerId: h.owner_id,
        createdAt: h.created_at,
        propertyType: h.property_type || "personal",
        businessType: h.business_type || undefined,
      }));

      setHouses(mapped);
      setSelectedHouseId((current) => {
        if (current && mapped.some((house) => house.id === current)) return current;
        if (!hasAutoSelectedHouse.current && mapped.length > 0) {
          hasAutoSelectedHouse.current = true;
          return mapped[0].id;
        }
        return current;
      });
    }

    setLoading(false);
  }, [user]);
...
  useEffect(() => { fetchHouses(); }, [fetchHouses]);
...
  return {
    houses,
    selectedHouseId,
    selectedHouse,
    setSelectedHouseId,
    members,
    pendingInvites,
    loading,
    isOwner,
    createHouse,
    renameHouse,
    deleteHouse,
    inviteMember,
    createInviteLink,
    cancelInvite,
    removeMember,
  };
}

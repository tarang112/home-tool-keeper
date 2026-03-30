import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface House {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface HouseMember {
  id: string;
  houseId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  displayName?: string;
  email?: string;
}

export function useHouses() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHouses = useCallback(async () => {
    if (!user) { setHouses([]); setLoading(false); return; }
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
      }));
      setHouses(mapped);
    }
    setLoading(false);
  }, [user, selectedHouseId]);

  useEffect(() => { fetchHouses(); }, [fetchHouses]);

  const fetchMembers = useCallback(async (houseId: string) => {
    const { data, error } = await supabase
      .from("house_members")
      .select("*")
      .eq("house_id", houseId);
    if (error) {
      console.error(error);
      return;
    }
    // Fetch display names from profiles separately
    const userIds = (data || []).map((m: any) => m.user_id);
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);
      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap[p.user_id] = p.display_name || p.email || "Unknown";
        });
      }
    }
    setMembers((data || []).map((m: any) => ({
      id: m.id,
      houseId: m.house_id,
      userId: m.user_id,
      role: m.role,
      displayName: profileMap[m.user_id] || undefined,
    })));
  }, []);

  useEffect(() => {
    if (selectedHouseId) fetchMembers(selectedHouseId);
    else setMembers([]);
  }, [selectedHouseId, fetchMembers]);

  const createHouse = useCallback(async (name: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("houses")
      .insert({ name, owner_id: user.id })
      .select()
      .single();
    if (error) { toast.error("Failed to create house"); return; }

    // Add self as owner member
    await supabase.from("house_members").insert({
      house_id: data.id,
      user_id: user.id,
      role: "owner",
    });

    const house: House = { id: data.id, name: data.name, ownerId: data.owner_id, createdAt: data.created_at };
    setHouses((prev) => [...prev, house]);
    setSelectedHouseId(data.id);
    toast.success(`"${name}" created!`);
  }, [user]);

  const deleteHouse = useCallback(async (houseId: string) => {
    const { error } = await supabase.from("houses").delete().eq("id", houseId);
    if (error) { toast.error("Failed to delete house"); return; }
    setHouses((prev) => prev.filter((h) => h.id !== houseId));
    if (selectedHouseId === houseId) {
      setSelectedHouseId(null);
    }
    toast.success("House deleted");
  }, [selectedHouseId]);

  const inviteMember = useCallback(async (houseId: string, email: string, role: "editor" | "viewer" = "editor") => {
    // Look up user by email in profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("email", email.trim().toLowerCase());

    if (profileError || !profiles || profiles.length === 0) {
      toast.error("No user found with that email. They need to sign up first.");
      return;
    }

    const targetUserId = profiles[0].user_id;

    // Check if already a member
    const { data: existing } = await supabase
      .from("house_members")
      .select("id")
      .eq("house_id", houseId)
      .eq("user_id", targetUserId);

    if (existing && existing.length > 0) {
      toast.error("This user is already a member");
      return;
    }

    const { error } = await supabase.from("house_members").insert({
      house_id: houseId,
      user_id: targetUserId,
      role,
    });

    if (error) { toast.error("Failed to add member"); return; }
    toast.success("Member added!");
    fetchMembers(houseId);
  }, [fetchMembers]);

  const removeMember = useCallback(async (memberId: string, houseId: string) => {
    const { error } = await supabase.from("house_members").delete().eq("id", memberId);
    if (error) { toast.error("Failed to remove member"); return; }
    toast.success("Member removed");
    fetchMembers(houseId);
  }, [fetchMembers]);

  const selectedHouse = houses.find((h) => h.id === selectedHouseId) || null;
  const isOwner = selectedHouse ? selectedHouse.ownerId === user?.id : false;

  return {
    houses,
    selectedHouseId,
    selectedHouse,
    setSelectedHouseId,
    members,
    loading,
    isOwner,
    createHouse,
    deleteHouse,
    inviteMember,
    removeMember,
  };
}

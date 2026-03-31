import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface House {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  propertyType: "personal" | "business";
  businessType?: string;
  imageUrl?: string;
}

export interface HouseMember {
  id: string;
  houseId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  relationship?: string;
  shareMode?: "full" | "selected";
  displayName?: string;
  email?: string;
}

export interface PendingInvite {
  id: string;
  houseId: string;
  email: string;
  role: string;
  relationship?: string;
  shareMode?: string;
  status: string;
  createdAt: string;
  inviteToken: string;
}

export const PERSONAL_RELATIONSHIPS = [
  "Household", "Family", "Friend", "Neighbor", "Colleague", "Contractor", "Other"
];

export const BUSINESS_RELATIONSHIPS = [
  "Owner", "Manager", "Employee", "Contractor", "Vendor", "Supplier", "Consultant", "Partner", "Other"
];

export const RELATIONSHIPS = PERSONAL_RELATIONSHIPS;

const supabaseRpc = supabase.rpc.bind(supabase) as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: any; error: any }>;

export function useHouses() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultHouseId, setDefaultHouseId] = useState<string | null>(null);
  const hasAutoSelectedHouse = useRef(false);

  const fetchHouses = useCallback(async () => {
    if (!user) {
      setHouses([]);
      setSelectedHouseId(null);
      hasAutoSelectedHouse.current = false;
      setLoading(false);
      return;
    }

    // Load default house preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_house_id")
      .eq("user_id", user.id)
      .single();

    const savedDefault = profile?.default_house_id ?? null;
    console.log("[useHouses] default_house_id from profile:", savedDefault);
    setDefaultHouseId(savedDefault);

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
        imageUrl: h.image_url || undefined,
      }));

      setHouses(mapped);
      setSelectedHouseId((current) => {
        if (current === "all-personal" || current === "all-business") return current;

        if (mapped.length === 0) {
          hasAutoSelectedHouse.current = false;
          return "all-personal";
        }

        if (current && mapped.some((house) => house.id === current)) {
          return current;
        }

        if (!hasAutoSelectedHouse.current) {
          hasAutoSelectedHouse.current = true;
          // Use saved default if it exists in the list
          if (savedDefault && mapped.some((h) => h.id === savedDefault)) {
            return savedDefault;
          }
          return "all-personal";
        }

        return "all-personal";
      });
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHouses();
  }, [fetchHouses]);

  const fetchMembers = useCallback(async (houseId: string) => {
    const { data, error } = await supabase
      .from("house_members")
      .select("*")
      .eq("house_id", houseId);

    if (error) {
      console.error(error);
      return;
    }

    const userIds = (data || []).map((m: any) => m.user_id);
    let profileMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseRpc("get_house_member_profiles", {
        _house_id: houseId,
      });

      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap[p.user_id] = p.display_name || "Member";
        });
      }
    }

    setMembers((data || []).map((m: any) => ({
      id: m.id,
      houseId: m.house_id,
      userId: m.user_id,
      role: m.role,
      relationship: m.relationship || "Household",
      shareMode: m.share_mode || "full",
      displayName: profileMap[m.user_id] || undefined,
    })));

    const { data: invites } = await supabase
      .from("house_invites")
      .select("*")
      .eq("house_id", houseId)
      .eq("status", "pending");

    setPendingInvites((invites || []).map((inv: any) => ({
      id: inv.id,
      houseId: inv.house_id,
      email: inv.email,
      role: inv.role,
      relationship: inv.relationship,
      shareMode: inv.share_mode,
      status: inv.status,
      createdAt: inv.created_at,
      inviteToken: inv.invite_token,
    })));
  }, []);

  useEffect(() => {
    if (selectedHouseId && !selectedHouseId.startsWith("all-")) {
      fetchMembers(selectedHouseId);
    } else {
      setMembers([]);
      setPendingInvites([]);
    }
  }, [selectedHouseId, fetchMembers]);

  const createHouse = useCallback(async (name: string, propertyType: "personal" | "business" = "personal", businessType?: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("houses")
      .insert({ name, owner_id: user.id, property_type: propertyType, business_type: businessType || null } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to create house");
      return;
    }

    await supabase.from("house_members").insert({
      house_id: data.id,
      user_id: user.id,
      role: "owner",
    });

    const house: House = {
      id: data.id,
      name: data.name,
      ownerId: data.owner_id,
      createdAt: data.created_at,
      propertyType: (data as any).property_type || "personal",
      businessType: (data as any).business_type || undefined,
      imageUrl: (data as any).image_url || undefined,
    };

    hasAutoSelectedHouse.current = true;
    setHouses((prev) => [...prev, house]);
    setSelectedHouseId(data.id);
    toast.success(`"${name}" created!`);
  }, [user]);

  const renameHouse = useCallback(async (houseId: string, newName: string) => {
    if (!newName.trim()) return;

    const { error } = await supabase.from("houses").update({ name: newName.trim() }).eq("id", houseId);
    if (error) {
      toast.error("Failed to rename");
      return;
    }

    setHouses((prev) => prev.map((h) => h.id === houseId ? { ...h, name: newName.trim() } : h));
    toast.success("Renamed successfully");
  }, []);

  const uploadHouseImage = useCallback(async (houseId: string, file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `houses/${houseId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("inventory-images").upload(path, file);
    if (uploadError) {
      toast.error("Image upload failed");
      return null;
    }
    const { data: urlData } = supabase.storage.from("inventory-images").getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    const { error } = await supabase.from("houses").update({ image_url: imageUrl } as any).eq("id", houseId);
    if (error) {
      toast.error("Failed to save image");
      return null;
    }

    setHouses((prev) => prev.map((h) => h.id === houseId ? { ...h, imageUrl } : h));
    toast.success("Image updated!");
    return imageUrl;
  }, [user]);

  const removeHouseImage = useCallback(async (houseId: string) => {
    const { error } = await supabase.from("houses").update({ image_url: null } as any).eq("id", houseId);
    if (error) {
      toast.error("Failed to remove image");
      return;
    }
    setHouses((prev) => prev.map((h) => h.id === houseId ? { ...h, imageUrl: undefined } : h));
    toast.success("Image removed");
  }, []);

  const deleteHouse = useCallback(async (houseId: string) => {
    const { error } = await supabase.from("houses").delete().eq("id", houseId);
    if (error) {
      toast.error("Failed to delete house");
      return;
    }

    setHouses((prev) => prev.filter((h) => h.id !== houseId));
    if (selectedHouseId === houseId) {
      setSelectedHouseId(null);
    }
    toast.success("House deleted");
  }, [selectedHouseId]);

  const inviteMember = useCallback(async (
    houseId: string,
    email: string,
    role: "editor" | "viewer" = "editor",
    relationship: string = "Household",
    shareMode: "full" | "selected" = "full"
  ) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { data: profiles, error: profileError } = await supabaseRpc("find_house_invitable_user", {
      _house_id: houseId,
      _email: normalizedEmail,
    });

    if (profileError || !profiles || profiles.length === 0) {
      const { error: inviteError } = await supabase
        .from("house_invites")
        .insert({
          house_id: houseId,
          email: normalizedEmail,
          role,
          relationship,
          share_mode: shareMode,
          invited_by: user!.id,
        } as any);

      if (inviteError) {
        if (inviteError.code === "23505") {
          toast.error("An invite for this email already exists");
        } else {
          toast.error("Failed to create invite");
        }
        return;
      }

      toast.success(`Invite sent to ${normalizedEmail}. They'll be added automatically when they sign up.`);
      fetchMembers(houseId);
      return;
    }

    const targetUserId = profiles[0].user_id;

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
      relationship,
      share_mode: shareMode,
    });

    if (error) {
      toast.error("Failed to add member");
      return;
    }

    toast.success("Member added!");
    fetchMembers(houseId);
  }, [user, fetchMembers]);

  const cancelInvite = useCallback(async (inviteId: string, houseId: string) => {
    const { error } = await supabase.from("house_invites").delete().eq("id", inviteId);
    if (error) {
      toast.error("Failed to cancel invite");
      return;
    }

    toast.success("Invite cancelled");
    fetchMembers(houseId);
  }, [fetchMembers]);

  const createInviteLink = useCallback(async (
    houseId: string,
    role: "editor" | "viewer" = "editor",
    relationship: string = "Household",
    shareMode: "full" | "selected" = "full"
  ): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("house_invites")
      .insert({
        house_id: houseId,
        email: `link-invite-${Date.now()}@invite.local`,
        role,
        relationship,
        share_mode: shareMode,
        invited_by: user.id,
      } as any)
      .select("invite_token")
      .single();

    if (error) {
      toast.error("Failed to create invite link");
      return null;
    }

    fetchMembers(houseId);
    return `${window.location.origin}/accept-invite?token=${data.invite_token}`;
  }, [user, fetchMembers]);

  const removeMember = useCallback(async (memberId: string, houseId: string) => {
    const { error } = await supabase.from("house_members").delete().eq("id", memberId);
    if (error) {
      toast.error("Failed to remove member");
      return;
    }

    toast.success("Member removed");
    fetchMembers(houseId);
  }, [fetchMembers]);

  const setDefaultHouse = useCallback(async (houseId: string | null) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ default_house_id: houseId } as any)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to set default");
      return;
    }
    setDefaultHouseId(houseId);
    // Also switch to the selected default now
    if (houseId) {
      setSelectedHouseId(houseId);
    }
    toast.success(houseId ? "Default location set" : "Default location cleared");
  }, [user]);

  const selectedHouse = houses.find((h) => h.id === selectedHouseId) || null;
  const isOwner = selectedHouse ? selectedHouse.ownerId === user?.id : false;

  return {
    houses,
    selectedHouseId,
    selectedHouse,
    setSelectedHouseId,
    members,
    pendingInvites,
    loading,
    isOwner,
    defaultHouseId,
    setDefaultHouse,
    createHouse,
    renameHouse,
    deleteHouse,
    inviteMember,
    createInviteLink,
    cancelInvite,
    removeMember,
    uploadHouseImage,
    removeHouseImage,
  };
}

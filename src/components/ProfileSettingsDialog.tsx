import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Trash2, Save, Loader2, Bell, Mail, Smartphone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { House } from "@/hooks/use-houses";

const REMINDER_DAY_OPTIONS = [30, 14, 7, 3, 1, 0] as const;
const DEFAULT_REMINDER_DAYS: number[] = [30, 14, 7, 3, 1, 0];

const dayLabel = (d: number) => (d === 0 ? "On expiry day" : `${d} day${d === 1 ? "" : "s"} before`);

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  houses: House[];
  defaultHouseId: string | null;
  onSetDefaultHouse: (houseId: string | null) => Promise<void>;
}

export function ProfileSettingsDialog({ open, onOpenChange, houses, defaultHouseId, onSetDefaultHouse }: ProfileSettingsDialogProps) {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedDefault, setSelectedDefault] = useState<string>("none");
  const [warrantyInApp, setWarrantyInApp] = useState(true);
  const [warrantyEmail, setWarrantyEmail] = useState(false);
  const [warrantyPush, setWarrantyPush] = useState(false);
  const [reminderDays, setReminderDays] = useState<number[]>(DEFAULT_REMINDER_DAYS);

  const remindersEnabled = reminderDays.length > 0;
  const toggleDay = (d: number, checked: boolean) => {
    setReminderDays((prev) => (checked ? [...new Set([...prev, d])] : prev.filter((x) => x !== d)));
  };

  useEffect(() => {
    if (open && user) {
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.display_name) setDisplayName(data.display_name);
          else setDisplayName(user.email ?? "");
        });

      supabase
        .from("notification_preferences" as any)
        .select("warranty_in_app, warranty_email, warranty_push, warranty_reminder_days")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) {
            setWarrantyInApp(!!data.warranty_in_app);
            setWarrantyEmail(!!data.warranty_email);
            setWarrantyPush(!!data.warranty_push);
            if (Array.isArray(data.warranty_reminder_days)) {
              setReminderDays(data.warranty_reminder_days as number[]);
            }
          }
        });

      setSelectedDefault(defaultHouseId ?? "none");
    }
  }, [open, user, defaultHouseId]);

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setLoading(true);

    const newDefault = selectedDefault === "none" ? null : selectedDefault;

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() } as any)
      .eq("user_id", user.id);

    if (error) {
      setLoading(false);
      toast.error("Failed to update profile");
      return;
    }

    const { error: prefError } = await supabase
      .from("notification_preferences" as any)
      .upsert(
        {
          user_id: user.id,
          warranty_in_app: warrantyInApp,
          warranty_email: warrantyEmail,
          warranty_push: warrantyPush,
          warranty_reminder_days: reminderDays,
        },
        { onConflict: "user_id" }
      );

    if (prefError) {
      setLoading(false);
      toast.error("Failed to save notification preferences");
      return;
    }

    if (newDefault !== defaultHouseId) {
      await onSetDefaultHouse(newDefault);
    }

    setLoading(false);
    toast.success("Profile updated");
    onOpenChange(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      toast.success("Account deleted");
      await signOut();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="opacity-70" />
          </div>

          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label>Default Location on Login</Label>
            <Select value={selectedDefault} onValueChange={setSelectedDefault}>
              <SelectTrigger>
                <SelectValue placeholder="Select default location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Personal (no default)</SelectItem>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.propertyType === "business" ? "🏢" : "🏠"} {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">This location will be selected automatically when you sign in.</p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div>
              <Label className="text-base">Warranty Reminders</Label>
              <p className="text-xs text-muted-foreground mt-1">Choose how you want to be alerted before warranties expire.</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="warranty-in-app" className="cursor-pointer">In-app notifications</Label>
              </div>
              <Switch id="warranty-in-app" checked={warrantyInApp} onCheckedChange={setWarrantyInApp} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="warranty-email" className="cursor-pointer">Email</Label>
              </div>
              <Switch id="warranty-email" checked={warrantyEmail} onCheckedChange={setWarrantyEmail} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="warranty-push" className="cursor-pointer">Push notifications</Label>
              </div>
              <Switch id="warranty-push" checked={warrantyPush} onCheckedChange={setWarrantyPush} />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between gap-3">
                <Label className="cursor-pointer">Send reminders</Label>
                <Switch
                  checked={remindersEnabled}
                  onCheckedChange={(on) => setReminderDays(on ? DEFAULT_REMINDER_DAYS : [])}
                />
              </div>
              {remindersEnabled ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">When to remind you:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {REMINDER_DAY_OPTIONS.map((d) => {
                      const checked = reminderDays.includes(d);
                      return (
                        <label
                          key={d}
                          htmlFor={`reminder-day-${d}`}
                          className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                        >
                          <Checkbox
                            id={`reminder-day-${d}`}
                            checked={checked}
                            onCheckedChange={(c) => toggleDay(d, !!c)}
                          />
                          <span className="text-sm">{dayLabel(d)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Warranty reminders are turned off.</p>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>

          <div className="border-t pt-4 mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2">
                  <Trash2 className="h-4 w-4" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all your data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting..." : "Yes, delete my account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

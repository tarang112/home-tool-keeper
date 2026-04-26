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

const WARRANTY_REMINDER_DAY_OPTIONS = [30, 14, 7, 3, 1, 0] as const;
const EXPIRATION_REMINDER_DAY_OPTIONS = [7, 3, 1, 0] as const;
const DEFAULT_WARRANTY_REMINDER_DAYS: number[] = [30, 14, 7, 3, 1, 0];
const DEFAULT_EXPIRATION_REMINDER_DAYS: number[] = [7, 3, 1, 0];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "hi", label: "हिन्दी" },
] as const;

const dayLabel = (d: number) => (d === 0 ? "On due day" : `${d} day${d === 1 ? "" : "s"} before`);

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
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [receiptEmail, setReceiptEmail] = useState("");
  const [orderConfirmationEmail, setOrderConfirmationEmail] = useState("");
  const [receiptFromName, setReceiptFromName] = useState("HomeStock Receipts");
  const [orderConfirmationFromName, setOrderConfirmationFromName] = useState("HomeStock Orders");
  const [warrantyInApp, setWarrantyInApp] = useState(true);
  const [warrantyEmail, setWarrantyEmail] = useState(false);
  const [warrantyPush, setWarrantyPush] = useState(false);
  const [warrantyReminderDays, setWarrantyReminderDays] = useState<number[]>(DEFAULT_WARRANTY_REMINDER_DAYS);
  const [restockInApp, setRestockInApp] = useState(true);
  const [restockEmail, setRestockEmail] = useState(false);
  const [restockPush, setRestockPush] = useState(false);
  const [expirationInApp, setExpirationInApp] = useState(true);
  const [expirationEmail, setExpirationEmail] = useState(false);
  const [expirationPush, setExpirationPush] = useState(false);
  const [expirationReminderDays, setExpirationReminderDays] = useState<number[]>(DEFAULT_EXPIRATION_REMINDER_DAYS);

  const warrantyRemindersEnabled = warrantyReminderDays.length > 0;
  const expirationRemindersEnabled = expirationReminderDays.length > 0;
  const toggleWarrantyDay = (d: number, checked: boolean) => {
    setWarrantyReminderDays((prev) => (checked ? [...new Set([...prev, d])] : prev.filter((x) => x !== d)));
  };
  const toggleExpirationDay = (d: number, checked: boolean) => {
    setExpirationReminderDays((prev) => (checked ? [...new Set([...prev, d])] : prev.filter((x) => x !== d)));
  };

  const enableMobileAlerts = async (setter: (enabled: boolean) => void) => {
    if (!("Notification" in window)) {
      toast.error("Mobile alerts are not supported on this device");
      setter(false);
      return;
    }
    if (Notification.permission === "granted") {
      setter(true);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") setter(true);
    else {
      setter(false);
      toast.error("Enable notification permission to use mobile alerts");
    }
  };

  const setMobileAlert = (setter: (enabled: boolean) => void) => (enabled: boolean) => {
    if (enabled) void enableMobileAlerts(setter);
    else setter(false);
  };

  useEffect(() => {
    if (open && user) {
      supabase
        .from("profiles")
        .select("display_name, preferred_language")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.display_name) setDisplayName(data.display_name);
          else setDisplayName(user.email ?? "");
          setPreferredLanguage((data as any)?.preferred_language || "en");
        });

      supabase
        .from("notification_preferences" as any)
        .select("warranty_in_app, warranty_email, warranty_push, warranty_reminder_days, restock_in_app, restock_email, restock_push, expiration_in_app, expiration_email, expiration_push, expiration_reminder_days")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) {
            setWarrantyInApp(!!data.warranty_in_app);
            setWarrantyEmail(!!data.warranty_email);
            setWarrantyPush(!!data.warranty_push);
            setRestockInApp(data.restock_in_app ?? true);
            setRestockEmail(!!data.restock_email);
            setRestockPush(!!data.restock_push);
            setExpirationInApp(data.expiration_in_app ?? true);
            setExpirationEmail(!!data.expiration_email);
            setExpirationPush(!!data.expiration_push);
            if (Array.isArray(data.warranty_reminder_days)) setWarrantyReminderDays(data.warranty_reminder_days as number[]);
            if (Array.isArray(data.expiration_reminder_days)) setExpirationReminderDays(data.expiration_reminder_days as number[]);
          }
        });

      supabase
        .from("billing_preferences" as any)
        .select("receipt_email, order_confirmation_email, receipt_from_name, order_confirmation_from_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          setReceiptEmail(data?.receipt_email || "");
          setOrderConfirmationEmail(data?.order_confirmation_email || "");
          setReceiptFromName(data?.receipt_from_name || "HomeStock Receipts");
          setOrderConfirmationFromName(data?.order_confirmation_from_name || "HomeStock Orders");
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
      .update({ display_name: displayName.trim(), preferred_language: preferredLanguage } as any)
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
          warranty_reminder_days: warrantyReminderDays,
          restock_in_app: restockInApp,
          restock_email: restockEmail,
          restock_push: restockPush,
          expiration_in_app: expirationInApp,
          expiration_email: expirationEmail,
          expiration_push: expirationPush,
          expiration_reminder_days: expirationReminderDays,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
        { onConflict: "user_id" }
      );

    if (prefError) {
      setLoading(false);
      toast.error("Failed to save notification preferences");
      return;
    }

    const normalizedReceiptEmail = receiptEmail.trim();
    const normalizedOrderConfirmationEmail = orderConfirmationEmail.trim();
    const normalizedReceiptFromName = receiptFromName.trim();
    const normalizedOrderFromName = orderConfirmationFromName.trim();
    const { error: billingError } = await supabase
      .from("billing_preferences" as any)
      .upsert(
        {
          user_id: user.id,
          receipt_email: normalizedReceiptEmail || null,
          order_confirmation_email: normalizedOrderConfirmationEmail || null,
          receipt_from_name: normalizedReceiptFromName || null,
          order_confirmation_from_name: normalizedOrderFromName || null,
        },
        { onConflict: "user_id" }
      );

    if (billingError) {
      setLoading(false);
      toast.error("Failed to save receipt email");
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

          <div className="space-y-2">
            <Label>Email Language</Label>
            <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select email language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Auth emails will use this language when available.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-email">Receipt Email</Label>
            <Input
              id="receipt-email"
              type="email"
              value={receiptEmail}
              onChange={(e) => setReceiptEmail(e.target.value)}
              placeholder={user?.email ?? "receipts@example.com"}
            />
            <p className="text-xs text-muted-foreground">Checkout and order receipts can be sent here instead of your sign-in email.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-from-name">Receipt From Name</Label>
            <Input
              id="receipt-from-name"
              maxLength={80}
              value={receiptFromName}
              onChange={(e) => setReceiptFromName(e.target.value)}
              placeholder="HomeStock Receipts"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-confirmation-email">Order Confirmation Email</Label>
            <Input
              id="order-confirmation-email"
              type="email"
              value={orderConfirmationEmail}
              onChange={(e) => setOrderConfirmationEmail(e.target.value)}
              placeholder={receiptEmail || user?.email || "orders@example.com"}
            />
            <p className="text-xs text-muted-foreground">Order confirmation messages can be sent here separately from receipts.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-confirmation-from-name">Order Confirmation From Name</Label>
            <Input
              id="order-confirmation-from-name"
              maxLength={80}
              value={orderConfirmationFromName}
              onChange={(e) => setOrderConfirmationFromName(e.target.value)}
              placeholder="HomeStock Orders"
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="space-y-3">
              <div>
                <Label className="text-base">Restock Reminders</Label>
                <p className="text-xs text-muted-foreground mt-1">Choose how you want to be alerted when tracked items run out.</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="restock-in-app" className="cursor-pointer">In-app notifications</Label>
                </div>
                <Switch id="restock-in-app" checked={restockInApp} onCheckedChange={setRestockInApp} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="restock-email" className="cursor-pointer">Restock email alerts</Label>
                </div>
                <Switch id="restock-email" checked={restockEmail} onCheckedChange={setRestockEmail} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="restock-push" className="cursor-pointer">Mobile alerts</Label>
                </div>
                <Switch id="restock-push" checked={restockPush} onCheckedChange={setMobileAlert(setRestockPush)} />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div>
                <Label className="text-base">Expiration Reminders</Label>
                <p className="text-xs text-muted-foreground mt-1">Choose how you want to be alerted before item expiration dates.</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="expiration-in-app" className="cursor-pointer">In-app notifications</Label>
                </div>
                <Switch id="expiration-in-app" checked={expirationInApp} onCheckedChange={setExpirationInApp} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="expiration-email" className="cursor-pointer">Expiration email alerts</Label>
                </div>
                <Switch id="expiration-email" checked={expirationEmail} onCheckedChange={setExpirationEmail} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="expiration-push" className="cursor-pointer">Mobile alerts</Label>
                </div>
                <Switch id="expiration-push" checked={expirationPush} onCheckedChange={setMobileAlert(setExpirationPush)} />
              </div>
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between gap-3">
                  <Label className="cursor-pointer">Send reminders</Label>
                  <Switch
                    checked={expirationRemindersEnabled}
                    onCheckedChange={(on) => setExpirationReminderDays(on ? DEFAULT_EXPIRATION_REMINDER_DAYS : [])}
                  />
                </div>
                {expirationRemindersEnabled ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-muted-foreground">When to remind you:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {EXPIRATION_REMINDER_DAY_OPTIONS.map((d) => {
                        const checked = expirationReminderDays.includes(d);
                        return (
                          <label key={d} htmlFor={`expiration-reminder-day-${d}`} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
                            <Checkbox id={`expiration-reminder-day-${d}`} checked={checked} onCheckedChange={(c) => toggleExpirationDay(d, !!c)} />
                            <span className="text-sm">{dayLabel(d)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Expiration reminders are turned off.</p>
                )}
              </div>
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
                  <Label htmlFor="warranty-email" className="cursor-pointer">Warranty email alerts</Label>
                </div>
                <Switch id="warranty-email" checked={warrantyEmail} onCheckedChange={setWarrantyEmail} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="warranty-push" className="cursor-pointer">Mobile alerts</Label>
                </div>
                <Switch id="warranty-push" checked={warrantyPush} onCheckedChange={setMobileAlert(setWarrantyPush)} />
              </div>
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between gap-3">
                  <Label className="cursor-pointer">Send reminders</Label>
                  <Switch
                    checked={warrantyRemindersEnabled}
                    onCheckedChange={(on) => setWarrantyReminderDays(on ? DEFAULT_WARRANTY_REMINDER_DAYS : [])}
                  />
                </div>
                {warrantyRemindersEnabled ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-muted-foreground">When to remind you:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {WARRANTY_REMINDER_DAY_OPTIONS.map((d) => {
                        const checked = warrantyReminderDays.includes(d);
                        return (
                          <label key={d} htmlFor={`warranty-reminder-day-${d}`} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 cursor-pointer hover:bg-accent transition-colors">
                            <Checkbox id={`warranty-reminder-day-${d}`} checked={checked} onCheckedChange={(c) => toggleWarrantyDay(d, !!c)} />
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

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Unsubscribe() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token"), []);
  const [status, setStatus] = useState<"loading" | "valid" | "success" | "error" | "used">("loading");
  const [message, setMessage] = useState("Checking your unsubscribe link...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This unsubscribe link is missing a token.");
      return;
    }

    const validate = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await response.json();
        if (data.valid) {
          setStatus("valid");
          setMessage("Confirm that you no longer want to receive app emails from HomeStock.");
        } else if (data.reason === "already_unsubscribed") {
          setStatus("used");
          setMessage("This email address is already unsubscribed.");
        } else {
          setStatus("error");
          setMessage(data.error || "This unsubscribe link is invalid or expired.");
        }
      } catch {
        setStatus("error");
        setMessage("We could not verify this unsubscribe link.");
      }
    };

    void validate();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setStatus("loading");
    setMessage("Updating your email preferences...");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    if (!error && data?.success) {
      setStatus("success");
      setMessage("You have been unsubscribed from app emails.");
    } else if (data?.reason === "already_unsubscribed") {
      setStatus("used");
      setMessage("This email address is already unsubscribed.");
    } else {
      setStatus("error");
      setMessage("We could not complete the unsubscribe request.");
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <Card className="mx-auto max-w-md border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
          {status === "valid" && <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>}
        </CardContent>
      </Card>
    </main>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { getResetCooldownSeconds, getStoredResetEmail, markResetEmailRequested, storeResetEmail } from "@/lib/password-reset";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [linkIssue, setLinkIssue] = useState<"missing" | "expired" | "invalid" | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    setResetEmail(getStoredResetEmail());

    const code = searchParams.get("code");
    if (!code) {
      setInvalid(true);
      setLinkIssue("missing");
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      const message = error?.message?.toLowerCase() || "";
      setInvalid(Boolean(error));
      setLinkIssue(error ? (message.includes("expired") ? "expired" : "invalid") : null);
      setReady(!error);
    });
  }, [searchParams]);

  const handleResendReset = async () => {
    const email = resetEmail.trim();
    if (!email) {
      toast.error("Enter your email on the sign-in page first.");
      navigate("/auth", { replace: true });
      return;
    }

    const cooldownSeconds = getResetCooldownSeconds(email);
    if (cooldownSeconds > 0) {
      toast.error(`Please wait ${cooldownSeconds}s before requesting another reset email.`);
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResending(false);

    if (error) {
      toast.error(error.message || "Unable to resend reset email");
      return;
    }

    storeResetEmail(email);
    markResetEmailRequested(email);
    toast.success("Password reset email resent. Check your inbox.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError("");

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Unable to update password");
      return;
    }

    toast.success("Password updated");
    navigate("/app", { replace: true });
  };

  const linkTitle = linkIssue === "expired" ? "Reset link expired" : linkIssue === "missing" ? "Reset link missing" : invalid ? "Reset link invalid" : "Reset password";
  const linkDescription = linkIssue === "expired"
    ? "This reset link has expired. Request a new one to keep your account secure."
    : linkIssue === "missing"
      ? "This page was opened without a reset link. Start again from sign in."
      : invalid
        ? "This reset link is invalid or has already been used. Request a new one if you still need access."
        : "Choose a new password for HomeStock.";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {!ready && !invalid ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <LockKeyhole className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle>{linkTitle}</CardTitle>
          <CardDescription>
            {linkDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" minLength={6} value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" minLength={6} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(""); }} required />
              </div>
              {passwordError && <p className="text-sm text-destructive" role="alert">{passwordError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              {invalid && resetEmail && (
                <Button className="w-full" onClick={handleResendReset} disabled={resending}>
                  {resending ? "Resending..." : "Resend reset email"}
                </Button>
              )}
              <Button className="w-full" variant="outline" onClick={() => navigate("/auth", { replace: true })} disabled={!invalid}>
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
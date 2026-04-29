import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    setResetEmail(sessionStorage.getItem("homestock_reset_email") || "");

    const code = searchParams.get("code");
    if (!code) {
      setInvalid(true);
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      setInvalid(Boolean(error));
      setReady(!error);
    });
  }, [searchParams]);

  const handleResendReset = async () => {
    if (!resetEmail.trim()) {
      toast.error("Enter your email on the sign-in page first.");
      navigate("/auth", { replace: true });
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResending(false);

    if (error) {
      toast.error(error.message || "Unable to resend reset email");
      return;
    }

    toast.success("Password reset email resent. Check your inbox.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {!ready && !invalid ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <LockKeyhole className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle>{invalid ? "Link expired" : "Reset password"}</CardTitle>
          <CardDescription>
            {invalid ? "This secure reset link is invalid or has expired." : "Choose a new password for HomeStock."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
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
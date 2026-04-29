import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PLAN_PRICES = {
  starter: { monthly: 0, yearly: 0 },
  household: { monthly: 600, yearly: 6000 },
  business: { monthly: 1400, yearly: 14000 },
} as const;

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const plan = PLAN_PRICES[searchParams.get("plan") as keyof typeof PLAN_PRICES] ? searchParams.get("plan") as keyof typeof PLAN_PRICES : "starter";
  const billingCycle = searchParams.get("billing") === "yearly" ? "yearly" : "monthly";
  const locationCount = Math.max(1, Number(searchParams.get("locations")) || 1);
  const unitAmountCents = PLAN_PRICES[plan][billingCycle];
  const totalAmountCents = unitAmountCents * locationCount;
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const submitAuth = async () => {
    setLoginError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName, { plan, billingCycle, locationCount, unitAmountCents, totalAmountCents });
        toast.success("Account created! Check your email to confirm.");
      } else {
        await signIn(email, password);
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      const message = err.message || "Authentication failed";
      if (!isSignUp) setLoginError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const resetEmail = email.trim();
    if (!resetEmail) {
      toast.error("Enter your email first");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Unable to send reset email");
      return;
    }

    sessionStorage.setItem("homestock_reset_email", resetEmail);
    setResetEmailSent(true);
    toast.success("Password reset link sent. Check your email.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResetMode) {
      await handlePasswordReset();
      return;
    }

    await submitAuth();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm animate-slide-up">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Package className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">HomeStock</CardTitle>
          <CardDescription>
            {isResetMode ? "Reset access to your inventory" : isSignUp ? "Create an account to track your inventory" : "Sign in to your inventory"}
          </CardDescription>
          <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium capitalize">{plan} · {billingCycle}</p>
            <p className="text-muted-foreground">{locationCount} location/property · ${(totalAmountCents / 100).toLocaleString()}/{billingCycle === "monthly" ? "mo" : "yr"}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && !isResetMode && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError("");
                  setResetEmailSent(false);
                }}
                placeholder="you@example.com"
                required
              />
            </div>
            {!isResetMode && <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    onClick={() => {
                      setIsResetMode(true);
                      setLoginError("");
                    }}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>}
            {isResetMode && resetEmailSent && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary" role="status">
                Password reset email sent. Open the secure link in your inbox to choose a new password.
              </div>
            )}
            {!isSignUp && loginError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <p className="font-medium">Sign-in failed</p>
                <p className="mt-1 text-destructive/90">{loginError}</p>
                <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={submitAuth} disabled={loading}>
                  Retry sign in
                </Button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isResetMode ? "Send reset link" : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (isResetMode) {
                  setIsResetMode(false);
                  setResetEmailSent(false);
                  setLoginError("");
                  return;
                }

                setIsResetMode(false);
                setResetEmailSent(false);
                setLoginError("");
                setIsSignUp(!isSignUp);
              }}
            >
              {isResetMode ? "Back to sign in" : isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

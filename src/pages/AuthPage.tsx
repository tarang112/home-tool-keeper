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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Unable to send reset email");
      return;
    }

    toast.success("Password reset link sent. Check your email.");
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
            {isSignUp ? "Create an account to track your inventory" : "Sign in to your inventory"}
          </CardDescription>
          <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium capitalize">{plan} · {billingCycle}</p>
            <p className="text-muted-foreground">{locationCount} location/property · ${(totalAmountCents / 100).toLocaleString()}/{billingCycle === "monthly" ? "mo" : "yr"}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    onClick={handlePasswordReset}
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

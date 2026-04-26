import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const finishAuth = async () => {
      const code = searchParams.get("code");
      if (!code) {
        setStatus("error");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setStatus("error");
        return;
      }

      setStatus("success");
      window.setTimeout(() => navigate("/", { replace: true }), 900);
    };

    finishAuth();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-primary" />}
            {status === "error" && <XCircle className="h-6 w-6 text-destructive" />}
          </div>
          <CardTitle>{status === "error" ? "Link expired" : "Opening HomeStock"}</CardTitle>
          <CardDescription>
            {status === "error"
              ? "This secure email link is invalid or has expired."
              : "We’re securely signing you in."}
          </CardDescription>
        </CardHeader>
        {status === "error" && (
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
              Back to Sign In
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
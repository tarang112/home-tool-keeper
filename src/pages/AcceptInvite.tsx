import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<"loading" | "preview" | "accepting" | "accepted" | "already_member" | "not_found" | "error">("loading");
  const [invite, setInvite] = useState<any>(null);
  const [houseName, setHouseName] = useState("");
  const [inviterName, setInviterName] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setStatus("not_found"); return; }

    if (!user) {
      // Redirect to auth with return URL
      const returnUrl = `/accept-invite?token=${token}`;
      navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`, { replace: true });
      return;
    }

    // Fetch invite details
    const fetchInvite = async () => {
      const { data, error } = await supabase.rpc("get_invite_by_token", {
        _token: token,
      });

      if (error || !data || data.length === 0) {
        setStatus("not_found");
        return;
      }

      const inviteData = data[0];
      setInvite(inviteData);

      // Fetch house name
      const { data: house } = await supabase
        .from("houses")
        .select("name, property_type")
        .eq("id", inviteData.house_id)
        .single();
      if (house) setHouseName(house.name);

      // Fetch inviter name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", inviteData.invited_by)
        .single();
      if (profile) setInviterName(profile.display_name || "Someone");

      setStatus("preview");
    };

    fetchInvite();
  }, [token, user, authLoading, navigate]);

  const handleAccept = async () => {
    if (!token || !user) return;
    setStatus("accepting");

    const { data, error } = await supabase.rpc("accept_invite_by_token", {
      _token: token,
      _user_id: user.id,
    });

    if (error) {
      setStatus("error");
      return;
    }

    if (data === "accepted") setStatus("accepted");
    else if (data === "already_member") setStatus("already_member");
    else setStatus("not_found");
  };

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>
            {status === "preview" && "You've been invited!"}
            {status === "accepting" && "Accepting invite..."}
            {status === "accepted" && "Welcome aboard!"}
            {status === "already_member" && "Already a member"}
            {status === "not_found" && "Invite not found"}
            {status === "error" && "Something went wrong"}
          </CardTitle>
          <CardDescription>
            {status === "preview" && (
              <>
                <strong>{inviterName}</strong> has invited you to join <strong>{houseName}</strong> as {invite?.role === "editor" ? "an editor" : "a viewer"}.
              </>
            )}
            {status === "accepted" && `You've been added to "${houseName}".`}
            {status === "already_member" && `You're already a member of "${houseName}".`}
            {status === "not_found" && "This invite link is invalid or has already been used."}
            {status === "error" && "Failed to accept the invite. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {status === "preview" && (
            <Button onClick={handleAccept} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" /> Accept Invite
            </Button>
          )}
          {status === "accepting" && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
          {(status === "accepted" || status === "already_member") && (
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Inventory
            </Button>
          )}
          {(status === "not_found" || status === "error") && (
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Go Home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

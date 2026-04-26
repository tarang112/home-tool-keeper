import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type LandingLead = {
  id: string;
  name: string | null;
  email: string;
  household_type: string | null;
  message: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  created_at: string;
};

type LandingEvent = {
  event_name: "pageview" | "lead_submit";
  source: string | null;
  medium: string | null;
};

export default function AdminLeads() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LandingLead[]>([]);
  const [events, setEvents] = useState<LandingEvent[]>([]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return leads;
    return leads.filter((lead) => `${lead.name ?? ""} ${lead.email} ${lead.household_type ?? ""} ${lead.message ?? ""}`.toLowerCase().includes(value));
  }, [leads, query]);

  const sourceStats = useMemo(() => {
    const stats = new Map<string, { source: string; medium: string; pageviews: number; leads: number }>();
    events.forEach((event) => {
      const source = event.source || "direct";
      const medium = event.medium || "none";
      const key = `${source}|${medium}`;
      const current = stats.get(key) || { source, medium, pageviews: 0, leads: 0 };
      if (event.event_name === "pageview") current.pageviews += 1;
      if (event.event_name === "lead_submit") current.leads += 1;
      stats.set(key, current);
    });
    return Array.from(stats.values()).sort((a, b) => b.leads - a.leads || b.pageviews - a.pageviews);
  }, [events]);

  const loadLeads = async () => {
    setLoading(true);
    const [{ data, error }, { data: eventData }] = await Promise.all([
      supabase
      .from("landing_leads" as any)
      .select("id, name, email, household_type, message, source, medium, campaign, created_at")
      .order("created_at", { ascending: false }),
      supabase
        .from("landing_page_events" as any)
        .select("event_name, source, medium")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    if (error) {
      toast.error("Unable to load leads");
      setLeads([]);
    } else {
      setLeads((data as unknown as LandingLead[]) ?? []);
      setEvents((eventData as unknown as LandingEvent[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      setCheckingRole(true);
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      const allowed = Boolean(data);
      setIsAdmin(allowed);
      setCheckingRole(false);
      if (allowed) void loadLeads();
      else setLoading(false);
    };

    void checkRole();
  }, [user]);

  const deleteLead = async (leadId: string) => {
    const { error } = await supabase.from("landing_leads" as any).delete().eq("id", leadId);
    if (error) {
      toast.error("Unable to delete lead");
      return;
    }
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
    toast.success("Lead deleted");
  };

  if (checkingRole || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>Admin access required</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Your account does not have permission to view landing leads.</p>
            <Button asChild><Link to="/app">Back to app</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Button asChild variant="ghost" size="sm" className="-ml-3 gap-2"><Link to="/app"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
            <h1 className="font-heading text-3xl font-bold">Landing Leads</h1>
            <p className="text-sm text-muted-foreground">Review and remove lead capture submissions.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={loadLeads}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Conversion by source</CardTitle></CardHeader>
          <CardContent>
            {sourceStats.length === 0 ? (
              <div className="flex h-28 items-center justify-center rounded-lg border text-sm text-muted-foreground">No analytics yet</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {sourceStats.map((stat) => {
                  const rate = stat.pageviews ? Math.round((stat.leads / stat.pageviews) * 1000) / 10 : 0;
                  return (
                    <article key={`${stat.source}-${stat.medium}`} className="rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div><p className="font-semibold">{stat.source}</p><p className="text-xs text-muted-foreground">{stat.medium}</p></div>
                        <Badge variant="secondary">{rate}%</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-muted-foreground">Views</p><p className="font-heading text-2xl font-semibold">{stat.pageviews}</p></div>
                        <div><p className="text-muted-foreground">Leads</p><p className="font-heading text-2xl font-semibold">{stat.leads}</p></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">Submissions <Badge variant="secondary">{filtered.length}</Badge></CardTitle>
            <Input className="sm:max-w-xs" placeholder="Search leads..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-lg border text-sm text-muted-foreground">No leads found</div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <div className="hidden grid-cols-[1.2fr_1.2fr_1fr_1.5fr_auto] gap-3 border-b bg-muted/60 px-4 py-3 text-sm font-medium md:grid">
                  <span>Name</span><span>Email</span><span>Type</span><span>Message</span><span></span>
                </div>
                <div className="divide-y">
                  {filtered.map((lead) => (
                    <article key={lead.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_1.2fr_1fr_1.5fr_auto] md:items-center">
                      <div><p className="font-medium">{lead.name || "Anonymous"}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</p></div>
                      <a className="break-all text-sm text-primary underline-offset-4 hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>
                      <p className="text-sm text-muted-foreground">{lead.household_type || "—"}<span className="mt-1 block text-xs">{lead.source || "direct"}{lead.campaign ? ` · ${lead.campaign}` : ""}</span></p>
                      <p className="text-sm leading-6 text-muted-foreground">{lead.message || "—"}</p>
                      <Button size="icon" variant="ghost" onClick={() => deleteLead(lead.id)} aria-label={`Delete lead from ${lead.email}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

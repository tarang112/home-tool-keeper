import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Monitor, Smartphone, Tablet, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVisitorLogs } from "@/hooks/use-visitor-log";

const DeviceIcon = ({ device }: { device: string }) => {
  if (device === "mobile") return <Smartphone className="h-4 w-4" />;
  if (device === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
};

export default function VisitorDetails() {
  const { sessionId = "" } = useParams();
  const { logs, loading } = useVisitorLogs();
  const decodedSessionId = decodeURIComponent(sessionId);
  const sessionLogs = useMemo(() => logs.filter((log) => log.sessionId === decodedSessionId), [decodedSessionId, logs]);
  const first = sessionLogs[sessionLogs.length - 1];
  const latest = sessionLogs[0];
  const formatLocation = (log: (typeof logs)[number]) => [log.city, log.region, log.country].filter(Boolean).join(", ") || "—";

  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <main className="mx-auto max-w-5xl space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/visitors"><ArrowLeft className="h-4 w-4" /> Back to visitors</Link>
        </Button>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold">Visitor Details</h1>
              <p className="text-sm text-muted-foreground">Session {decodedSessionId.slice(0, 8)} · IP anonymized</p>
            </div>
            <Badge variant="secondary" className="w-fit gap-1"><Users className="h-3 w-3" /> {sessionLogs.length} page view{sessionLogs.length === 1 ? "" : "s"}</Badge>
          </div>

          {first && latest && (
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">First seen</p>
                <p className="text-sm font-medium">{format(new Date(first.createdAt), "MMM d, yyyy h:mm a")}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">Latest page</p>
                <p className="truncate text-sm font-medium">{latest.page}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">Device</p>
                <p className="flex items-center gap-2 text-sm font-medium"><DeviceIcon device={latest.device} /> {latest.device}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">IP</p>
                <p className="font-mono text-xs font-medium">{latest.ipAddressMasked || "—"}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="truncate text-sm font-medium">{formatLocation(latest)}</p>
              </div>
            </div>
          )}
        </section>

        <ScrollArea className="h-[calc(100vh-280px)] rounded-lg border bg-card">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading session...</div>
          ) : sessionLogs.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No visits found for this session</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">{format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell className="font-medium">{log.page}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{log.referrer || "Direct"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddressMasked || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{formatLocation(log)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ipHash ? `${log.ipHash.slice(0, 16)}…` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </main>
    </div>
  );
}
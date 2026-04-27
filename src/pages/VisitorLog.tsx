import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Eye, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVisitorLogs } from "@/hooks/use-visitor-log";

export default function VisitorLog() {
  const { logs, loading, refetch, deleteLog } = useVisitorLogs();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => `${log.page} ${log.device} ${log.referrer ?? ""} ${log.userAgent ?? ""} ${log.ipAddressMasked ?? ""} ${log.city ?? ""} ${log.region ?? ""} ${log.country ?? ""}`.toLowerCase().includes(q));
  }, [logs, query]);

  const formatLocation = (log: (typeof logs)[number]) => [log.city, log.region, log.country].filter(Boolean).join(", ") || "—";

  const sessions = useMemo(() => new Set(logs.map((log) => log.sessionId).filter(Boolean)).size, [logs]);

  const exportCsv = () => {
    const rows = filtered.map((log) => ({
      Time: format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
      Page: log.page,
      Device: log.device,
      Session: log.sessionId || "",
      IP: log.ipAddressMasked || "",
      Location: formatLocation(log),
      Referrer: log.referrer || "Direct",
      IpHash: log.ipHash ? log.ipHash.slice(0, 16) : "",
    }));
    const header = Object.keys(rows[0] || { Time: "", Page: "", Device: "", Session: "", IP: "", Location: "", Referrer: "", IpHash: "" });
    const csv = [header.join(","), ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "homestock-visitor-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <main className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/app"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={refetch} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold">Visitor Log</h1>
              <p className="text-sm text-muted-foreground">{logs.length} visit{logs.length === 1 ? "" : "s"} · {sessions} session{sessions === 1 ? "" : "s"} · IP anonymized</p>
            </div>
            <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {filtered.length} shown</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search page, device, IP, location..." className="pl-9" />
          </div>
        </section>

        <ScrollArea className="h-[calc(100vh-220px)] rounded-lg border bg-card">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading visits...</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No visits found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">{format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell className="font-medium">{log.page}</TableCell>
                    <TableCell><Badge variant="outline">{log.device}</Badge></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddressMasked || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{formatLocation(log)}</TableCell>
                    <TableCell>{log.sessionId ? <Button asChild variant="link" size="sm" className="h-auto p-0"><Link to={`/visitors/${encodeURIComponent(log.sessionId)}`}><Eye className="mr-1 h-3 w-3" /> Details</Link></Button> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{log.referrer || "Direct"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLog(log.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
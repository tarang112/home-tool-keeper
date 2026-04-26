import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Search, Trash2, Users } from "lucide-react";
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
    return logs.filter((log) => `${log.page} ${log.device} ${log.referrer ?? ""} ${log.userAgent ?? ""}`.toLowerCase().includes(q));
  }, [logs, query]);

  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <main className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={refetch} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold">Visitor Log</h1>
              <p className="text-sm text-muted-foreground">{logs.length} individual visit{logs.length === 1 ? "" : "s"} recorded</p>
            </div>
            <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {filtered.length} shown</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search page, device, referrer..." className="pl-9" />
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
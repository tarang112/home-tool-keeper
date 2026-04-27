import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ReceiptImport = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  store_name: string | null;
  order_number: string | null;
  order_date: string | null;
  subject: string | null;
  source_type: string;
  total_amount: number | null;
};

export default function ReceiptImports() {
  const [imports, setImports] = useState<ReceiptImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchImports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("receipt_email_imports" as any)
      .select("id, created_at, updated_at, status, store_name, order_number, order_date, subject, source_type, total_amount")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Could not load receipt imports");
    } else {
      setImports((data || []) as unknown as ReceiptImport[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchImports();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return imports;
    return imports.filter((item) => `${item.store_name ?? ""} ${item.order_number ?? ""} ${item.status} ${item.subject ?? ""} ${item.source_type}`.toLowerCase().includes(q));
  }, [imports, query]);

  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <main className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/app"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchImports} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold">Receipt Imports</h1>
              <p className="text-sm text-muted-foreground">{imports.length} linked receipt import{imports.length === 1 ? "" : "s"}</p>
            </div>
            <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> {filtered.length} shown</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search store, order, status..." className="pl-9" />
          </div>
        </section>

        <ScrollArea className="h-[calc(100vh-220px)] rounded-lg border bg-card">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading receipt imports...</div>
          ) : filtered.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No receipt imports found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Linked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-sm">{format(new Date(item.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell><Badge variant={item.status === "parsed" ? "secondary" : "outline"}>{item.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="font-medium">{item.store_name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.order_number || "—"}</TableCell>
                    <TableCell>{item.order_date ? format(new Date(`${item.order_date}T00:00:00`), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>{item.total_amount != null ? `$${Number(item.total_amount).toFixed(2)}` : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{item.source_type.replace(/_/g, " ")}</Badge></TableCell>
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
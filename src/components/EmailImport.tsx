import { useState } from "react";
import { Mail, Loader2, Check, Trash2, ClipboardPaste, Upload, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InventoryItem } from "@/hooks/use-inventory";
import { useAuth } from "@/hooks/use-auth";

interface ExtractedItem {
  name: string;
  category: string;
  subcategory?: string;
  quantity: number;
  quantityUnit: string;
  location: string;
  expirationDate?: string;
  unitPrice?: number;
  totalPrice?: number;
  selected: boolean;
}

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

const extractEmlHeader = (content: string, header: string) => {
  const match = content.match(new RegExp(`^${header}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
};

interface EmailImportProps {
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void;
  customLocations: string[];
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function EmailImport({ onAdd, customLocations, externalOpen, onExternalOpenChange }: EmailImportProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onExternalOpenChange || setInternalOpen;
  const [emailContent, setEmailContent] = useState("");
  const [subject, setSubject] = useState("");
  const [forwardedToEmail, setForwardedToEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("pasted_email");
  const [parsing, setParsing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [storeName, setStoreName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [subtotalAmount, setSubtotalAmount] = useState<number | null>(null);
  const [taxAmount, setTaxAmount] = useState<number | null>(null);
  const [shippingAmount, setShippingAmount] = useState<number | null>(null);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE) {
      toast.error("File must be 20MB or smaller");
      return;
    }

    setUploadedFile(file);
    const lowerName = file.name.toLowerCase();
    try {
      if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const pages: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const text = await page.getTextContent();
          pages.push(text.items.map((item: any) => item.str).join(" "));
        }
        setEmailContent(pages.join("\n\n"));
        setSourceType("pdf_upload");
        toast.success("PDF text extracted");
        return;
      }

      if (file.type === "message/rfc822" || lowerName.endsWith(".eml")) {
        const content = await file.text();
        setEmailContent(content);
        setSubject((current) => current || extractEmlHeader(content, "Subject"));
        setSenderEmail((current) => current || extractEmlHeader(content, "From"));
        setForwardedToEmail((current) => current || extractEmlHeader(content, "To"));
        setSourceType("eml_upload");
        toast.success("EML loaded");
        return;
      }

      toast.error("Upload a PDF or EML file");
      setUploadedFile(null);
    } catch {
      toast.error("Could not read that file");
      setUploadedFile(null);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setEmailContent(text);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const handleParse = async () => {
    const accountEmail = user?.email?.trim().toLowerCase();
    const matchedEmail = forwardedToEmail.trim().toLowerCase();
    if (!accountEmail || matchedEmail !== accountEmail) {
      toast.error("Forwarded-to email must match your registered account email");
      return;
    }
    if (!emailContent.trim()) {
      toast.error("Please paste email content first");
      return;
    }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-order-email", {
        body: {
          emailContent: emailContent.trim(),
          subject: subject.trim(),
          from: senderEmail.trim(),
          locations: customLocations,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const items: ExtractedItem[] = (data.items || []).map((item: any) => ({
        ...item,
        subcategory: item.subcategory || "",
        location: item.location || "",
        expirationDate: item.expirationDate || null,
        unitPrice: item.unitPrice ?? null,
        totalPrice: item.totalPrice ?? null,
        selected: true,
      }));

      setExtractedItems(items);
      setStoreName(data.storeName || "");
      setOrderNumber(data.orderNumber || "");
      setOrderDate(data.orderDate || "");
      setSubtotalAmount(data.subtotalAmount ?? null);
      setTaxAmount(data.taxAmount ?? null);
      setShippingAmount(data.shippingAmount ?? null);
      setTotalAmount(data.totalAmount ?? null);

      const receiptPayload = {
        user_id: user?.id,
        matched_email: accountEmail,
        sender_email: senderEmail.trim() || null,
        subject: subject.trim() || null,
        email_content: emailContent.trim(),
        store_name: data.storeName || null,
        order_number: data.orderNumber || null,
        order_date: data.orderDate || null,
        parsed_items: items,
        source_type: sourceType,
        file_name: uploadedFile?.name || null,
        file_type: uploadedFile?.type || null,
        subtotal_amount: data.subtotalAmount ?? null,
        tax_amount: data.taxAmount ?? null,
        shipping_amount: data.shippingAmount ?? null,
        total_amount: data.totalAmount ?? null,
        status: items.length > 0 ? "parsed" : "no_items_found",
      } as any;

      const duplicateQuery = supabase
        .from("receipt_email_imports" as any)
        .select("id")
        .eq("user_id", user?.id)
        .limit(1);

      if (data.orderNumber) {
        duplicateQuery.eq("order_number", data.orderNumber);
        if (data.storeName) duplicateQuery.eq("store_name", data.storeName);
      } else {
        duplicateQuery
          .eq("matched_email", accountEmail)
          .eq("subject", subject.trim() || null)
          .eq("total_amount", data.totalAmount ?? null);
      }

      const { data: duplicateImport } = await duplicateQuery.maybeSingle();
      const duplicateId = (duplicateImport as { id?: string } | null)?.id;
      const { error: saveError } = duplicateId
        ? await supabase.from("receipt_email_imports" as any).update(receiptPayload).eq("id", duplicateId)
        : await supabase.from("receipt_email_imports" as any).insert(receiptPayload);

      if (saveError) {
        toast.error("Parsed email, but could not link the receipt to your account");
        return;
      }

      if (items.length === 0) {
        toast.info("No items found. Make sure you pasted an order confirmation email.");
      } else if (duplicateId) {
        toast.success(`Updated existing linked receipt and found ${items.length} item${items.length > 1 ? "s" : ""}`);
      } else {
        toast.success(`Linked receipt to your account and found ${items.length} item${items.length > 1 ? "s" : ""}`);
      }
    } catch (err: any) {
      console.error("Email parse error:", err);
      toast.error("Failed to parse email. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  const toggleItem = (index: number) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const removeItem = (index: number) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExtractedItem = (index: number, updates: Partial<ExtractedItem>) => {
    setExtractedItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const toggleAll = () => {
    const allSelected = extractedItems.every((i) => i.selected);
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleAddSelected = () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      toast.error("No items selected");
      return;
    }

    const orderInfo = [
      storeName && `Store: ${storeName}`,
      orderNumber && `Order: ${orderNumber}`,
      orderDate && `Date: ${orderDate}`,
    ].filter(Boolean).join(" | ");

    // Save email content and subject as receipt for later reference
    const receiptParts: string[] = [];
    if (orderInfo) receiptParts.push(orderInfo);
    if (subject.trim()) receiptParts.push(`Subject: ${subject.trim()}`);
    if (emailContent.trim()) receiptParts.push(`--- Email Receipt ---\n${emailContent.trim().slice(0, 2000)}`);
    const fullNotes = receiptParts.join("\n");

    for (const item of selected) {
      onAdd({
        name: item.name,
        category: item.category,
        subcategory: item.subcategory || "",
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        location: item.location,
        locationDetail: "",
        locationImage: "",
        productImage: "",
        itemImage: "",
        notes: fullNotes,
        barcode: "",
        expirationDate: item.expirationDate || null,
        houseId: null,
        unitPrice: item.unitPrice ?? null,
        totalPrice: item.totalPrice ?? null,
        lentTo: null,
        lentAt: null,
        lentNotes: null,
      });
    }

    toast.success(`Added ${selected.length} item${selected.length > 1 ? "s" : ""} to inventory`);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setEmailContent("");
    setSubject("");
    setForwardedToEmail("");
    setSenderEmail("");
    setUploadedFile(null);
    setSourceType("pasted_email");
    setExtractedItems([]);
    setStoreName("");
    setOrderNumber("");
    setOrderDate("");
    setSubtotalAmount(null);
    setTaxAmount(null);
    setShippingAmount(null);
    setTotalAmount(null);
  };

  const selectedCount = extractedItems.filter((i) => i.selected).length;

  return (
    <>
      {externalOpen === undefined && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 h-8 px-2 text-xs"
          onClick={() => setOpen(true)}
        >
          <Mail className="h-3.5 w-3.5" /> Email
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Import from Email
            </DialogTitle>
            <DialogDescription>
              Paste a forwarded receipt or order email and link it to your account
            </DialogDescription>
          </DialogHeader>

          {extractedItems.length === 0 ? (
            <div className="space-y-3">
              <Alert className="border-primary/30 bg-primary/5">
                <Info className="h-4 w-4" />
                <AlertTitle>Google Mail connection coming later</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  For now, upload a PDF/EML or paste the full receipt email, then enter your registered email in Forwarded To to link it to this account.
                </AlertDescription>
              </Alert>
              <div>
                <label className="text-sm font-medium mb-1 block">Forwarded To</label>
                <Input
                  type="email"
                  placeholder={user?.email ?? "your-account@example.com"}
                  value={forwardedToEmail}
                  onChange={(e) => setForwardedToEmail(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Must match your registered account email.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Original Sender (optional)</label>
                <Input
                  type="email"
                  placeholder="store@example.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subject (optional)</label>
                <Input
                  placeholder="e.g. Your Amazon order has shipped"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <label className="text-sm font-medium" htmlFor="receipt-upload">Upload PDF/EML</label>
                <Input
                  id="receipt-upload"
                  type="file"
                  accept=".pdf,.eml,application/pdf,message/rfc822"
                  onChange={(e) => void handleFileUpload(e.target.files?.[0] || null)}
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="h-3 w-3" />
                  <span>{uploadedFile ? uploadedFile.name : "PDF receipts and .eml order emails up to 20MB"}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Email Content</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs"
                    onClick={handlePaste}
                  >
                    <ClipboardPaste className="h-3 w-3" /> Paste
                  </Button>
                </div>
                <Textarea
                  placeholder="Copy the entire order confirmation email, or upload a PDF/EML above...&#10;&#10;Supports: Amazon, Home Depot, Lowe's, Walmart, Target, and any other retailer"
                  value={emailContent}
                  onChange={(e) => { setEmailContent(e.target.value); setSourceType(uploadedFile ? sourceType : "pasted_email"); }}
                  className="min-h-[200px] text-sm"
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleParse}
                disabled={parsing || !emailContent.trim() || !forwardedToEmail.trim()}
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Parsing email...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" /> Extract Items
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 space-y-2">
              {/* Order info */}
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {storeName && (
                  <Badge variant="outline" className="text-xs">
                    🏪 {storeName}
                  </Badge>
                )}
                {orderNumber && (
                  <Badge variant="outline" className="text-xs">
                    📦 #{orderNumber}
                  </Badge>
                )}
                {orderDate && (
                  <Badge variant="outline" className="text-xs">
                    📅 {orderDate}
                  </Badge>
                )}
                {totalAmount != null && (
                  <Badge variant="secondary" className="text-xs">
                    Total ${totalAmount.toFixed(2)}
                  </Badge>
                )}
                {subtotalAmount != null && <span className="text-xs">Subtotal ${subtotalAmount.toFixed(2)}</span>}
                {taxAmount != null && <span className="text-xs">Tax ${taxAmount.toFixed(2)}</span>}
                {shippingAmount != null && <span className="text-xs">Shipping ${shippingAmount.toFixed(2)}</span>}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAll}>
                  {extractedItems.every((i) => i.selected) ? "Deselect All" : "Select All"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedCount} of {extractedItems.length} selected
                </span>
              </div>

              <ScrollArea className="flex-1 max-h-[40vh]">
                <div className="space-y-1 pr-2">
                  {extractedItems.map((item, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-[auto_1fr_auto] gap-2 p-2 rounded-md border text-sm transition-colors ${
                        item.selected ? "bg-primary/5 border-primary/20" : "opacity-50"
                      }`}
                    >
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleItem(i)}
                      />
                      <div className="grid gap-2 min-w-0">
                        <Input
                          value={item.name}
                          onChange={(event) => updateExtractedItem(i, { name: event.target.value })}
                          className="h-8 font-medium"
                          placeholder="Item name"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={item.category} onChange={(event) => updateExtractedItem(i, { category: event.target.value })} className="h-8" placeholder="Category" />
                          <Input value={item.subcategory || ""} onChange={(event) => updateExtractedItem(i, { subcategory: event.target.value })} className="h-8" placeholder="Subcategory" />
                          <Input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateExtractedItem(i, { quantity: Number(event.target.value) || 0 })} className="h-8" placeholder="Qty" />
                          <Input value={item.quantityUnit} onChange={(event) => updateExtractedItem(i, { quantityUnit: event.target.value })} className="h-8" placeholder="Unit" />
                          <Input value={item.location || ""} onChange={(event) => updateExtractedItem(i, { location: event.target.value })} className="h-8" placeholder="Location" />
                          <Input type="date" value={item.expirationDate || ""} onChange={(event) => updateExtractedItem(i, { expirationDate: event.target.value })} className="h-8" />
                          <Input type="number" min="0" step="0.01" value={item.unitPrice ?? ""} onChange={(event) => updateExtractedItem(i, { unitPrice: event.target.value === "" ? undefined : Number(event.target.value) })} className="h-8" placeholder="Unit price" />
                          <Input type="number" min="0" step="0.01" value={item.totalPrice ?? ""} onChange={(event) => updateExtractedItem(i, { totalPrice: event.target.value === "" ? undefined : Number(event.target.value) })} className="h-8" placeholder="Total" />
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeItem(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setExtractedItems([]);
                    setStoreName("");
                    setOrderNumber("");
                    setOrderDate("");
                    setSubtotalAmount(null);
                    setTaxAmount(null);
                    setShippingAmount(null);
                    setTotalAmount(null);
                  }}
                >
                  Parse Another
                </Button>
                <Button
                  className="flex-1 gap-1"
                  onClick={handleAddSelected}
                  disabled={selectedCount === 0}
                >
                  <Check className="h-4 w-4" />
                  Add {selectedCount} Item{selectedCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

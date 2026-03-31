import { useState, useRef } from "react";
import { Mail, Loader2, Check, Trash2, ClipboardPaste, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InventoryItem } from "@/hooks/use-inventory";

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

interface EmailImportProps {
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void;
  customLocations: string[];
}

export function EmailImport({ onAdd, customLocations }: EmailImportProps) {
  const [open, setOpen] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [subject, setSubject] = useState("");
  const [parsing, setParsing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [storeName, setStoreName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");

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
          from: "",
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
        price: item.price || "",
        selected: true,
      }));

      setExtractedItems(items);
      setStoreName(data.storeName || "");
      setOrderNumber(data.orderNumber || "");
      setOrderDate(data.orderDate || "");

      if (items.length === 0) {
        toast.info("No items found. Make sure you pasted an order confirmation email.");
      } else {
        toast.success(`Found ${items.length} item${items.length > 1 ? "s" : ""}`);
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

    for (const item of selected) {
      const priceNote = item.price ? `Price: ${item.price}` : "";
      const notes = [priceNote, orderInfo].filter(Boolean).join(" · ");

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
        notes,
        barcode: "",
        expirationDate: item.expirationDate || null,
        houseId: null,
      });
    }

    toast.success(`Added ${selected.length} item${selected.length > 1 ? "s" : ""} to inventory`);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setEmailContent("");
    setSubject("");
    setExtractedItems([]);
    setStoreName("");
    setOrderNumber("");
    setOrderDate("");
  };

  const selectedCount = extractedItems.filter((i) => i.selected).length;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 h-8 px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <Mail className="h-3.5 w-3.5" /> Email
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Import from Email
            </DialogTitle>
            <DialogDescription>
              Paste an order confirmation email to extract items
            </DialogDescription>
          </DialogHeader>

          {extractedItems.length === 0 ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Subject (optional)</label>
                <Input
                  placeholder="e.g. Your Amazon order has shipped"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
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
                  placeholder="Copy the entire order confirmation email and paste it here...&#10;&#10;Supports: Amazon, Home Depot, Lowe's, Walmart, Target, and any other retailer"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="min-h-[200px] text-sm"
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleParse}
                disabled={parsing || !emailContent.trim()}
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
                      className={`flex items-center gap-2 p-2 rounded-md border text-sm transition-colors ${
                        item.selected ? "bg-primary/5 border-primary/20" : "opacity-50"
                      }`}
                    >
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleItem(i)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium truncate">{item.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                            {item.subcategory ? `${item.category} › ${item.subcategory}` : item.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{item.quantity} {item.quantityUnit}</span>
                          {item.location && <span>· {item.location}</span>}
                          {item.price && <span>· {item.price}</span>}
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

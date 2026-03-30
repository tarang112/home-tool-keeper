import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, X, Loader2, ScanBarcode } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScanned }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setManualCode("");
      setError("");
      setScanning(false);
    }
  }, [open]);

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    scannerRef.current = null;
  };

  const startScanner = async () => {
    setError("");
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          stopScanner();
          setScanning(false);
          onScanned(decodedText);
          onOpenChange(false);
        },
        () => {}
      );
    } catch (err: any) {
      setScanning(false);
      setError("Camera access denied or not available. Enter barcode manually.");
    }
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScanned(manualCode.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopScanner(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" /> Scan Barcode
          </DialogTitle>
          <DialogDescription>
            Scan a barcode with your camera or enter it manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            id="barcode-reader"
            ref={readerRef}
            className="w-full rounded-lg overflow-hidden bg-muted min-h-[200px]"
            style={{ display: scanning ? "block" : "none" }}
          />

          {!scanning && (
            <Button onClick={startScanner} className="w-full gap-2" variant="outline">
              <Camera className="h-4 w-4" /> Open Camera Scanner
            </Button>
          )}

          {scanning && (
            <Button onClick={() => { stopScanner(); setScanning(false); }} variant="destructive" size="sm" className="w-full gap-2">
              <X className="h-4 w-4" /> Stop Camera
            </Button>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-barcode">Enter Barcode Manually</Label>
            <div className="flex gap-2">
              <Input
                id="manual-barcode"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 012345678901"
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                Look Up
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

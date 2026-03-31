import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed this session
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (isStandalone) return;

    const wasDismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Check iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
    if (isIos && isSafari) {
      setShowIosBanner(true);
    }

    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIosBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install HomeStock</p>
          <p className="text-xs text-muted-foreground truncate">
            {showIosBanner
              ? "Tap Share then \"Add to Home Screen\""
              : "Add to home screen for quick access"}
          </p>
        </div>
        {deferredPrompt ? (
          <Button size="sm" onClick={handleInstall} className="shrink-0">
            Install
          </Button>
        ) : showIosBanner ? (
          <Share className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : null}
        <button onClick={handleDismiss} className="shrink-0 p-1 rounded-md hover:bg-muted">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

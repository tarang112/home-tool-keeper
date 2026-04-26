import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Share, Plus, ArrowLeft, Smartphone, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);

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
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-2xl">✅ App Installed!</CardTitle>
            <CardDescription>You're already using the app in standalone mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/app")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Install Home Inventory</CardTitle>
          <CardDescription>
            Add this app to your home screen for quick access — works just like a native app!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" /> Install App
            </Button>
          ) : isIos ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">To install on iPhone/iPad:</p>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Share className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span>Tap the <strong>Share</strong> button in Safari's toolbar</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Plus className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Download className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span>Tap <strong>Add</strong> to confirm</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">To install on Android:</p>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Monitor className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span>Tap the <strong>menu (⋮)</strong> in your browser</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Download className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span>Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong></span>
              </div>
            </div>
          )}

          <Button variant="outline" onClick={() => navigate("/app")} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Continue in Browser
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

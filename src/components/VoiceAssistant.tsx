import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CATEGORIES, LOCATIONS, type InventoryItem } from "@/hooks/use-inventory";

interface VoiceAssistantProps {
  items: InventoryItem[];
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void;
  onUpdate: (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt">>) => void;
  onDelete: (id: string) => void;
  customLocations: string[];
  houseId: string | null;
}

type VoiceState = "idle" | "listening" | "processing" | "confirming";

export function VoiceAssistant({
  items,
  onAdd,
  onUpdate,
  onDelete,
  customLocations,
  houseId,
}: VoiceAssistantProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pendingAction, setPendingAction] = useState<any>(null);
  const recognitionRef = useRef<any>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const allLocations = [...LOCATIONS, ...customLocations];
  const allLocationsRef = useRef(allLocations);
  allLocationsRef.current = allLocations;

  const processTranscript = useCallback(
    async (text: string) => {
      setState("processing");
      try {
        const currentItems = itemsRef.current;
        const currentLocations = allLocationsRef.current;

        const { data, error } = await supabase.functions.invoke("voice-command", {
          body: {
            transcript: text,
            items: currentItems.map((i) => ({
              id: i.id,
              name: i.name,
              quantity: i.quantity,
              quantityUnit: i.quantityUnit,
              location: i.location,
              category: i.category,
            })),
            categories: CATEGORIES,
            locations: currentLocations,
          },
        });

        if (error) {
          console.error("Voice command error:", error);
          toast.error("Failed to process voice command");
          setState("idle");
          return;
        }

        if (data?.error && (!data?.actions || data.actions.length === 0)) {
          toast.error(data?.error || "Couldn't understand that command");
          setState("idle");
          return;
        }

        setConfirmation(data.confirmation || "Execute this action?");
        setPendingAction(data);
        setState("confirming");
      } catch (e) {
        console.error("Voice processing failed:", e);
        toast.error("Voice processing failed");
        setState("idle");
      }
    },
    []
  );

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = "";

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results as SpeechRecognitionResultList);
      const text = results.map((r: any) => r[0].transcript).join("");
      finalText = text;
      setTranscript(text);
    };

    recognition.onend = () => {
      if (finalText.trim()) {
        processTranscript(finalText.trim());
      } else {
        setState("idle");
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        toast.error(`Mic error: ${event.error}`);
      }
      setState("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");
    setTranscript("");
    setConfirmation("");
    setPendingAction(null);
  }, [processTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const executeAction = useCallback(() => {
    if (!pendingAction) return;

    // Support both new multi-action format and legacy single-action
    const actions = pendingAction.actions || [pendingAction];
    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    for (const entry of actions) {
      const { action, item, itemId } = entry;

      if (action === "add" && item) {
        onAdd({
          name: item.name || "Unnamed",
          category: item.category || "other",
          subcategory: item.subcategory || "",
          quantity: item.quantity || 1,
          quantityUnit: item.quantityUnit || "pcs",
          location: item.location || "",
          locationDetail: "",
          locationImage: "",
          productImage: "",
          itemImage: "",
          notes: item.notes || "",
          barcode: "",
          expirationDate: item.expirationDate || null,
          houseId: houseId,
        });
        addedCount++;
      } else if (action === "update" && itemId && item) {
        const updates: any = {};
        if (item.name) updates.name = item.name;
        if (item.category) updates.category = item.category;
        if (item.subcategory !== undefined) updates.subcategory = item.subcategory;
        if (item.quantity !== undefined) updates.quantity = item.quantity;
        if (item.quantityUnit) updates.quantityUnit = item.quantityUnit;
        if (item.location) updates.location = item.location;
        if (item.notes) updates.notes = item.notes;
        onUpdate(itemId, updates);
        updatedCount++;
      } else if (action === "delete" && itemId) {
        onDelete(itemId);
        deletedCount++;
      }
    }

    const parts = [];
    if (addedCount) parts.push(`Added ${addedCount} item${addedCount > 1 ? "s" : ""}`);
    if (updatedCount) parts.push(`Updated ${updatedCount} item${updatedCount > 1 ? "s" : ""}`);
    if (deletedCount) parts.push(`Removed ${deletedCount} item${deletedCount > 1 ? "s" : ""}`);
    if (parts.length) toast.success(parts.join(", "));

    setState("idle");
    setTranscript("");
    setConfirmation("");
    setPendingAction(null);
  }, [pendingAction, onAdd, onUpdate, onDelete, houseId]);

  const cancel = useCallback(() => {
    stopListening();
    setState("idle");
    setTranscript("");
    setConfirmation("");
    setPendingAction(null);
  }, [stopListening]);

  return (
    <>
      {/* Floating mic button */}
      {state === "idle" && (
        <Button
          size="icon"
          onClick={startListening}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          title="Voice command"
        >
          <Mic className="h-6 w-6" />
        </Button>
      )}

      {/* Listening / Processing / Confirming overlay */}
      {state !== "idle" && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-background border-t shadow-2xl rounded-t-2xl p-4 animate-in slide-in-from-bottom">
          <div className="max-w-lg mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {state === "listening" && (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/60 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                    </span>
                    <span className="text-sm font-medium">Listening...</span>
                  </>
                )}
                {state === "processing" && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Processing...</span>
                  </>
                )}
                {state === "confirming" && (
                  <span className="text-sm font-medium">Confirm action</span>
                )}
              </div>
              <Button size="icon" variant="ghost" onClick={cancel} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {transcript && (
              <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
                "{transcript}"
              </p>
            )}

            {state === "confirming" && (
              <>
                <p className="text-sm font-medium">{confirmation}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={executeAction} className="flex-1">
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancel} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {state === "listening" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={stopListening}
                className="w-full gap-2"
              >
                <MicOff className="h-4 w-4" /> Stop
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

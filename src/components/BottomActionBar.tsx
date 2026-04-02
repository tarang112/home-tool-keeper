import { ScanBarcode, ScanLine, Plus, Mail, Mic } from "lucide-react";

interface BottomActionBarProps {
  onAdd: () => void;
  onBarcode: () => void;
  onReceipt: () => void;
  onEmail: () => void;
  onVoice: () => void;
}

export function BottomActionBar({ onAdd, onBarcode, onReceipt, onEmail, onVoice }: BottomActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-background/80 dark:bg-card/80 backdrop-blur-xl border-t">
        <div className="max-w-lg lg:max-w-5xl mx-auto flex items-end justify-around px-2 py-1.5">
          <button onClick={onBarcode} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <ScanBarcode className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Scan</span>
          </button>
          <button onClick={onReceipt} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <ScanLine className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Receipt</span>
          </button>
          {/* Raised FAB */}
          <button
            onClick={onAdd}
            className="relative -mt-5 flex flex-col items-center gap-0.5"
          >
            <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all active:scale-95">
              <Plus className="h-7 w-7" />
            </div>
            <span className="text-[10px] text-primary font-semibold">Add</span>
          </button>
          <button onClick={onEmail} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Email</span>
          </button>
          <button onClick={onVoice} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <Mic className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Voice</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import { ScanBarcode, ScanLine, Plus, Mail, Mic } from "lucide-react";

interface BottomActionBarProps {
  onAdd: () => void;
  onBarcode: () => void;
  onReceipt: () => void;
  onEmail: () => void;
  onVoice: () => void;
}

function NavIcon({ icon: Icon, label, onClick }: { icon: typeof ScanBarcode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 px-2 py-1">
      <div className="h-10 w-10 rounded-full bg-muted/60 dark:bg-muted/30 flex items-center justify-center hover:bg-muted transition-colors">
        <Icon className="h-5 w-5 text-foreground/70" />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </button>
  );
}

export function BottomActionBar({ onAdd, onBarcode, onReceipt, onEmail, onVoice }: BottomActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-background/90 dark:bg-card/90 backdrop-blur-xl border-t">
        <div className="max-w-lg lg:max-w-5xl mx-auto flex items-end justify-around px-1 py-1">
          <NavIcon icon={ScanBarcode} label="Scan" onClick={onBarcode} />
          <NavIcon icon={ScanLine} label="Receipt" onClick={onReceipt} />
          {/* Raised FAB */}
          <button onClick={onAdd} className="relative -mt-6 flex flex-col items-center gap-0.5">
            <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all active:scale-95">
              <Plus className="h-7 w-7" />
            </div>
            <span className="text-[10px] text-primary font-semibold">Add</span>
          </button>
          <NavIcon icon={Mail} label="Email" onClick={onEmail} />
          <NavIcon icon={Mic} label="Voice" onClick={onVoice} />
        </div>
      </div>
    </div>
  );
}

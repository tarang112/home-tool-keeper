import { ScanBarcode, Camera, Plus, Mail, Mic } from "lucide-react";

interface BottomActionBarProps {
  onAdd: () => void;
  onBarcode: () => void;
  onReceipt: () => void;
  onEmail: () => void;
  onVoice: () => void;
}

function NavIcon({ icon: Icon, label, onClick }: { icon: typeof ScanBarcode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 px-3 py-1.5 hover:opacity-70 transition-opacity active:scale-95">
      <Icon className="h-6 w-6 text-foreground/80" strokeWidth={1.5} />
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
    </button>
  );
}

export function BottomActionBar({ onAdd, onBarcode, onReceipt, onEmail, onVoice }: BottomActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-background/95 dark:bg-card/95 backdrop-blur-xl border-t">
        <div className="max-w-lg lg:max-w-5xl mx-auto flex items-end justify-around px-2 py-1.5">
          <NavIcon icon={ScanBarcode} label="Scan" onClick={onBarcode} />
          <NavIcon icon={Camera} label="Receipt" onClick={onReceipt} />
          {/* Raised FAB */}
          <button onClick={onAdd} className="relative -mt-7 flex flex-col items-center gap-0.5">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all active:scale-95">
              <Plus className="h-8 w-8" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] text-primary font-semibold">Add</span>
          </button>
          <NavIcon icon={Mail} label="Email" onClick={onEmail} />
          <NavIcon icon={Mic} label="Voice" onClick={onVoice} />
        </div>
      </div>
    </div>
  );
}

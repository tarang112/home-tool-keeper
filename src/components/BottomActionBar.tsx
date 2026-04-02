import type { ReactNode } from "react";
import { Camera, Plus, Mail, Mic } from "lucide-react";

interface BottomActionBarProps {
  onAdd: () => void;
  onBarcode: () => void;
  onReceipt: () => void;
  onEmail: () => void;
  onVoice: () => void;
}

function BarcodeGlyph() {
  return (
    <div className="flex flex-col items-center justify-center h-6 w-6" aria-hidden="true">
      <div className="flex h-[18px] items-end gap-[1.5px]">
        <span className="h-[16px] w-[1.5px] rounded-full bg-foreground/85" />
        <span className="h-[13px] w-[1px] rounded-full bg-foreground/85" />
        <span className="h-[18px] w-[2px] rounded-full bg-foreground/85" />
        <span className="h-[11px] w-[1px] rounded-full bg-foreground/85" />
        <span className="h-[16px] w-[1.5px] rounded-full bg-foreground/85" />
        <span className="h-[13px] w-[1px] rounded-full bg-foreground/85" />
        <span className="h-[18px] w-[2px] rounded-full bg-foreground/85" />
      </div>
      <span className="text-[5px] leading-none tracking-[0.1em] text-foreground/70">800949</span>
    </div>
  );
}

function NavIcon({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 px-3 py-1.5 hover:opacity-70 transition-opacity active:scale-95">
      {icon}
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
    </button>
  );
}

export function BottomActionBar({ onAdd, onBarcode, onReceipt, onEmail, onVoice }: BottomActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-background/95 dark:bg-card/95 backdrop-blur-xl border-t">
        <div className="max-w-lg lg:max-w-5xl mx-auto flex items-end justify-around px-2 py-1.5">
          <NavIcon icon={<BarcodeGlyph />} label="Scan" onClick={onBarcode} />
          <NavIcon icon={<Camera className="h-6 w-6 text-foreground/80" strokeWidth={1.5} />} label="Receipt" onClick={onReceipt} />
          <button onClick={onAdd} className="relative -mt-7 flex flex-col items-center gap-0.5">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all active:scale-95">
              <Plus className="h-8 w-8" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] text-primary font-semibold">Add</span>
          </button>
          <NavIcon icon={<Mail className="h-6 w-6 text-foreground/80" strokeWidth={1.5} />} label="Email" onClick={onEmail} />
          <NavIcon icon={<Mic className="h-6 w-6 text-foreground/80" strokeWidth={1.5} />} label="Voice" onClick={onVoice} />
        </div>
      </div>
    </div>
  );
}

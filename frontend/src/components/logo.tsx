import { Radio } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Radio className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-base font-semibold tracking-tight text-foreground">
          FieldSignal <span className="text-primary">AI</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          NGO intelligence
        </div>
      </div>
    </div>
  );
}
import { Lock } from "lucide-react";

export function PrivacyNote() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Private information stays private. FieldSignal only routes public signals and
        permission-based peer insights.
      </span>
    </div>
  );
}
import { FlaskConical } from "lucide-react";

export function DemoNotice() {
  return (
    <div className="flex items-start gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-950">
      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Hackathon demo: there are no user accounts. The demo profile is stored only in this browser;
        saved items and peer chat reset on reload. Backend intelligence items are the only
        server-persisted application data.
      </span>
    </div>
  );
}

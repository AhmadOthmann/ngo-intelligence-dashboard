import { useState } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiImportanceBadge, TypeBadge } from "@/components/priority-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppState } from "@/lib/app-state";
import type { Signal } from "@/lib/types";
import { toast } from "sonner";

const canApplyTone: Record<string, string> = {
  yes: "bg-emerald-50 text-emerald-700",
  check: "bg-amber-50 text-amber-800",
  no: "bg-rose-50 text-rose-700",
};

type Importance = "high" | "medium" | "low";

export function SignalCard({ signal }: { signal: Signal }) {
  const { saveSignal, ignoreSignal } = useAppState();
  const [expanded, setExpanded] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [importance, setImportance] = useState<Importance>("medium");

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/30 sm:p-5">
      <header className="flex flex-wrap items-center gap-2">
        <TypeBadge type={signal.type} />
        {signal.aiImportance && <AiImportanceBadge level={signal.aiImportance} />}
        <span className="text-xs text-muted-foreground">{signal.source}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{signal.date}</span>
      </header>

      <h3 className="mt-2 text-base font-semibold leading-snug text-foreground sm:text-lg">
        {signal.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{signal.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setSaveOpen(true)}>
          <Bookmark className="h-4 w-4" /> Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            ignoreSignal(signal.id);
            toast("Signal ignored.");
          }}
        >
          <X className="h-4 w-4" /> Ignore
        </Button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (
            <>
              Hide details <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show details <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {signal.longSummary && (
            <p className="text-sm leading-relaxed text-foreground/85">{signal.longSummary}</p>
          )}

          {signal.keyPoints && signal.keyPoints.length > 0 && (
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="mb-1 text-xs font-medium text-foreground">Key points</div>
              <ul className="space-y-1 text-xs text-foreground/80">
                {signal.keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {signal.funding && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary/60 p-3 text-xs sm:grid-cols-4">
              <Field label="Deadline" value={signal.funding.deadline} />
              <Field label="Amount" value={signal.funding.amount} />
              <Field label="Funder" value={signal.funding.funder} />
              <div>
                <div className="text-muted-foreground">Can you apply?</div>
                <span
                  className={`mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${canApplyTone[signal.funding.canApply]}`}
                >
                  {signal.funding.canApply}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <div className="text-muted-foreground">Eligibility</div>
                <div className="text-foreground/80">{signal.funding.eligibility}</div>
              </div>
            </div>
          )}

          {signal.peerActivity && signal.peerActivity.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-xs">
                <div className="font-medium text-foreground">Peer activity</div>
                <ul className="text-foreground/80">
                  {signal.peerActivity.map((p, i) => (
                    <li key={i}>· {p.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Original language: {signal.originalLanguage}</span>
            <Button size="sm" variant="ghost" asChild>
              <a href={signal.url ?? "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> View source
              </a>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save signal — choose importance</DialogTitle>
            <DialogDescription>
              {signal.aiImportance ? (
                <>
                  The AI suggested:{" "}
                  <span className="font-medium capitalize text-foreground">
                    {signal.aiImportance}
                  </span>
                  . Please choose how important this is for your organization.
                </>
              ) : (
                "Please choose how important this is for your organization."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(["high", "medium", "low"] as Importance[]).map((lvl) => (
              <label
                key={lvl}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                  importance === lvl
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="importance"
                  checked={importance === lvl}
                  onChange={() => setImportance(lvl)}
                  className="accent-[var(--primary)]"
                />
                <span className="font-medium capitalize text-foreground">{lvl} importance</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveSignal(signal, importance);
                setSaveOpen(false);
                toast.success(`Saved as ${importance} importance`);
              }}
            >
              Save signal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}
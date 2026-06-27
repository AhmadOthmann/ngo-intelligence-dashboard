import { useState } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Languages,
  Loader2,
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
import { itemToSignal, translateItem, translateText } from "@/lib/api";
import type { Signal } from "@/lib/types";
import { toast } from "sonner";

const canApplyTone: Record<string, string> = {
  yes: "bg-emerald-50 text-emerald-700",
  check: "bg-amber-50 text-amber-800",
  no: "bg-rose-50 text-rose-700",
};

const LANGUAGE_OPTIONS = ["German", "French", "English"] as const;
type Importance = "high" | "medium" | "low";

export function SignalCard({ signal }: { signal: Signal }) {
  const { saveSignal, ignoreSignal, profile } = useAppState();
  const [expanded, setExpanded] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [importance, setImportance] = useState<Importance>("medium");
  const [targetLanguage, setTargetLanguage] = useState(
    normalizeTargetLanguage(profile?.language),
  );
  const [translatedText, setTranslatedText] = useState(signal.translatedText ?? "");
  const [translatedLanguage, setTranslatedLanguage] = useState(
    signal.translatedLanguage ?? "",
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const detailPoints = getDetailPoints(signal);

  async function handleTranslate() {
    setIsTranslating(true);
    try {
      const itemId = getBackendItemId(signal.id);
      if (itemId == null) {
        const translated = await translateText(
          signal.longSummary || signal.summary,
          targetLanguage,
        );
        setTranslatedText(cleanTranslationText(translated.translated_text));
        setTranslatedLanguage(translated.target_language);
        return;
      }

      const translated = itemToSignal(await translateItem(itemId, targetLanguage));
      setTranslatedText(cleanTranslationText(translated.translatedText ?? ""));
      setTranslatedLanguage(translated.translatedLanguage ?? targetLanguage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/30 sm:p-5">
      <header className="flex flex-wrap items-center gap-2">
        <TypeBadge type={signal.type} />
        {signal.aiImportance && <AiImportanceBadge level={signal.aiImportance} />}
        <span className="text-xs text-muted-foreground">{signal.source}</span>
        <span className="text-xs text-muted-foreground">/</span>
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
          onClick={() => setExpanded((value) => !value)}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailBlock label="Why this matters" value={signal.whyRecommended} />
            <DetailBlock label="Suggested next step" value={signal.suggestedAction} />
          </div>

          {detailPoints.length > 0 && (
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="mb-1 text-xs font-medium text-foreground">Key details</div>
              <ul className="space-y-1 text-xs text-foreground/80">
                {detailPoints.map((point, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-primary">-</span>
                    <span>{point}</span>
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
                  {signal.peerActivity.map((activity, index) => (
                    <li key={index}>- {activity.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {signal.longSummary && (
            <div className="rounded-xl bg-secondary/60 p-3 text-xs">
              <div className="mb-1 font-medium text-foreground">Source excerpt</div>
              <p className="leading-relaxed text-foreground/80">
                {truncate(signal.longSummary, 420)}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <select
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
                className="rounded-md border border-border bg-card px-2 py-1 text-xs"
              >
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleTranslate()}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                Translate
              </Button>
            </div>
            {translatedText && (
              <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm leading-relaxed text-foreground/85">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Translation {translatedLanguage}
                </span>
                {translatedText}
              </p>
            )}
          </div>

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
            <DialogTitle>Save signal - choose importance</DialogTitle>
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
            {(["high", "medium", "low"] as Importance[]).map((level) => (
              <label
                key={level}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                  importance === level
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="importance"
                  checked={importance === level}
                  onChange={() => setImportance(level)}
                  className="accent-[var(--primary)]"
                />
                <span className="font-medium capitalize text-foreground">{level} importance</span>
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

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3 text-xs">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      <p className="leading-relaxed text-foreground/80">{value}</p>
    </div>
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

function getBackendItemId(id: string): number | null {
  const match = /^item-(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

function normalizeTargetLanguage(language: string | undefined): string {
  return LANGUAGE_OPTIONS.find((option) => option.toLowerCase() === language?.toLowerCase()) ?? "German";
}

function cleanTranslationText(text: string): string {
  return text
    .replace(/^\[Demo translation fallback: ([^\]]+)\]\s*/, "[$1 preview] ")
    .replace(/^\[Translation preview: ([^\]]+)\]\s*/, "[$1 preview] ");
}

function getDetailPoints(signal: Signal): string[] {
  if (signal.keyPoints?.length) return signal.keyPoints.slice(0, 4);
  if (!signal.longSummary) return [];

  return signal.longSummary
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((sentence) => truncate(sentence, 180));
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

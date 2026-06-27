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
import { translateText } from "@/lib/api";
import {
  formatTranslation,
  importanceLabel,
  languageOptionLabel,
  localeFromLanguage,
  translate,
} from "@/lib/i18n";
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
  const language = profile?.language;
  const [expanded, setExpanded] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [importance, setImportance] = useState<Importance>("medium");
  const [targetLanguage, setTargetLanguage] = useState(
    normalizeTargetLanguage(profile?.language),
  );
  const [translatedSignal, setTranslatedSignal] = useState<Signal | null>(null);
  const [translatedLanguage, setTranslatedLanguage] = useState(
    signal.translatedLanguage ?? "",
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const displaySignal = translatedSignal ?? signal;
  const detailPoints = getDetailPoints(displaySignal);

  async function handleTranslate() {
    setIsTranslating(true);
    try {
      const translated = await translateSignalContent(signal, targetLanguage);
      setTranslatedSignal(translated);
      setTranslatedLanguage(targetLanguage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${translate(language, "translation")} failed`);
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/30 sm:p-5">
      <header className="flex flex-wrap items-center gap-2">
        <TypeBadge type={displaySignal.type} language={language} />
        {displaySignal.aiImportance && <AiImportanceBadge level={displaySignal.aiImportance} language={language} />}
        <span className="text-xs text-muted-foreground">{displaySignal.source}</span>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs text-muted-foreground">{displaySignal.date}</span>
        {translatedSignal && translatedLanguage && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {translate(language, "translation")} {translatedLanguage}
          </span>
        )}
      </header>

      <h3 className="mt-2 text-base font-semibold leading-snug text-foreground sm:text-lg">
        {displaySignal.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{displaySignal.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setSaveOpen(true)}>
          <Bookmark className="h-4 w-4" /> {translate(language, "save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            ignoreSignal(signal.id);
            toast(translate(language, "signalIgnored"));
          }}
        >
          <X className="h-4 w-4" /> {translate(language, "ignore")}
        </Button>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (
            <>
              {translate(language, "hideDetails")} <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              {translate(language, "showDetails")} <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailBlock label={translate(language, "whyThisMatters")} value={displaySignal.whyRecommended} />
            <DetailBlock label={translate(language, "suggestedNextStep")} value={displaySignal.suggestedAction} />
          </div>

          {detailPoints.length > 0 && (
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="mb-1 text-xs font-medium text-foreground">
                {translate(language, "keyDetails")}
              </div>
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

          {displaySignal.funding && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary/60 p-3 text-xs sm:grid-cols-4">
              <Field label={translate(language, "deadline")} value={displaySignal.funding.deadline} />
              <Field label={translate(language, "amount")} value={displaySignal.funding.amount} />
              <Field label={translate(language, "funder")} value={displaySignal.funding.funder} />
              <div>
                <div className="text-muted-foreground">{translate(language, "canYouApply")}</div>
                <span
                  className={`mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${canApplyTone[displaySignal.funding.canApply]}`}
                >
                  {canApplyLabel(displaySignal.funding.canApply, language)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <div className="text-muted-foreground">{translate(language, "eligibility")}</div>
                <div className="text-foreground/80">{displaySignal.funding.eligibility}</div>
              </div>
            </div>
          )}

          {displaySignal.peerActivity && displaySignal.peerActivity.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-xs">
                <div className="font-medium text-foreground">{translate(language, "peerActivity")}</div>
                <ul className="text-foreground/80">
                  {displaySignal.peerActivity.map((activity, index) => (
                    <li key={index}>- {activity.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {displaySignal.longSummary && (
            <div className="rounded-xl bg-secondary/60 p-3 text-xs">
              <div className="mb-1 font-medium text-foreground">
                {translate(language, "sourceExcerpt")}
              </div>
              <p className="leading-relaxed text-foreground/80">
                {truncate(displaySignal.longSummary, 420)}
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
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {languageOptionLabel(language, option)}
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
                {translate(language, "translate")}
              </Button>
            </div>
            {translatedSignal && translatedLanguage && (
              <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                {translate(language, "translation")} {translatedLanguage}:{" "}
                {translationCompleteLabel(language)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {translate(language, "originalLanguage")}: {signal.originalLanguage}
            </span>
            <Button size="sm" variant="ghost" asChild>
              <a href={displaySignal.url ?? "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> {translate(language, "viewSource")}
              </a>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate(language, "saveSignalTitle")}</DialogTitle>
            <DialogDescription>
              {displaySignal.aiImportance ? (
                <>
                  {translate(language, "theAiSuggested")}{" "}
                  <span className="font-medium capitalize text-foreground">
                    {importanceLabel(language, displaySignal.aiImportance)}
                  </span>
                  . {translate(language, "chooseImportance")}
                </>
              ) : (
                translate(language, "chooseImportance")
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
                <span className="font-medium text-foreground">
                  {importanceLabel(language, level)}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              {translate(language, "cancel")}
            </Button>
            <Button
              onClick={() => {
                saveSignal(displaySignal, importance);
                setSaveOpen(false);
                toast.success(
                  formatTranslation(language, "savedAs", {
                    importance: importanceLabel(language, importance).toLowerCase(),
                  }),
                );
              }}
            >
              {translate(language, "saveSignal")}
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

function normalizeTargetLanguage(language: string | undefined): string {
  return LANGUAGE_OPTIONS.find((option) => option.toLowerCase() === language?.toLowerCase()) ?? "German";
}

async function translateSignalContent(signal: Signal, targetLanguage: string): Promise<Signal> {
  let attempted = 0;
  let translated = 0;

  async function field(value: string): Promise<string>;
  async function field(value: string | undefined): Promise<string | undefined>;
  async function field(value: string | undefined): Promise<string | undefined> {
    if (!value?.trim()) return value;
    attempted += 1;
    try {
      const result = await translateText(value, targetLanguage);
      const cleaned = cleanTranslationText(result.translated_text);
      if (!cleaned) return value;
      translated += 1;
      return cleaned;
    } catch {
      return value;
    }
  }

  const [
    title,
    summary,
    longSummary,
    whyRecommended,
    suggestedAction,
    source,
    date,
  ] = await Promise.all([
    field(signal.title),
    field(signal.summary),
    field(signal.longSummary),
    field(signal.whyRecommended),
    field(signal.suggestedAction),
    field(signal.source),
    field(signal.date),
  ]);

  const keyPoints = signal.keyPoints
    ? await Promise.all(signal.keyPoints.map((point) => field(point)))
    : undefined;
  const peerActivity = signal.peerActivity
    ? await Promise.all(
        signal.peerActivity.map(async (activity) => ({
          ...activity,
          text: await field(activity.text),
        })),
      )
    : undefined;
  const funding = signal.funding
    ? {
        ...signal.funding,
        deadline: await field(signal.funding.deadline),
        amount: await field(signal.funding.amount),
        funder: await field(signal.funding.funder),
        eligibility: await field(signal.funding.eligibility),
      }
    : undefined;

  if (attempted > 0 && translated === 0) {
    throw new Error(translate(targetLanguage, "translationProviderEmpty"));
  }

  return {
    ...signal,
    title,
    source,
    date,
    summary,
    longSummary,
    keyPoints,
    whyRecommended,
    peerActivity,
    suggestedAction,
    funding,
    translatedLanguage: targetLanguage,
  };
}

function canApplyLabel(value: "yes" | "check" | "no", language: string | undefined): string {
  const locale = localeFromLanguage(language);
  const labels = {
    en: { yes: "yes", check: "check", no: "no" },
    fr: { yes: "oui", check: "a verifier", no: "non" },
    de: { yes: "ja", check: "pruefen", no: "nein" },
  } as const;
  return labels[locale][value];
}

function translationCompleteLabel(language: string | undefined): string {
  const locale = localeFromLanguage(language);
  if (locale === "fr") return "tout le contenu visible de ce signal est traduit.";
  if (locale === "de") return "alle sichtbaren Inhalte dieses Signals sind uebersetzt.";
  return "all visible content in this signal is translated.";
}

function cleanTranslationText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || isTranslationPreview(trimmed)) return "";
  return trimmed;
}

function isTranslationPreview(text: string): boolean {
  return (
    /^\[Demo translation fallback: [^\]]+\]\s*/.test(text) ||
    /^\[Translation preview: [^\]]+\]\s*/.test(text) ||
    /^\[(German|French|English) preview\]\s*/.test(text)
  );
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

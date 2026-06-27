import {
  importanceLabel,
  translate,
  type ImportanceKey,
  typeLabel,
} from "@/lib/i18n";
import type { Priority } from "@/lib/types";

const map: Record<Priority, { dot: string; cls: string }> = {
  urgent: {
    dot: "bg-[var(--priority-urgent)]",
    cls: "bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent)] border-[var(--priority-urgent)]/20",
  },
  relevant: {
    dot: "bg-[var(--priority-relevant)]",
    cls: "bg-[var(--priority-relevant-bg)] text-[var(--priority-relevant)] border-[var(--priority-relevant)]/20",
  },
  info: {
    dot: "bg-[var(--priority-info)]",
    cls: "bg-[var(--priority-info-bg)] text-[var(--priority-info)] border-[var(--priority-info)]/30",
  },
};

export function PriorityBadge({
  priority,
  language,
}: {
  priority: Priority;
  language?: string;
}) {
  const m = map[priority];
  const labelKey: ImportanceKey = priority === "relevant" ? "important" : priority;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${m.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {importanceLabel(language, labelKey)}
    </span>
  );
}

export function TypeBadge({ type, language }: { type: string; language?: string }) {
  const tones: Record<string, string> = {
    news: "bg-sky-50 text-sky-700 border-sky-200",
    funding: "bg-emerald-50 text-emerald-700 border-emerald-200",
    report: "bg-violet-50 text-violet-700 border-violet-200",
    peer: "bg-amber-50 text-amber-800 border-amber-200",
  };
  const tone = tones[type] ?? "bg-secondary text-secondary-foreground border-border";
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {typeLabel(language, type)}
    </span>
  );
}

export type AiImportance = "urgent" | "important" | "medium" | "low";

export function AiImportanceBadge({
  level,
  language,
}: {
  level: AiImportance;
  language?: string;
}) {
  const tones: Record<AiImportance, string> = {
    urgent: "bg-rose-50 text-rose-700 border-rose-200",
    important: "bg-amber-50 text-amber-800 border-amber-200",
    medium: "bg-sky-50 text-sky-700 border-sky-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${tones[level]}`}
      title={`${translate(language, "theAiSuggested")} ${importanceLabel(language, level)}`}
    >
      <span className="opacity-70">AI:</span> {importanceLabel(language, level)}
    </span>
  );
}

import type { Priority } from "@/lib/types";

const map: Record<Priority, { label: string; dot: string; cls: string }> = {
  urgent: {
    label: "Urgent",
    dot: "bg-[var(--priority-urgent)]",
    cls: "bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent)] border-[var(--priority-urgent)]/20",
  },
  relevant: {
    label: "Relevant",
    dot: "bg-[var(--priority-relevant)]",
    cls: "bg-[var(--priority-relevant-bg)] text-[var(--priority-relevant)] border-[var(--priority-relevant)]/20",
  },
  info: {
    label: "For information",
    dot: "bg-[var(--priority-info)]",
    cls: "bg-[var(--priority-info-bg)] text-[var(--priority-info)] border-[var(--priority-info)]/30",
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const m = map[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${m.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    news: "News",
    funding: "Funding",
    report: "Report",
    peer: "Peer Signal",
  };
  const tones: Record<string, string> = {
    news: "bg-sky-50 text-sky-700 border-sky-200",
    funding: "bg-emerald-50 text-emerald-700 border-emerald-200",
    report: "bg-violet-50 text-violet-700 border-violet-200",
    peer: "bg-amber-50 text-amber-800 border-amber-200",
  };
  const tone = tones[type] ?? "bg-secondary text-secondary-foreground border-border";
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {labels[type] ?? type}
    </span>
  );
}

export type AiImportance = "urgent" | "important" | "medium" | "low";

export function AiImportanceBadge({ level }: { level: AiImportance }) {
  const labels: Record<AiImportance, string> = {
    urgent: "Urgent",
    important: "Important",
    medium: "Medium",
    low: "Low",
  };
  const tones: Record<AiImportance, string> = {
    urgent: "bg-rose-50 text-rose-700 border-rose-200",
    important: "bg-amber-50 text-amber-800 border-amber-200",
    medium: "bg-sky-50 text-sky-700 border-sky-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${tones[level]}`}
      title="AI suggestion — your final importance is set when you save."
    >
      <span className="opacity-70">AI importance:</span> {labels[level]}
    </span>
  );
}
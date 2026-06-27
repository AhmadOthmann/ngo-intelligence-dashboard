import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  NotebookPen,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypeBadge } from "@/components/priority-badge";
import { useAppState } from "@/lib/app-state";
import type { SavedCategory, SavedItem, SavedStatus } from "@/lib/types";
import { toast } from "sonner";
import { BURUNDI_KIDS } from "@/lib/demo-data";

export const Route = createFileRoute("/app/saved")({
  head: () => ({ meta: [{ title: "Tags - Impact Atlas" }] }),
  component: SavedPage,
});

const SECTIONS: { key: SavedCategory; label: string }[] = [
  { key: "funding_pipeline", label: "Funding" },
  { key: "news_press", label: "News" },
  { key: "field_intel", label: "Reports" },
  { key: "peer", label: "Peer Signals" },
  { key: "watchlist", label: "Watchlist" },
];

const FILTERS = ["All", "Funding", "News", "Reports", "Peer Signals"] as const;
const SORTS = ["Most important", "Deadline soon", "Newest saved", "Oldest saved"] as const;

const STATUS_OPTIONS: SavedStatus[] = [
  "saved",
  "reviewing",
  "contacted",
  "digest",
  "applying",
  "archived",
];

const STATUS_LABEL: Record<SavedStatus, string> = {
  saved: "Saved",
  reviewing: "Reviewing",
  contacted: "Contacted peer NGO",
  digest: "Added to digest",
  applying: "Applying",
  archived: "Archived",
};

function SavedPage() {
  const { saved, updateSavedStatus, addNote, archive, profile } = useAppState();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Most important");

  const filtered = useMemo(() => {
    let list = saved;
    if (filter === "Funding") list = list.filter((i) => i.signal.type === "funding");
    else if (filter === "News") list = list.filter((i) => i.signal.type === "news");
    else if (filter === "Reports") list = list.filter((i) => i.signal.type === "report");
    else if (filter === "Peer Signals") list = list.filter((i) => i.signal.type === "peer");
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((i) => i.signal.title.toLowerCase().includes(needle));
    }
    return list;
  }, [saved, filter, q]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your NGO's organized knowledge base for funding, news, reports, and peer notes.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tagged items" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Filter:
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as (typeof FILTERS)[number])}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              {FILTERS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Sort:
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              {SORTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No tagged signals yet. Save signals from your Inbox to build your knowledge base.
        </div>
      )}

      {SECTIONS.map((section) => {
        const items = filtered.filter((i) => i.category === section.key);
        if (items.length === 0) return null;
        return (
          <section key={section.key}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <SavedCard
                  key={item.signal.id}
                  item={item}
                  onStatus={(s) => updateSavedStatus(item.signal.id, s)}
                  onNote={(n) => addNote(item.signal.id, n)}
                  onArchive={() => archive(item.signal.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div className="text-xs text-muted-foreground">
        Profile in use: <span className="font-medium text-foreground">{profile?.name ?? BURUNDI_KIDS.name}</span>
      </div>
    </div>
  );
}

function SavedCard({
  item,
  onStatus,
  onNote,
  onArchive,
}: {
  item: SavedItem;
  onStatus: (s: SavedStatus) => void;
  onNote: (n: string) => void;
  onArchive: () => void;
}) {
  const [note, setNote] = useState(item.note ?? "");
  const [showNote, setShowNote] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const s = item.signal;
  const importanceTone: Record<string, string> = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-800 border-amber-200",
    low: "bg-slate-50 text-slate-700 border-slate-200",
  };
  const canApplyTone: Record<string, string> = {
    yes: "bg-emerald-50 text-emerald-700",
    check: "bg-amber-50 text-amber-800",
    no: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={s.type} />
        {item.importance && (
          <span
            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${importanceTone[item.importance]}`}
          >
            {item.importance} importance
          </span>
        )}
        <span className="text-xs text-muted-foreground">Saved {item.savedAt}</span>
        <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          Status:
          <select
            value={item.status}
            onChange={(e) => onStatus(e.target.value as SavedStatus)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>{STATUS_LABEL[o]}</option>
            ))}
          </select>
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">{s.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{s.summary}</p>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {s.longSummary && (
            <p className="text-sm leading-relaxed text-foreground/85">{s.longSummary}</p>
          )}
          {s.keyPoints && s.keyPoints.length > 0 && (
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="mb-1 text-xs font-medium text-foreground">Key points</div>
              <ul className="space-y-1 text-xs text-foreground/80">
                {s.keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.funding && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary/60 p-3 text-xs sm:grid-cols-4">
              <div><div className="text-muted-foreground">Deadline</div><div className="font-medium">{s.funding.deadline}</div></div>
              <div><div className="text-muted-foreground">Amount</div><div className="font-medium">{s.funding.amount}</div></div>
              <div><div className="text-muted-foreground">Funder</div><div className="font-medium">{s.funding.funder}</div></div>
              <div>
                <div className="text-muted-foreground">Can you apply?</div>
                <span className={`mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${canApplyTone[s.funding.canApply]}`}>{s.funding.canApply}</span>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <div className="text-muted-foreground">Eligibility</div>
                <div className="text-foreground/80">{s.funding.eligibility}</div>
              </div>
            </div>
          )}
          {s.peerActivity && s.peerActivity.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-xs">
                <div className="font-medium text-foreground">Peer activity</div>
                <ul className="text-foreground/80">
                  {s.peerActivity.map((p, i) => (<li key={i}>· {p.text}</li>))}
                </ul>
              </div>
            </div>
          )}
          {item.note && (
            <div className="rounded-md border border-dashed border-border p-2 text-xs text-foreground/80">
              📝 {item.note}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{s.source} · {s.date}</span>
            <Button size="sm" variant="ghost" asChild>
              <a href={s.url ?? "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> View source
              </a>
            </Button>
          </div>
        </div>
      )}

      {showNote && (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a private note…"
            className="w-full rounded-md border border-border bg-card p-2 text-sm"
          />
          <Button size="sm" onClick={() => { onNote(note); setShowNote(false); toast.success("Note saved"); }}>Save note</Button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowNote((v) => !v)}>
          <NotebookPen className="h-4 w-4" /> Add note
        </Button>
        <Button size="sm" variant="outline" onClick={() => { onStatus("contacted"); toast("Marked as contacted"); }}>
          <MessageSquare className="h-4 w-4" /> Ask peer
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { onArchive(); toast("Archived"); }}>
          <Archive className="h-4 w-4" /> Archive
        </Button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (<>Hide details <ChevronUp className="h-3.5 w-3.5" /></>) : (<>Show details <ChevronDown className="h-3.5 w-3.5" /></>)}
        </button>
      </div>
    </div>
  );
}

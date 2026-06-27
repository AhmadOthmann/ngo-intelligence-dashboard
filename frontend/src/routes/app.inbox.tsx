import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SignalCard } from "@/components/signal-card";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/app/inbox")({
  head: () => ({ meta: [{ title: "Signal Inbox — FieldSignal AI" }] }),
  component: InboxPage,
});

const FILTERS = ["All", "News", "Funding", "Peer Signals", "Reports"] as const;
const SORTS = ["Most relevant", "Most urgent", "Newest", "Deadline soon"] as const;

function InboxPage() {
  const { signals, ignoredIds, saved, profile } = useAppState();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Most relevant");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const savedIds = new Set(saved.map((i) => i.signal.id));
    let list = signals.filter((s) => !ignoredIds.has(s.id) && !savedIds.has(s.id));
    if (filter === "News") list = list.filter((s) => s.type === "news");
    else if (filter === "Funding") list = list.filter((s) => s.type === "funding");
    else if (filter === "Peer Signals") list = list.filter((s) => s.type === "peer");
    else if (filter === "Reports") list = list.filter((s) => s.type === "report");
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(needle) ||
          s.summary.toLowerCase().includes(needle),
      );
    }
    if (sort === "Most urgent") {
      const rank = { urgent: 0, relevant: 1, info: 2 } as const;
      list = [...list].sort((a, b) => rank[a.priority] - rank[b.priority]);
    }
    return list;
  }, [signals, ignoredIds, saved, filter, sort, q]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {profile?.name ?? "your NGO"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here are the most relevant signals for your organization today.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search signals, sources, keywords…"
            className="pl-9"
          />
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

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No signals match your filters yet. AI keeps learning from what you save and ignore.
          </div>
        ) : (
          filtered.map((s) => <SignalCard key={s.id} signal={s} />)
        )}
      </div>
    </div>
  );
}
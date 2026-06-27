import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Database,
  RefreshCw,
  Search,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignalCard } from "@/components/signal-card";
import { useAppState } from "@/lib/app-state";
import { getApiStatus, getFunding, getItemsPage, type ApiStatus } from "@/lib/api";

export const Route = createFileRoute("/app/inbox")({
  head: () => ({ meta: [{ title: "Signal Inbox - FieldSignal AI" }] }),
  component: InboxPage,
});

const FILTERS = ["All", "News", "Funding", "Peer Signals", "Reports"] as const;
const SORTS = ["Most relevant", "Most urgent", "Newest", "Deadline soon"] as const;
const SUMMARY_LIMIT = 100;

interface InboxSummary {
  signals: number;
  fundingLeads: number;
  prioritySignals: number;
  status: ApiStatus | null;
}

function InboxPage() {
  const {
    signals,
    signalSource,
    isLoadingSignals,
    signalError,
    ingestResult,
    hasMoreSignals,
    refreshSignals,
    loadMoreSignals,
    ingestFeeds,
    ignoredIds,
    saved,
    profile,
  } = useAppState();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Most relevant");
  const [q, setQ] = useState("");
  const [summary, setSummary] = useState<InboxSummary | null>(null);

  const filtered = useMemo(() => {
    const savedIds = new Set(saved.map((i) => i.signal.id));
    let list = signals.filter((s) => !ignoredIds.has(s.id) && !savedIds.has(s.id));
    if (filter === "News") list = list.filter((s) => s.type === "news");
    else if (filter === "Funding") list = list.filter((s) => s.type === "funding");
    else if (filter === "Peer Signals") list = list.filter((s) => s.type === "peer");
    else if (filter === "Reports") list = list.filter((s) => s.type === "report");

    if (signalSource === "demo" && q.trim()) {
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
  }, [signals, ignoredIds, saved, filter, sort, q, signalSource]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  const fallbackSummary = useMemo<InboxSummary>(
    () => ({
      signals: signals.length,
      fundingLeads: signals.filter((signal) => signal.type === "funding").length,
      prioritySignals: signals.filter((signal) => signal.priority === "urgent").length,
      status: null,
    }),
    [signals],
  );
  const activeSummary = summary ?? fallbackSummary;

  async function loadSummary() {
    try {
      const [status, page, funding] = await Promise.all([
        getApiStatus(),
        getItemsPage({ limit: SUMMARY_LIMIT, offset: 0 }),
        getFunding(SUMMARY_LIMIT),
      ]);
      setSummary({
        signals: page.count,
        fundingLeads: funding.length,
        prioritySignals: page.items.filter((item) => (item.relevance_score ?? 0) >= 75).length,
        status,
      });
    } catch {
      setSummary(null);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  async function handleRefresh() {
    await Promise.all([refreshSignals(q), loadSummary()]);
  }

  async function handleUpdateSignals() {
    await ingestFeeds(q);
    await loadSummary();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {greeting}, {profile?.name ?? "your NGO"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here are the most relevant signals for your organization today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={isLoadingSignals}>
              <RefreshCw className={`h-4 w-4 ${isLoadingSignals ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => void handleUpdateSignals()} disabled={isLoadingSignals}>
              <RefreshCw className={`h-4 w-4 ${isLoadingSignals ? "animate-spin" : ""}`} />
              Update Signals
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {ingestResult && (
            <span>
              Last update: {ingestResult.ingested} new signal{ingestResult.ingested === 1 ? "" : "s"}
              {ingestResult.errors.length > 0 ? `, ${ingestResult.errors.length} source issue${ingestResult.errors.length === 1 ? "" : "s"}` : ""}
            </span>
          )}
        </div>
        {signalError && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {signalError}. Showing sample signals until live sources are available.
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Database} label="Signals" value={String(activeSummary.signals)} />
        <Metric icon={BadgeDollarSign} label="Funding leads" value={String(activeSummary.fundingLeads)} />
        <Metric icon={Wand2} label="Priority signals" value={String(activeSummary.prioritySignals)} />
        <Metric
          icon={Wand2}
          label="Analysis"
          value={
            activeSummary.status
              ? activeSummary.status.openai_configured
                ? "Enhanced"
                : "Basic"
              : "Basic"
          }
        />
      </div>

      <div className="space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void refreshSignals(q);
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search signals by keyword"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" disabled={isLoadingSignals}>
            Search
          </Button>
        </form>
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

      {signalSource === "backend" && hasMoreSignals && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void loadMoreSignals()} disabled={isLoadingSignals}>
            {isLoadingSignals ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 truncate text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

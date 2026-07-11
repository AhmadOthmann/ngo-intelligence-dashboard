import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Database, RefreshCw, Search, Wand2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignalCard } from "@/components/signal-card";
import { useAppState } from "@/lib/app-state";
import { getApiStatus, getFunding, getItemsPage, type ApiStatus } from "@/lib/api";
import {
  filterLabel,
  greeting,
  sortLabel,
  translate,
  type FilterKey,
  type SortKey,
} from "@/lib/i18n";
import type { Signal } from "@/lib/types";

export const Route = createFileRoute("/app/inbox")({
  head: () => ({ meta: [{ title: "Signal Inbox - Impact Atlas" }] }),
  component: InboxPage,
});

const FILTERS: FilterKey[] = ["all", "news", "funding", "peer", "reports"];
const SORTS: SortKey[] = ["mostRelevant", "mostUrgent", "newest", "deadlineSoon"];
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
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("mostRelevant");
  const [q, setQ] = useState("");
  const [summary, setSummary] = useState<InboxSummary | null>(null);

  const filtered = useMemo(() => {
    const savedIds = new Set(saved.map((i) => i.signal.id));
    let list = signals.filter((s) => !ignoredIds.has(s.id) && !savedIds.has(s.id));
    if (filter === "news") list = list.filter((s) => s.type === "news");
    else if (filter === "funding") list = list.filter((s) => s.type === "funding");
    else if (filter === "peer") list = list.filter((s) => s.type === "peer");
    else if (filter === "reports") list = list.filter((s) => s.type === "report");

    if (signalSource === "demo" && q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (s) => s.title.toLowerCase().includes(needle) || s.summary.toLowerCase().includes(needle),
      );
    }

    return sortSignals(list, sort);
  }, [signals, ignoredIds, saved, filter, sort, q, signalSource]);

  const language = profile?.language;
  const localizedGreeting = useMemo(() => greeting(language), [language]);

  const fallbackSummary = useMemo<InboxSummary>(
    () => ({
      signals: signals.length,
      fundingLeads: signals.filter((signal) => signal.type === "funding").length,
      prioritySignals: signals.filter((signal) => signal.priority === "urgent").length,
      status: null,
    }),
    [signals],
  );
  const activeSummary = signalSource === "backend" && summary ? summary : fallbackSummary;

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
              {localizedGreeting}, {profile?.name ?? translate(language, "yourNgo")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{inboxSubtitle(language)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={isLoadingSignals}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingSignals ? "animate-spin" : ""}`} />
              {translate(language, "refresh")}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleUpdateSignals()}
              disabled={isLoadingSignals}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingSignals ? "animate-spin" : ""}`} />
              {translate(language, "updateSignals")}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            className={`rounded-full px-2 py-1 font-medium ${
              signalSource === "backend"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {signalSource === "backend"
              ? "Backend data"
              : isLoadingSignals
                ? "Static demo data (backend loading)"
                : "Static demo data"}
          </span>
          {ingestResult && (
            <span>
              {translate(language, "lastUpdate")}: {ingestResult.ingested}{" "}
              {translate(language, ingestResult.ingested === 1 ? "newSignal" : "newSignals")}
              {ingestResult.errors.length > 0
                ? `, ${ingestResult.errors.length} ${translate(
                    language,
                    ingestResult.errors.length === 1 ? "sourceIssue" : "sourceIssues",
                  )}`
                : ""}
            </span>
          )}
        </div>
      </div>

      {signalError && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <span className="font-medium">
            {signalSource === "demo" ? "Backend data is unavailable." : "Backend refresh failed."}
          </span>{" "}
          {signalError}.{" "}
          {signalSource === "demo"
            ? "The signals below are static examples, not live backend results."
            : "The signals below are the last backend results loaded in this browser session."}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Database}
          label={translate(language, "signals")}
          value={String(activeSummary.signals)}
        />
        <Metric
          icon={BadgeDollarSign}
          label={translate(language, "fundingLeads")}
          value={String(activeSummary.fundingLeads)}
        />
        <Metric
          icon={Wand2}
          label={translate(language, "prioritySignals")}
          value={String(activeSummary.prioritySignals)}
        />
        <Metric
          icon={Wand2}
          label={translate(language, "analysis")}
          value={
            activeSummary.status
              ? activeSummary.status.openai_configured
                ? translate(language, "enhanced")
                : translate(language, "basic")
              : translate(language, "basic")
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
              placeholder={translate(language, "searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" disabled={isLoadingSignals}>
            {translate(language, "search")}
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {translate(language, "filter")}:
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterKey)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {filterLabel(language, f)}
                </option>
              ))}
            </select>
          </label>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {translate(language, "sort")}:
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {sortLabel(language, s)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {translate(language, "noSignals")}
          </div>
        ) : (
          filtered.map((s) => <SignalCard key={s.id} signal={s} />)
        )}
      </div>

      {signalSource === "backend" && hasMoreSignals && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void loadMoreSignals()}
            disabled={isLoadingSignals}
          >
            {isLoadingSignals ? translate(language, "loading") : translate(language, "loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

function inboxSubtitle(language: string | undefined): string {
  const locale = language?.trim().toLowerCase() ?? "";
  if (locale.startsWith("german") || locale === "de" || locale === "deutsch") {
    return "Hier sind die aktuell im Backend oder statischen Demo-Datensatz verfuegbaren Signale.";
  }
  if (locale.startsWith("french") || locale === "fr" || locale.startsWith("franc")) {
    return "Voici les signaux actuellement disponibles dans le backend ou le jeu de demo statique.";
  }
  return "Signals currently available from the backend or static demo dataset.";
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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

function sortSignals(signals: Signal[], sort: SortKey): Signal[] {
  const sorted = [...signals];

  if (sort === "mostRelevant") {
    return sorted.sort(
      (a, b) =>
        relevanceRank(a) - relevanceRank(b) ||
        priorityRank(a) - priorityRank(b) ||
        signalDate(b) - signalDate(a),
    );
  }

  if (sort === "mostUrgent") {
    return sorted.sort(
      (a, b) =>
        priorityRank(a) - priorityRank(b) ||
        deadlineDate(a) - deadlineDate(b) ||
        relevanceRank(a) - relevanceRank(b),
    );
  }

  if (sort === "newest") {
    return sorted.sort((a, b) => signalDate(b) - signalDate(a));
  }

  return sorted.sort(
    (a, b) => deadlineDate(a) - deadlineDate(b) || relevanceRank(a) - relevanceRank(b),
  );
}

function relevanceRank(signal: Signal): number {
  const importance = signal.aiImportance;
  if (importance === "urgent") return 0;
  if (importance === "important") return 1;
  if (importance === "medium") return 2;
  if (importance === "low") return 3;
  return signal.priority === "urgent" ? 0 : signal.priority === "relevant" ? 2 : 4;
}

function priorityRank(signal: Signal): number {
  return signal.priority === "urgent" ? 0 : signal.priority === "relevant" ? 1 : 2;
}

function signalDate(signal: Signal): number {
  const parsed = Date.parse(signal.dateIso ?? "");
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function deadlineDate(signal: Signal): number {
  const parsed = Date.parse(signal.funding?.deadlineIso ?? "");
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

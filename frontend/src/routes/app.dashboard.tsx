import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Database,
  ExternalLink,
  Languages,
  Loader2,
  RefreshCw,
  Rss,
  Search,
  Server,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  analyzeAll,
  analyzeItem,
  getApiStatus,
  getDigest,
  getFunding,
  getItems,
  ingestRss,
  translateItem,
  type ApiStatus,
  type BackendItem,
  type DigestResult,
} from "@/lib/api";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - FieldSignal AI" }] }),
  component: DashboardPage,
});

const PAGE_LIMIT = 100;
const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "news", label: "News" },
  { value: "funding", label: "Funding" },
  { value: "policy", label: "Policy" },
  { value: "research", label: "Research" },
  { value: "other", label: "Other" },
] as const;
const LANGUAGE_OPTIONS = ["German", "French", "English"] as const;

type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]["value"];
type ActionState = "refresh" | "ingest" | "analyze-all" | "analyze-item" | "translate" | null;

function DashboardPage() {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [items, setItems] = useState<BackendItem[]>([]);
  const [fundingItems, setFundingItems] = useState<BackendItem[]>([]);
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [fundingOnly, setFundingOnly] = useState(false);
  const [targetLanguage, setTargetLanguage] =
    useState<(typeof LANGUAGE_OPTIONS)[number]>("German");
  const [action, setAction] = useState<ActionState>("refresh");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedItem = useMemo(() => {
    const allVisibleItems = uniqueItems([...items, ...fundingItems]);
    return allVisibleItems.find((item) => item.id === selectedId) ?? allVisibleItems[0] ?? null;
  }, [fundingItems, items, selectedId]);

  async function loadDashboard(
    filters = { q, category, fundingOnly },
    nextAction: ActionState = "refresh",
  ) {
    setAction(nextAction);
    setError(null);
    try {
      const [nextStatus, nextItems, nextFunding, nextDigest] = await Promise.all([
        getApiStatus(),
        getItems({
          q: filters.q,
          category: filters.category === "all" ? undefined : filters.category,
          fundingOnly: filters.fundingOnly,
          limit: PAGE_LIMIT,
          offset: 0,
        }),
        getFunding(PAGE_LIMIT),
        getDigest(),
      ]);

      const visibleItems = uniqueItems([...nextItems, ...nextFunding]);
      setStatus(nextStatus);
      setItems(nextItems);
      setFundingItems(nextFunding);
      setDigest(nextDigest);
      setSelectedId((current) =>
        visibleItems.some((item) => item.id === current) ? current : visibleItems[0]?.id ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard data could not be loaded");
    } finally {
      setAction(null);
    }
  }

  useEffect(() => {
    void loadDashboard({ q: "", category: "all", fundingOnly: false });
  }, []);

  async function handleIngest() {
    setNotice(null);
    setError(null);
    setAction("ingest");
    try {
      const result = await ingestRss();
      setNotice(
        `RSS sync added ${result.ingested} item${result.ingested === 1 ? "" : "s"}${
          result.errors.length ? ` with ${result.errors.length} feed error(s)` : ""
        }.`,
      );
      await loadDashboard(undefined, "refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "RSS ingestion failed");
      setAction(null);
    }
  }

  async function handleAnalyzeAll() {
    setNotice(null);
    setError(null);
    setAction("analyze-all");
    try {
      const result = await analyzeAll(PAGE_LIMIT);
      setNotice(
        `Analyzed ${result.analyzed} item${result.analyzed === 1 ? "" : "s"}${
          result.errors.length ? ` with ${result.errors.length} error(s)` : ""
        }.`,
      );
      await loadDashboard(undefined, "refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk analysis failed");
      setAction(null);
    }
  }

  async function handleAnalyzeSelected() {
    if (!selectedItem) return;
    setNotice(null);
    setError(null);
    setAction("analyze-item");
    try {
      const updated = await analyzeItem(selectedItem.id);
      updateVisibleItem(updated);
      setNotice(`Analyzed item #${updated.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Item analysis failed");
    } finally {
      setAction(null);
    }
  }

  async function handleTranslateSelected() {
    if (!selectedItem) return;
    setNotice(null);
    setError(null);
    setAction("translate");
    try {
      const updated = await translateItem(selectedItem.id, targetLanguage);
      updateVisibleItem(updated);
      setNotice(`Translated item #${updated.id} to ${targetLanguage}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setAction(null);
    }
  }

  function updateVisibleItem(updated: BackendItem) {
    setItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setFundingItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setDigest((current) =>
      current
        ? {
            ...current,
            top_items: current.top_items.map((item) =>
              item.id === updated.id ? updated : item,
            ),
            funding_items: current.funding_items.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          }
        : current,
    );
    setSelectedId(updated.id);
  }

  const isBusy = action !== null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            NGO Intelligence Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Burundi Kids and WTG live RSS intelligence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void loadDashboard()}
            disabled={isBusy}
          >
            {action === "refresh" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Refresh
          </Button>
          <Button variant="outline" onClick={() => void handleIngest()} disabled={isBusy}>
            {action === "ingest" ? <Loader2 className="animate-spin" /> : <Rss />}
            Ingest RSS
          </Button>
          <Button onClick={() => void handleAnalyzeAll()} disabled={isBusy}>
            {action === "analyze-all" ? <Loader2 className="animate-spin" /> : <Wand2 />}
            Analyze all
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Server} label="API status" value={status?.status ?? "offline"} />
        <Metric icon={Database} label="Items" value={String(items.length)} />
        <Metric icon={BadgeDollarSign} label="Funding" value={String(fundingItems.length)} />
        <Metric icon={Wand2} label="AI provider" value={status?.ai_provider ?? "none"} />
      </div>

      {(notice || error) && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-4">
            <form
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void loadDashboard();
              }}
            >
              <div className="relative min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search stored items"
                  className="pl-9"
                />
              </div>
              <Select value={category} onValueChange={(value) => setCategory(value as CategoryFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
                <Switch checked={fundingOnly} onCheckedChange={setFundingOnly} />
                Funding
              </label>
              <Button type="submit" variant="outline" disabled={isBusy}>
                Search
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Items</h2>
                <p className="text-xs text-muted-foreground">
                  Newest first, showing up to {PAGE_LIMIT}.
                </p>
              </div>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden w-28 md:table-cell">Category</TableHead>
                  <TableHead className="hidden w-24 md:table-cell">Score</TableHead>
                  <TableHead className="w-28">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      data-state={selectedItem?.id === item.id ? "selected" : undefined}
                    >
                      <TableCell className="min-w-[260px]">
                        <button
                          type="button"
                          className="line-clamp-2 text-left text-sm font-medium text-foreground hover:text-primary"
                          onClick={() => setSelectedId(item.id)}
                        >
                          {item.title}
                        </button>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.is_funding_opportunity && (
                            <Badge variant="outline">Funding</Badge>
                          )}
                          {item.target_org && <Badge variant="outline">{item.target_org}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {categoryLabel(item.category)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatScore(item.relevance_score)}
                      </TableCell>
                      <TableCell className="max-w-[130px] truncate text-xs text-muted-foreground">
                        {item.source}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Funding</h2>
                <p className="text-xs text-muted-foreground">
                  {fundingItems.length} opportunity{fundingItems.length === 1 ? "" : "ies"} visible.
                </p>
              </div>
              <BadgeDollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-3 divide-y divide-border">
              {fundingItems.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">No funding items found.</div>
              ) : (
                fundingItems.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-start justify-between gap-3 py-3 text-left"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.deadline ? `Deadline ${formatDate(item.deadline)}` : item.source}
                      </span>
                    </span>
                    <Badge variant="outline">{formatScore(item.relevance_score)}</Badge>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Digest</h2>
              <Badge variant="outline">
                {digest ? formatDate(digest.generated_at) : "Pending"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {digest?.summary_text ?? "Digest unavailable."}
            </p>
            <div className="mt-4 space-y-2">
              {(digest?.top_items ?? []).slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/50"
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="line-clamp-2 font-medium">{item.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {categoryLabel(item.category)} - {formatScore(item.relevance_score)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">Item detail</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedItem ? `#${selectedItem.id} - ${selectedItem.source}` : "No item selected"}
                </p>
              </div>
              {selectedItem?.url && (
                <Button asChild variant="outline" size="icon" title="Open source">
                  <a href={selectedItem.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>

            {selectedItem ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-base font-semibold leading-snug text-foreground">
                    {selectedItem.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{categoryLabel(selectedItem.category)}</Badge>
                    <Badge variant="outline">{formatScore(selectedItem.relevance_score)}</Badge>
                    {selectedItem.language && (
                      <Badge variant="outline">{selectedItem.language}</Badge>
                    )}
                    {selectedItem.target_org && (
                      <Badge variant="outline">{selectedItem.target_org}</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Summary</div>
                  <p className="mt-1 text-sm leading-6 text-foreground">
                    {selectedItem.summary ?? truncate(cleanText(selectedItem.raw_text), 360)}
                  </p>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Raw text</div>
                  <p className="mt-1 max-h-40 overflow-auto rounded-md border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">
                    {truncate(cleanText(selectedItem.raw_text), 1200)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleAnalyzeSelected()}
                    disabled={isBusy}
                  >
                    {action === "analyze-item" ? <Loader2 className="animate-spin" /> : <Wand2 />}
                    Analyze item
                  </Button>
                  <div className="grid grid-cols-[130px_auto] gap-2">
                    <Select
                      value={targetLanguage}
                      onValueChange={(value) =>
                        setTargetLanguage(value as (typeof LANGUAGE_OPTIONS)[number])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => void handleTranslateSelected()} disabled={isBusy}>
                      {action === "translate" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Languages />
                      )}
                      Translate
                    </Button>
                  </div>
                </div>

                {selectedItem.translated_text && (
                  <div>
                    <div className="text-xs font-medium uppercase text-muted-foreground">
                      Translation {selectedItem.translated_language}
                    </div>
                    <p className="mt-1 rounded-md border border-border bg-background p-3 text-sm leading-6">
                      {selectedItem.translated_text}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No item selected.
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Server;
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

function uniqueItems(items: BackendItem[]): BackendItem[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function categoryLabel(category: BackendItem["category"]): string {
  return category ? category[0].toUpperCase() + category.slice(1) : "Unanalyzed";
}

function formatScore(score: number | null): string {
  return score == null ? "No score" : `${Math.round(score * 100)}%`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cleanText(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

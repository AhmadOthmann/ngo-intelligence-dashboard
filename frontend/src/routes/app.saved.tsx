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
import {
  filterLabel,
  importanceLabel,
  knownLabel,
  localeFromLanguage,
  translate,
  type FilterKey,
} from "@/lib/i18n";

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

const FILTERS: FilterKey[] = ["all", "funding", "news", "reports", "peer"];
const SORTS = ["mostImportant", "deadlineSoon", "newestSaved", "oldestSaved"] as const;

const STATUS_OPTIONS: SavedStatus[] = [
  "saved",
  "reviewing",
  "contacted",
  "digest",
  "applying",
  "archived",
];

function SavedPage() {
  const { saved, updateSavedStatus, addNote, archive, profile } = useAppState();
  const language = profile?.language;
  const copy = savedCopy(language);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("mostImportant");

  const filtered = useMemo(() => {
    let list = saved;
    if (filter === "funding") list = list.filter((i) => i.signal.type === "funding");
    else if (filter === "news") list = list.filter((i) => i.signal.type === "news");
    else if (filter === "reports") list = list.filter((i) => i.signal.type === "report");
    else if (filter === "peer") list = list.filter((i) => i.signal.type === "peer");
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((i) => i.signal.title.toLowerCase().includes(needle));
    }
    if (sort === "newestSaved") {
      list = [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    } else if (sort === "oldestSaved") {
      list = [...list].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
    }
    return list;
  }, [saved, filter, q, sort]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {translate(language, "tags")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="pl-9"
          />
        </div>
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
              onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {sortLabelSaved(language, s)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {copy.empty}
        </div>
      )}

      {SECTIONS.map((section) => {
        const items = filtered.filter((i) => i.category === section.key);
        if (items.length === 0) return null;
        return (
          <section key={section.key}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {knownLabel(language, section.label)}
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <SavedCard
                  key={item.signal.id}
                  item={item}
                  language={language}
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
        {copy.profileInUse}:{" "}
        <span className="font-medium text-foreground">{profile?.name ?? BURUNDI_KIDS.name}</span>
      </div>
    </div>
  );
}

function SavedCard({
  item,
  language,
  onStatus,
  onNote,
  onArchive,
}: {
  item: SavedItem;
  language: string | undefined;
  onStatus: (s: SavedStatus) => void;
  onNote: (n: string) => void;
  onArchive: () => void;
}) {
  const copy = savedCopy(language);
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
        <TypeBadge type={s.type} language={language} />
        {item.importance && (
          <span
            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${importanceTone[item.importance]}`}
          >
            {importanceLabel(language, item.importance)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {knownLabel(language, "Saved")} {item.savedAt}
        </span>
        <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          {copy.status}:
          <select
            value={item.status}
            onChange={(e) => onStatus(e.target.value as SavedStatus)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {statusLabel(language, o)}
              </option>
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
              <div className="mb-1 text-xs font-medium text-foreground">{copy.keyPoints}</div>
              <ul className="space-y-1 text-xs text-foreground/80">
                {s.keyPoints.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">-</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.funding && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary/60 p-3 text-xs sm:grid-cols-4">
              <MiniField label={translate(language, "deadline")} value={s.funding.deadline} />
              <MiniField label={translate(language, "amount")} value={s.funding.amount} />
              <MiniField label={translate(language, "funder")} value={s.funding.funder} />
              <div>
                <div className="text-muted-foreground">{translate(language, "canYouApply")}</div>
                <span className={`mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${canApplyTone[s.funding.canApply]}`}>
                  {canApplyLabel(s.funding.canApply, language)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <div className="text-muted-foreground">{translate(language, "eligibility")}</div>
                <div className="text-foreground/80">{s.funding.eligibility}</div>
              </div>
            </div>
          )}
          {s.peerActivity && s.peerActivity.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-xs">
                <div className="font-medium text-foreground">{translate(language, "peerActivity")}</div>
                <ul className="text-foreground/80">
                  {s.peerActivity.map((p, i) => (<li key={i}>- {p.text}</li>))}
                </ul>
              </div>
            </div>
          )}
          {item.note && (
            <div className="rounded-md border border-dashed border-border p-2 text-xs text-foreground/80">
              {copy.note}: {item.note}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{s.source} / {s.date}</span>
            <Button size="sm" variant="ghost" asChild>
              <a href={s.url ?? "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> {translate(language, "viewSource")}
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
            placeholder={copy.notePlaceholder}
            className="w-full rounded-md border border-border bg-card p-2 text-sm"
          />
          <Button size="sm" onClick={() => { onNote(note); setShowNote(false); toast.success(copy.noteSaved); }}>{copy.saveNote}</Button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowNote((v) => !v)}>
          <NotebookPen className="h-4 w-4" /> {copy.addNote}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { onStatus("contacted"); toast(copy.markedContacted); }}>
          <MessageSquare className="h-4 w-4" /> {copy.askPeer}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { onArchive(); toast(statusLabel(language, "archived")); }}>
          <Archive className="h-4 w-4" /> {statusLabel(language, "archived")}
        </Button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (<>{translate(language, "hideDetails")} <ChevronUp className="h-3.5 w-3.5" /></>) : (<>{translate(language, "showDetails")} <ChevronDown className="h-3.5 w-3.5" /></>)}
        </button>
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function savedCopy(language: string | undefined) {
  const locale = localeFromLanguage(language);
  if (locale === "fr") {
    return {
      addNote: "Ajouter une note",
      askPeer: "Demander au pair",
      empty: "Aucun signal tague pour l'instant. Sauvegardez des signaux depuis votre boite.",
      keyPoints: "Points cles",
      markedContacted: "Marque comme contacte",
      note: "Note",
      notePlaceholder: "Ajouter une note privee...",
      noteSaved: "Note sauvegardee",
      profileInUse: "Profil utilise",
      saveNote: "Sauvegarder la note",
      searchPlaceholder: "Rechercher dans les tags",
      status: "Statut",
      subtitle: "Base de connaissances organisee de votre ONG pour financements, actualites, rapports et notes de pairs.",
    };
  }
  if (locale === "de") {
    return {
      addNote: "Notiz hinzufuegen",
      askPeer: "Peer fragen",
      empty: "Noch keine getaggten Signale. Speichern Sie Signale aus dem Postfach.",
      keyPoints: "Wichtige Punkte",
      markedContacted: "Als kontaktiert markiert",
      note: "Notiz",
      notePlaceholder: "Private Notiz hinzufuegen...",
      noteSaved: "Notiz gespeichert",
      profileInUse: "Verwendetes Profil",
      saveNote: "Notiz speichern",
      searchPlaceholder: "Getaggte Elemente suchen",
      status: "Status",
      subtitle: "Organisierte Wissensbasis Ihrer NGO fuer Foerderung, Nachrichten, Berichte und Peer-Notizen.",
    };
  }
  return {
    addNote: "Add note",
    askPeer: "Ask peer",
    empty: "No tagged signals yet. Save signals from your Inbox to build your knowledge base.",
    keyPoints: "Key points",
    markedContacted: "Marked as contacted",
    note: "Note",
    notePlaceholder: "Add a private note...",
    noteSaved: "Note saved",
    profileInUse: "Profile in use",
    saveNote: "Save note",
    searchPlaceholder: "Search tagged items",
    status: "Status",
    subtitle: "Your NGO's organized knowledge base for funding, news, reports, and peer notes.",
  };
}

function sortLabelSaved(language: string | undefined, sort: (typeof SORTS)[number]): string {
  const locale = localeFromLanguage(language);
  const labels = {
    en: {
      deadlineSoon: "Deadline soon",
      mostImportant: "Most important",
      newestSaved: "Newest saved",
      oldestSaved: "Oldest saved",
    },
    fr: {
      deadlineSoon: "Echeance proche",
      mostImportant: "Les plus importants",
      newestSaved: "Sauvegardes recemment",
      oldestSaved: "Sauvegardes anciennes",
    },
    de: {
      deadlineSoon: "Frist bald",
      mostImportant: "Am wichtigsten",
      newestSaved: "Neueste Speicherungen",
      oldestSaved: "Aelteste Speicherungen",
    },
  } as const;
  return labels[locale][sort];
}

function statusLabel(language: string | undefined, status: SavedStatus): string {
  const label: Record<SavedStatus, string> = {
    applying: "Applying",
    archived: "Archived",
    contacted: "Contacted peer NGO",
    digest: "Added to digest",
    reviewing: "Reviewing",
    saved: "Saved",
  };
  return knownLabel(language, label[status]);
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

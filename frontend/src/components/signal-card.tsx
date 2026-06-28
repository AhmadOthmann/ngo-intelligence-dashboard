import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  CalendarClock,
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
  const [isAutoTranslating, setIsAutoTranslating] = useState(false);
  const displaySignal = translatedSignal ?? signal;
  const detailPoints = getDetailPoints(displaySignal);
  const sourceSignature = useMemo(
    () =>
      [
        signal.id,
        signal.title,
        signal.summary,
        signal.longSummary ?? "",
        signal.originalLanguage,
        signal.whyRecommended,
        signal.suggestedAction,
        profile?.language ?? "",
      ].join("|"),
    [
      signal.id,
      signal.title,
      signal.summary,
      signal.longSummary,
      signal.originalLanguage,
      signal.whyRecommended,
      signal.suggestedAction,
      profile?.language,
    ],
  );

  useEffect(() => {
    const preferredLanguage = normalizeTargetLanguage(profile?.language);
    setTargetLanguage(preferredLanguage);
    setTranslatedSignal(null);
    setTranslatedLanguage(signal.translatedLanguage ?? "");

    if (!shouldAutoTranslate(signal, preferredLanguage)) {
      setIsAutoTranslating(false);
      return;
    }

    let cancelled = false;
    setIsAutoTranslating(true);
    translateSignalContent(signal, preferredLanguage)
      .then((translated) => {
        if (cancelled) return;
        setTranslatedSignal(translated);
        setTranslatedLanguage(preferredLanguage);
      })
      .catch(() => {
        if (!cancelled) {
          setTranslatedSignal(null);
          setTranslatedLanguage("");
        }
      })
      .finally(() => {
        if (!cancelled) setIsAutoTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sourceSignature]);

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
        {displaySignal.funding?.deadline && displaySignal.funding.deadline !== "No deadline detected" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            <CalendarClock className="h-3 w-3" />
            {translate(language, "deadline")} {displaySignal.funding.deadline}
          </span>
        )}
        {isAutoTranslating && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {translate(language, "translation")} {targetLanguage}...
          </span>
        )}
        {!isAutoTranslating && translatedSignal && translatedLanguage && (
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
                disabled={isTranslating || isAutoTranslating}
              >
                {isTranslating || isAutoTranslating ? (
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

function shouldAutoTranslate(signal: Signal, targetLanguage: string): boolean {
  const sourceLanguage = supportedLanguageName(signal.originalLanguage);
  const target = supportedLanguageName(targetLanguage);
  if (!target) return false;
  if (!sourceLanguage) return true;
  return sourceLanguage !== target;
}

function supportedLanguageName(language: string | undefined): string {
  const normalized = language?.trim().toLowerCase() ?? "";
  if (normalized === "en" || normalized.startsWith("english")) return "English";
  if (normalized === "fr" || normalized.startsWith("french") || normalized.startsWith("franc")) {
    return "French";
  }
  if (
    normalized === "de" ||
    normalized.startsWith("german") ||
    normalized.startsWith("deutsch")
  ) {
    return "German";
  }
  return "";
}

async function translateSignalContent(signal: Signal, targetLanguage: string): Promise<Signal> {
  const segments = collectSignalSegments(signal);
  let translated = await translateSegments(segments, targetLanguage);

  if (segments.length > 0 && translated.size === 0) {
    translated = localSignalTranslation(signal, targetLanguage);
  }

  if (segments.length > 0 && translated.size === 0) {
    throw new Error(translate(targetLanguage, "translationProviderEmpty"));
  }

  return {
    ...signal,
    title: segmentValue(translated, "title", signal.title),
    source: segmentValue(translated, "source", signal.source),
    date: segmentValue(translated, "date", signal.date),
    summary: segmentValue(translated, "summary", signal.summary),
    longSummary: segmentValue(translated, "longSummary", signal.longSummary),
    keyPoints: signal.keyPoints?.map((point, index) =>
      segmentValue(translated, `keyPoint.${index}`, point),
    ),
    whyRecommended: segmentValue(translated, "whyRecommended", signal.whyRecommended),
    peerActivity: signal.peerActivity?.map((activity, index) => ({
      ...activity,
      text: segmentValue(translated, `peerActivity.${index}`, activity.text),
    })),
    suggestedAction: segmentValue(translated, "suggestedAction", signal.suggestedAction),
    funding: signal.funding
      ? {
          ...signal.funding,
          deadline: segmentValue(translated, "funding.deadline", signal.funding.deadline),
          amount: segmentValue(translated, "funding.amount", signal.funding.amount),
          funder: segmentValue(translated, "funding.funder", signal.funding.funder),
          eligibility: segmentValue(
            translated,
            "funding.eligibility",
            signal.funding.eligibility,
          ),
        }
      : undefined,
    translatedLanguage: targetLanguage,
  };
}

function collectSignalSegments(signal: Signal): Array<{ key: string; value: string }> {
  const segments: Array<{ key: string; value: string }> = [];
  const add = (key: string, value: string | undefined) => {
    if (value?.trim()) segments.push({ key, value });
  };

  add("title", signal.title);
  add("source", signal.source);
  add("date", signal.date);
  add("summary", signal.summary);
  add("longSummary", signal.longSummary ? truncate(signal.longSummary, 900) : undefined);
  add("whyRecommended", signal.whyRecommended);
  add("suggestedAction", signal.suggestedAction);
  signal.keyPoints?.forEach((point, index) => add(`keyPoint.${index}`, point));
  signal.peerActivity?.forEach((activity, index) =>
    add(`peerActivity.${index}`, activity.text),
  );
  if (signal.funding) {
    add("funding.deadline", signal.funding.deadline);
    add("funding.amount", signal.funding.amount);
    add("funding.funder", signal.funding.funder);
    add("funding.eligibility", signal.funding.eligibility);
  }

  return segments;
}

function localSignalTranslation(signal: Signal, targetLanguage: string): Map<string, string> {
  const target = supportedLanguageName(targetLanguage);
  if (target === "English") {
    return new Map();
  }

  const translations = LOCAL_SIGNAL_TRANSLATIONS[signal.id]?.[target === "German" ? "de" : "fr"];
  return translations ? new Map(Object.entries(translations)) : new Map();
}

type LocalSignalTranslations = Record<string, { de: Record<string, string>; fr: Record<string, string> }>;

const LOCAL_SIGNAL_TRANSLATIONS: LocalSignalTranslations = {
  "recadec-great-lakes-generation": {
    de: {
      title: "Eine neue Generation bereit, die Region der Grossen Seen zu veraendern",
      date: "4. Maerz 2026",
      summary:
        "RECADEC startete in Bujumbura die Academy of Champions of Hope. Junge Menschen aus Burundi, der DR Kongo und Ruanda nehmen an einem einjaehrigen Programm fuer Unternehmertum, Fuehrung und Friedensfoerderung teil.",
      longSummary:
        "Die Academy of Champions of Hope eroeffnete ihre erste Kohorte in Bujumbura mit 30 jungen Teilnehmenden aus Burundi, der Demokratischen Republik Kongo und Ruanda. Das Programm verbindet Unternehmertum, Fuehrungskompetenz und regionale Zusammenarbeit, damit junge Menschen praktische Projekte fuer Frieden und wirtschaftliche Resilienz in der Region der Grossen Seen entwickeln koennen.",
      whyRecommended:
        "Starker Treffer fuer Burundi Kids, weil der Beitrag Burundi, Jugendfoerderung, Bildung, berufliche Kompetenzen und regionale Zusammenarbeit in der Region der Grossen Seen verbindet.",
      suggestedAction:
        "Pruefen Sie moegliche Partner fuer Jugendunternehmertum, Feldkontakte oder Nachweise fuer Projektantraege zu regionaler Jugendfuehrung.",
      "keyPoint.0": "In Bujumbura mit Jugendlichen aus Burundi, der DR Kongo und Ruanda gestartet",
      "keyPoint.1": "Fokus auf Unternehmertum, Fuehrung, Friedensfoerderung und regionale Zusammenarbeit",
      "keyPoint.2": "Relevant fuer Bildung, Jugendfoerderung und Partnernetzwerke in der Region der Grossen Seen",
      "peerActivity.0": "Relevant fuer NGOs, die mit Jugendlichen in der Region der Grossen Seen arbeiten",
    },
    fr: {
      title: "Une nouvelle generation prete a transformer la region des Grands Lacs",
      date: "4 mars 2026",
      summary:
        "RECADEC a lance l'Academie des Champions de l'Espoir a Bujumbura. Des jeunes du Burundi, de la RDC et du Rwanda participent a un programme d'un an sur l'entrepreneuriat, le leadership et la consolidation de la paix.",
      longSummary:
        "L'Academie des Champions de l'Espoir a ouvert sa premiere cohorte a Bujumbura avec 30 jeunes participants du Burundi, de la Republique democratique du Congo et du Rwanda. Le programme combine entrepreneuriat, leadership et cooperation regionale afin que les jeunes puissent developper des projets concrets pour la paix et la resilience economique dans la region des Grands Lacs.",
      whyRecommended:
        "Tres pertinent pour Burundi Kids, car l'article relie le Burundi, l'autonomisation des jeunes, l'education, les competences professionnelles et la cooperation regionale dans les Grands Lacs.",
      suggestedAction:
        "Examiner les partenaires possibles pour l'entrepreneuriat des jeunes, les contacts terrain ou les preuves a utiliser dans des propositions sur le leadership regional des jeunes.",
      "keyPoint.0": "Lance a Bujumbura avec des jeunes du Burundi, de la RDC et du Rwanda",
      "keyPoint.1": "Met l'accent sur l'entrepreneuriat, le leadership, la paix et la cooperation regionale",
      "keyPoint.2": "Pertinent pour l'education, l'autonomisation des jeunes et les reseaux de partenaires des Grands Lacs",
      "peerActivity.0": "Pertinent pour les ONG travaillant avec les jeunes dans la region des Grands Lacs",
    },
  },
  "sig-1": {
    de: {
      title: "Kleinfoerderung fuer Maedchenbildung in Ostafrika",
      source: "Stiftungsnewsletter",
      date: "27. Juni 2026",
      summary:
        "Diese Foerdermoeglichkeit unterstuetzt Bildungs- und Empowerment-Projekte fuer Maedchen in Ostafrika. Projekte mit Burundi-Bezug koennen zur regionalen Ausrichtung passen. Der Foerderer verlangt einen lokalen Umsetzungspartner, daher sollte die Antragsberechtigung geprueft werden.",
      longSummary:
        "Ein neuer Kleinfoerderzyklus der East Africa Education Foundation richtet sich an Maedchenbildung und Empowerment-Projekte in Ostafrika. Die Foerderung liegt zwischen 10.000 und 50.000 Euro fuer Projekte bis zu 18 Monaten. Deutsche und europaeische NGOs koennen sich bewerben, wenn sie mit einer registrierten lokalen Organisation im Umsetzungsland zusammenarbeiten. Burundi wird fuer den Zyklus 2026 ausdruecklich als Prioritaetsland genannt.",
      whyRecommended:
        "Passt zu Ihrem Profil: Burundi, Bildung, Maedchen und Jugendentwicklung. Zwei aehnliche NGOs haben diese Gelegenheit gespeichert. Eine NGO hat sie in ihre Foerderpipeline aufgenommen.",
      suggestedAction:
        "Pruefen Sie die Antragsberechtigung und fragen Sie die Peer-NGO nach ihren Erfahrungen mit der Antragstellung.",
      "peerActivity.0": "Von 2 aehnlichen NGOs gespeichert",
      "peerActivity.1": "Von 1 NGO in Ostafrika in den Digest aufgenommen",
      "funding.deadline": "15. August 2026",
      "funding.funder": "East Africa Education Foundation",
      "funding.eligibility": "Deutsche NGOs koennen antragsberechtigt sein, lokaler Partner erforderlich",
    },
    fr: {
      title: "Petite subvention pour l'education des filles en Afrique de l'Est",
      source: "Bulletin d'une fondation",
      date: "27 juin 2026",
      summary:
        "Cette opportunite de financement soutient des projets d'education et d'autonomisation des filles en Afrique de l'Est. Les projets lies au Burundi peuvent correspondre a l'orientation regionale. Le bailleur exige un partenaire local de mise en oeuvre, il faut donc verifier l'eligibilite.",
      longSummary:
        "Un nouveau cycle de petites subventions de l'East Africa Education Foundation cible l'education et l'autonomisation des filles en Afrique de l'Est. Les subventions vont de 10 000 a 50 000 euros pour des projets allant jusqu'a 18 mois. Les ONG allemandes et europeennes peuvent postuler si elles travaillent avec une organisation locale enregistree dans le pays de mise en oeuvre. Le Burundi est explicitement cite comme pays prioritaire pour le cycle 2026.",
      whyRecommended:
        "Correspond a votre profil: Burundi, education, filles et developpement des jeunes. Deux ONG similaires ont enregistre cette opportunite. Une ONG l'a ajoutee a son pipeline de financement.",
      suggestedAction:
        "Verifier l'eligibilite et demander a l'ONG pair son experience de candidature.",
      "peerActivity.0": "Enregistree par 2 ONG similaires",
      "peerActivity.1": "Ajoutee au digest par 1 ONG travaillant en Afrique de l'Est",
      "funding.deadline": "15 aout 2026",
      "funding.funder": "East Africa Education Foundation",
      "funding.eligibility": "Les ONG allemandes peuvent etre eligibles, partenaire local requis",
    },
  },
  "sig-2": {
    de: {
      title: "Burundi: Sicherheits- und humanitaeres Update fuer die Provinz Bujumbura",
      date: "26. Juni 2026",
      summary:
        "Lokale Behoerden melden vertriebene Familien in der Provinz Bujumbura. Humanitaerer Zugang bleibt moeglich, aber Partner sollten Bewegungen koordinieren.",
      longSummary:
        "ReliefWeb berichtet, dass mehrere hundert Familien in der Provinz Bujumbura nach starken Regenfaellen und lokalen Unruhen vertrieben wurden. Humanitaere Korridore bleiben offen, und lokale Behoerden koordinieren mit UN-Agenturen. NGOs in der Region werden gebeten, Feldbewegungen ueber das bestehende Clustersystem abzustimmen.",
      whyRecommended:
        "Passt zu Ihrer Region: Burundi, Bujumbura. Wegen humanitaerer Auswirkungen auf Ihr Einsatzgebiet als dringend markiert.",
      suggestedAction: "Mit dem lokalen Team pruefen und Feldbewegungsplaene aktualisieren.",
      "keyPoint.0": "Vertreibungen konzentrieren sich auf drei Gemeinden nahe Bujumbura",
      "keyPoint.1": "Humanitaerer Zugang ist offen, erfordert aber Koordination",
      "keyPoint.2": "Lokale Cluster-Treffen beginnen wieder woechentlich ab 28. Juni",
      "keyPoint.3": "Gesundheit und Unterkunft sind die dringendsten Sektoren",
      "peerActivity.0": "Von 5 NGOs in der Region der Grossen Seen angeklickt",
    },
    fr: {
      title: "Burundi: point securitaire et humanitaire pour la province de Bujumbura",
      date: "26 juin 2026",
      summary:
        "Les autorites locales signalent des familles deplacees dans la province de Bujumbura. L'acces humanitaire reste possible, mais les partenaires doivent coordonner leurs mouvements.",
      longSummary:
        "ReliefWeb rapporte que plusieurs centaines de familles ont ete deplacees dans la province de Bujumbura apres de fortes pluies et des troubles localises. Les couloirs humanitaires restent ouverts, et les autorites locales coordonnent avec les agences des Nations unies. Les ONG actives dans la region sont invitees a coordonner leurs deplacements terrain via le systeme de clusters etabli.",
      whyRecommended:
        "Correspond a votre region: Burundi, Bujumbura. Marque urgent en raison de l'impact humanitaire sur votre zone d'intervention.",
      suggestedAction: "Examiner avec votre equipe locale et mettre a jour les plans de deplacement terrain.",
      "keyPoint.0": "Deplacements concentres dans trois communes pres de Bujumbura",
      "keyPoint.1": "L'acces humanitaire est ouvert mais necessite une coordination",
      "keyPoint.2": "Les reunions locales de clusters reprennent chaque semaine a partir du 28 juin",
      "keyPoint.3": "La sante et l'abri sont les besoins sectoriels les plus urgents",
      "peerActivity.0": "Clique par 5 ONG travaillant dans la region des Grands Lacs",
    },
  },
  "sig-3": {
    de: {
      title: "Malaria und Schulfehlzeiten in Burundi: Feldbericht 2026",
      source: "Gesundheitspartner-Konsortium",
      date: "20. Juni 2026",
      summary:
        "Ein neuer Bericht verbindet steigende Malariafaelle mit Schulfehlzeiten im laendlichen Burundi. Er empfiehlt kostenguenstige Praeventionsmassnahmen fuer Schulen.",
      longSummary:
        "Ein 60-seitiger Feldbericht eines Gesundheitspartner-Konsortiums dokumentiert einen messbaren Zusammenhang zwischen saisonalen Malaria-Spitzen und Schulfehlzeiten im laendlichen Burundi. Auf Basis von Daten aus 42 Schulen empfiehlt der Bericht kostenguenstige schulbasierte Praeventionsmassnahmen, darunter Moskitonetzverteilung, Screening im Klassenzimmer und schnelle Ueberweisungswege zu nahegelegenen Gesundheitszentren.",
      whyRecommended:
        "Passt zu Ihren Themen: Gesundheit, Bildung, Burundi. Nuetzliche Evidenz fuer Foerderantraege.",
      suggestedAction: "In Field Intelligence speichern, um kommende Antraege zu untermauern.",
      "keyPoint.0": "42 Schulen im laendlichen Burundi untersucht",
      "keyPoint.1": "Fehlzeiten steigen in der Malaria-Hochsaison um 18%",
      "keyPoint.2": "Moskitonetze und Ueberweisungswege empfohlen",
      "keyPoint.3": "Geschaetzte Kosten: 4 bis 7 Euro pro Kind und Jahr",
      "peerActivity.0": "Von einer NGO gespeichert, der Sie moeglicherweise folgen sollten",
    },
    fr: {
      title: "Paludisme et absence scolaire au Burundi: rapport terrain 2026",
      source: "Consortium de partenaires sante",
      date: "20 juin 2026",
      summary:
        "Un nouveau rapport relie la hausse des cas de paludisme a l'absenteisme scolaire dans le Burundi rural. Il propose des mesures de prevention peu couteuses pour les ecoles.",
      longSummary:
        "Un rapport terrain de 60 pages d'un consortium de partenaires sante documente une correlation mesurable entre les pics saisonniers de paludisme et l'absenteisme scolaire dans le Burundi rural. A partir de donnees recueillies dans 42 ecoles, le rapport recommande des mesures de prevention scolaires peu couteuses, notamment la distribution de moustiquaires, le depistage en classe et des voies de reference rapides vers les centres de sante proches.",
      whyRecommended:
        "Correspond a vos themes: sante, education, Burundi. Preuve utile pour les propositions de financement.",
      suggestedAction: "Enregistrer dans les renseignements terrain pour appuyer les prochaines propositions.",
      "keyPoint.0": "42 ecoles etudiees dans le Burundi rural",
      "keyPoint.1": "Le taux d'absence augmente de 18% pendant la saison de pointe du paludisme",
      "keyPoint.2": "Distribution de moustiquaires et voies de reference recommandees",
      "keyPoint.3": "Cout estime: 4 a 7 euros par enfant et par an",
      "peerActivity.0": "Enregistre par une ONG que vous pourriez vouloir suivre",
    },
  },
  "sig-4": {
    de: {
      title: "Fortschritte bei der Tollwutkontrolle in Ostafrika",
      source: "WHO-Regionalbriefing",
      date: "18. Juni 2026",
      summary:
        "Impfkampagnen in Ostafrika zeigen messbare Rueckgaenge bei Tollwutfaellen. Grenzueberschreitende Koordination bleibt die zentrale Herausforderung.",
      longSummary:
        "Das WHO-Regionalbriefing bewertet fuenf Jahre Hundeimpfkampagnen in Ostafrika. Gemeldete Tollwutfaelle sanken in Distrikten mit dauerhaft ueber 70% Impfquote durchschnittlich um 38%. Das Briefing nennt die grenzueberschreitende Bewegung ungeimpfter Hunde als Hauptrisiko und schlaegt gemeinsame Korridore Kenia-Tansania-Uganda fuer 2026-2027 vor.",
      whyRecommended: "Passt zum WTG-Profil: Tollwut, Tierschutz, Ostafrika.",
      suggestedAction: "Zum Digest fuer die monatliche Pruefung hinzufuegen.",
      "keyPoint.0": "Faelle in Distrikten mit hoher Impfquote um 38% gesunken",
      "keyPoint.1": "Grenzueberschreitende Hundebewegung ist das wichtigste Restrisiko",
      "keyPoint.2": "Kenia-Tansania-Uganda-Impfkorridore vorgeschlagen",
      "peerActivity.0": "Von 5 NGOs mit Tierschutzarbeit angeklickt",
    },
    fr: {
      title: "Progres de la lutte contre la rage en Afrique de l'Est",
      source: "Note regionale de l'OMS",
      date: "18 juin 2026",
      summary:
        "Les campagnes de vaccination en Afrique de l'Est montrent une baisse mesurable de l'incidence de la rage. La coordination transfrontaliere reste le principal defi.",
      longSummary:
        "La note regionale de l'OMS examine cinq ans de campagnes de vaccination canine en Afrique de l'Est. Les cas signales de rage ont baisse en moyenne de 38% dans les districts ayant maintenu une couverture vaccinale superieure a 70%. La note identifie les mouvements transfrontaliers de chiens non vaccines comme principal risque residuel et propose des corridors conjoints Kenya-Tanzanie-Ouganda pour 2026-2027.",
      whyRecommended: "Correspond au profil WTG: rage, bien-etre animal, Afrique de l'Est.",
      suggestedAction: "Ajouter au digest pour l'examen mensuel.",
      "keyPoint.0": "Cas en baisse de 38% dans les districts a forte couverture",
      "keyPoint.1": "Le mouvement transfrontalier des chiens est le principal risque residuel",
      "keyPoint.2": "Corridors de vaccination Kenya-Tanzanie-Ouganda proposes",
      "peerActivity.0": "Clique par 5 ONG travaillant sur le bien-etre animal",
    },
  },
  "sig-5": {
    de: {
      title: "Update zum Wildtierhandel: neue Handelsrouten identifiziert",
      source: "TRAFFIC-Bulletin",
      date: "25. Juni 2026",
      summary:
        "Ermittler berichten von neuen Schmuggelrouten zwischen Ostafrika und europaeischen Maerkten. Sie fordern staerkere Durchsetzung auf Verbraucherseite.",
      longSummary:
        "Ein TRAFFIC-Bulletin kartiert zwei neue Wildtierhandelskorridore, die ostafrikanische Herkunftslaender mit Verbrauchermarkten in Westeuropa verbinden. Ermittler dokumentieren eine Verlagerung von Luftfracht zu kombinierten Land- und Seewegen ueber Mittelmeerhaefen. Der Bericht fordert europaeische NGOs und Regulierer auf, sich auf Verbraucherseite und Lieferkettenpruefungen bei Luxusguetern zu konzentrieren.",
      whyRecommended: "Passt zum WTG-Profil: Wildtierschutz, Tierhandel, Verbraucherschutz.",
      suggestedAction: "Mit dem Policy-Team teilen und eine oeffentliche Reaktion pruefen.",
      "keyPoint.0": "Zwei neue Korridore seit Ende 2025 dokumentiert",
      "keyPoint.1": "Verlagerung von Luftfracht zu Landwegen plus Mittelmeer-Seewegen",
      "keyPoint.2": "Forderung nach Durchsetzung auf Verbraucherseite in EU-Maerkten",
      "peerActivity.0": "Von 3 aehnlichen NGOs gespeichert",
    },
    fr: {
      title: "Trafic d'especes sauvages: de nouvelles routes commerciales identifiees",
      source: "Bulletin TRAFFIC",
      date: "25 juin 2026",
      summary:
        "Des enqueteurs signalent de nouvelles routes de trafic entre l'Afrique de l'Est et les marches europeens. Ils appellent a un renforcement de l'application cote consommateurs.",
      longSummary:
        "Un bulletin TRAFFIC cartographie deux nouveaux corridors de trafic d'especes sauvages reliant des pays sources d'Afrique de l'Est aux marches de consommation d'Europe occidentale. Les enqueteurs documentent un passage du fret aerien a des itineraires mixtes route-mer via des ports mediterraneens. Le rapport appelle les ONG europeennes et les regulateurs a se concentrer sur l'application cote consommateurs et les audits de chaine d'approvisionnement des produits de luxe.",
      whyRecommended: "Correspond au profil WTG: protection de la faune, commerce animal, protection des consommateurs.",
      suggestedAction: "Partager avec l'equipe politique et envisager une reponse publique.",
      "keyPoint.0": "Deux nouveaux corridors documentes depuis fin 2025",
      "keyPoint.1": "Passage du fret aerien a la route plus mer Mediterranee",
      "keyPoint.2": "Appel a l'application cote consommateurs sur les marches de l'UE",
      "peerActivity.0": "Enregistre par 3 ONG similaires",
    },
  },
  "sig-6": {
    de: {
      title: "Tierschutz-Feldnotiz von Partner-NGO geteilt",
      source: "Peer-NGO: Animal Welfare East Africa",
      date: "22. Juni 2026",
      summary:
        "Eine Partner-NGO teilte eine kurze Feldnotiz zu Programmen fuer das Management streunender Hunde in Kenia, einschliesslich Budgetaufschluesselung.",
      whyRecommended:
        "Von einer NGO geteilt, die sich mit Ihren Themen ueberschneidet. Empfohlen, weil diese NGO Ihre Region und Themen teilt.",
      suggestedAction: "Speichern und eine Antwort mit eigenen Felderfahrungen erwaegen.",
      "peerActivity.0": "Von 2 aehnlichen NGOs gespeichert",
    },
    fr: {
      title: "Note terrain sur le bien-etre animal partagee par une ONG partenaire",
      source: "ONG pair: Animal Welfare East Africa",
      date: "22 juin 2026",
      summary:
        "Une ONG partenaire a partage une courte note terrain sur les programmes de gestion des chiens errants au Kenya, avec une ventilation budgetaire.",
      whyRecommended:
        "Partage par une ONG dont les themes recoupent les votres. Recommande car cette ONG partage votre region et vos sujets.",
      suggestedAction: "Enregistrer et envisager de repondre avec votre propre experience terrain.",
      "peerActivity.0": "Enregistre par 2 ONG similaires",
    },
  },
  "sig-7": {
    de: {
      title: "BMZ-aehnlicher Foerderaufruf fuer kleine NGOs: Zyklus 2026",
      source: "BMZ-Partnerportal",
      date: "24. Juni 2026",
      summary:
        "Foerderzyklus offen fuer kleine deutsche NGOs, die Projekte mit lokalen Partnern in Afrika umsetzen. Bildung, Gesundheit und Frauenfoerderung werden priorisiert.",
      longSummary:
        "Die BMZ-Foerdereinrichtung fuer kleine NGOs hat ihren Foerderzyklus 2026 geoeffnet. Das Instrument unterstuetzt deutsche NGOs mit einem Jahresumsatz unter 1,5 Mio. Euro bei 12- bis 36-monatigen Projekten mit einem registrierten lokalen Partner in Afrika. Bildung, Gesundheit und Frauenfoerderung sind die angegebenen Prioritaetsbereiche dieses Zyklus. Konzeptnotizen werden monatlich bis zum Ende des Zyklus geprueft.",
      whyRecommended: "Starker Treffer: deutscher Antragsteller berechtigt, Kleinfoerderung, Afrika, Bildung, Gesundheit.",
      suggestedAction: "Eignungspruefung starten und eine Konzeptnotiz entwerfen.",
      "peerActivity.0": "Von 1 aehnlichen NGO in den Digest aufgenommen",
      "funding.deadline": "30. September 2026",
      "funding.funder": "BMZ-Foerdereinrichtung fuer kleine NGOs",
      "funding.eligibility": "Deutsche NGO, lokaler Partner erforderlich",
    },
    fr: {
      title: "Appel de financement type BMZ pour petites ONG: cycle 2026",
      source: "Portail partenaire BMZ",
      date: "24 juin 2026",
      summary:
        "Cycle de financement ouvert aux petites ONG allemandes mettant en oeuvre des projets avec des partenaires locaux en Afrique. Education, sante et autonomisation des femmes sont prioritaires.",
      longSummary:
        "Le dispositif BMZ pour petites ONG a ouvert son cycle de financement 2026. L'instrument soutient des ONG allemandes avec un chiffre d'affaires annuel inferieur a 1,5 million d'euros pour des projets de 12 a 36 mois avec un partenaire local enregistre en Afrique. L'education, la sante et l'autonomisation des femmes sont les priorites annoncees pour ce cycle. Les notes conceptuelles sont examinees chaque mois jusqu'a la cloture du cycle.",
      whyRecommended: "Tres pertinent: demandeur allemand eligible, petites subventions, Afrique, education, sante.",
      suggestedAction: "Lancer la verification d'eligibilite et rediger une note conceptuelle.",
      "peerActivity.0": "Ajoute au digest par 1 ONG similaire",
      "funding.deadline": "30 septembre 2026",
      "funding.funder": "Dispositif BMZ pour petites ONG",
      "funding.eligibility": "ONG allemande, partenaire local requis",
    },
  },
  "sig-8": {
    de: {
      title: "Projektbericht: Maedchenbildung in Gitega",
      source: "Lokaler Partner",
      date: "15. Juni 2026",
      summary:
        "Ein Projektbericht aus Gitega beschreibt die Ergebnisse eines einjaehrigen Maedchenbildungsprogramms: Anwesenheit plus 22%, Schulabbruch minus 11%.",
      longSummary:
        "Ein 12-monatiger Projektbericht eines lokalen Partners in Gitega dokumentiert die Ergebnisse eines Nachmittagsprogramms fuer jugendliche Maedchen. Die Anwesenheit stieg im Projektjahr um 22%, der Schulabbruch sank um 11%. Der Bericht enthaelt Kostendaten pro Schule und eine kurze Methodik, die NGOs fuer Geberantraege anpassen koennen.",
      whyRecommended: "Direkte Evidenz aus Ihrer Region. Nuetzlich fuer Geberberichte.",
      suggestedAction: "In Field Intelligence speichern, um Antragsnachweise zu sichern.",
      "keyPoint.0": "Anwesenheit +22%, Schulabbruch -11% ueber 12 Monate",
      "keyPoint.1": "Kostendaten pro Schule enthalten",
      "keyPoint.2": "Methodik fuer Antragsanlagen wiederverwendbar",
    },
    fr: {
      title: "Rapport de projet: education des filles a Gitega",
      source: "Partenaire local",
      date: "15 juin 2026",
      summary:
        "Un rapport de projet de Gitega decrit les resultats d'un programme d'un an pour l'education des filles: presence en hausse de 22%, abandon en baisse de 11%.",
      longSummary:
        "Un rapport de projet de 12 mois d'un partenaire local a Gitega documente les resultats d'un programme parascolaire pour adolescentes. La presence a augmente de 22% et l'abandon a baisse de 11% pendant l'annee du programme. Le rapport comprend des donnees de cout par ecole et une courte section methodologique que les ONG peuvent adapter pour des propositions aux bailleurs.",
      whyRecommended: "Preuve directe de votre region. Utile pour les rapports aux bailleurs.",
      suggestedAction: "Enregistrer dans les renseignements terrain pour appuyer les propositions.",
      "keyPoint.0": "Presence +22%, abandon -11% sur 12 mois",
      "keyPoint.1": "Donnees de cout par ecole incluses",
      "keyPoint.2": "Methodologie reutilisable pour les annexes de propositions",
    },
  },
} as const;

async function translateSegments(
  segments: Array<{ key: string; value: string }>,
  targetLanguage: string,
): Promise<Map<string, string>> {
  if (segments.length === 0) return new Map();

  const payload = segments
    .map((segment, index) => `<ia${index}>${segment.value}</ia${index}>`)
    .join("\n");

  try {
    const result = await translateText(payload, targetLanguage);
    const translatedPayload = cleanTranslationText(result.translated_text);
    const translated = new Map<string, string>();

    segments.forEach((segment, index) => {
      const match = translatedPayload.match(
        new RegExp(`<\\s*ia${index}\\s*>\\s*([\\s\\S]*?)\\s*<\\/\\s*ia${index}\\s*>`, "i"),
      );
      const value = match ? cleanTranslationText(match[1]) : "";
      if (value) translated.set(segment.key, value);
    });

    if (translated.size > 0) return translated;
  } catch {
    // Fall back to individual fields below when a provider drops marker tags.
  }

  const fallback = new Map<string, string>();
  await Promise.all(
    segments.map(async (segment) => {
      try {
        const result = await translateText(segment.value, targetLanguage);
        const value = cleanTranslationText(result.translated_text);
        if (value) fallback.set(segment.key, value);
      } catch {
        // Keep the original text for this field.
      }
    }),
  );
  return fallback;
}

function segmentValue(
  translated: Map<string, string>,
  key: string,
  fallback: string,
): string;
function segmentValue(
  translated: Map<string, string>,
  key: string,
  fallback: string | undefined,
): string | undefined;
function segmentValue(
  translated: Map<string, string>,
  key: string,
  fallback: string | undefined,
): string | undefined {
  return translated.get(key) ?? fallback;
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

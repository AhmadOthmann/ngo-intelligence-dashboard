export type Locale = "en" | "fr" | "de";

type TranslationKey =
  | "analysis"
  | "amount"
  | "basic"
  | "cancel"
  | "canYouApply"
  | "chooseImportance"
  | "deadline"
  | "enhanced"
  | "eligibility"
  | "filter"
  | "funder"
  | "funding"
  | "fundingLeads"
  | "hideDetails"
  | "ignore"
  | "keyDetails"
  | "languageEnglish"
  | "languageFrench"
  | "languageGerman"
  | "lastUpdate"
  | "loadMore"
  | "loading"
  | "newSignal"
  | "newSignals"
  | "noSignals"
  | "originalLanguage"
  | "peerActivity"
  | "peerChat"
  | "peerSignal"
  | "prioritySignals"
  | "profile"
  | "refresh"
  | "report"
  | "reports"
  | "save"
  | "saveSignal"
  | "saveSignalTitle"
  | "savedAs"
  | "search"
  | "searchPlaceholder"
  | "showDetails"
  | "signalIgnored"
  | "signalInbox"
  | "signals"
  | "sort"
  | "sourceErrorFallback"
  | "sourceExcerpt"
  | "sourceIssue"
  | "sourceIssues"
  | "suggestedNextStep"
  | "tags"
  | "theAiSuggested"
  | "translate"
  | "translation"
  | "translationProviderEmpty"
  | "updateSignals"
  | "viewSource"
  | "whyThisMatters"
  | "yourNgo";

type FilterKey = "all" | "news" | "funding" | "peer" | "reports";
type SortKey = "mostRelevant" | "mostUrgent" | "newest" | "deadlineSoon";
type ImportanceKey = "urgent" | "important" | "high" | "medium" | "low" | "info";

const DICTIONARY: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    analysis: "Analysis",
    amount: "Amount",
    basic: "Basic",
    cancel: "Cancel",
    canYouApply: "Can you apply?",
    chooseImportance: "Please choose how important this is for your organization.",
    deadline: "Deadline",
    enhanced: "Enhanced",
    eligibility: "Eligibility",
    filter: "Filter",
    funder: "Funder",
    funding: "Funding",
    fundingLeads: "Funding leads",
    hideDetails: "Hide details",
    ignore: "Ignore",
    keyDetails: "Key details",
    languageEnglish: "English",
    languageFrench: "French",
    languageGerman: "German",
    lastUpdate: "Last update",
    loadMore: "Load more",
    loading: "Loading...",
    newSignal: "new signal",
    newSignals: "new signals",
    noSignals: "No signals match your filters yet. AI keeps learning from what you save and ignore.",
    originalLanguage: "Original language",
    peerActivity: "Peer activity",
    peerChat: "Peer Chat",
    peerSignal: "Peer Signal",
    prioritySignals: "Priority signals",
    profile: "Profile",
    refresh: "Refresh",
    report: "Report",
    reports: "Reports",
    save: "Save",
    saveSignal: "Save signal",
    saveSignalTitle: "Save signal - choose importance",
    savedAs: "Saved as {importance} importance",
    search: "Search",
    searchPlaceholder: "Search signals by keyword",
    showDetails: "Show details",
    signalIgnored: "Signal ignored.",
    signalInbox: "Signal Inbox",
    signals: "Signals",
    sort: "Sort",
    sourceErrorFallback: "Showing sample signals until live sources are available.",
    sourceExcerpt: "Source excerpt",
    sourceIssue: "source issue",
    sourceIssues: "source issues",
    suggestedNextStep: "Suggested next step",
    tags: "Tags",
    theAiSuggested: "The AI suggested:",
    translate: "Translate",
    translation: "Translation",
    translationProviderEmpty:
      "Translation provider did not return a real translation. Restart the backend and try again.",
    updateSignals: "Update Signals",
    viewSource: "View source",
    whyThisMatters: "Why this matters",
    yourNgo: "your NGO",
  },
  fr: {
    analysis: "Analyse",
    amount: "Montant",
    basic: "Basique",
    cancel: "Annuler",
    canYouApply: "Pouvez-vous postuler ?",
    chooseImportance: "Choisissez l'importance pour votre organisation.",
    deadline: "Date limite",
    enhanced: "Avancee",
    eligibility: "Eligibilite",
    filter: "Filtre",
    funder: "Bailleur",
    funding: "Financement",
    fundingLeads: "Pistes de financement",
    hideDetails: "Masquer les details",
    ignore: "Ignorer",
    keyDetails: "Details cles",
    languageEnglish: "Anglais",
    languageFrench: "Francais",
    languageGerman: "Allemand",
    lastUpdate: "Derniere mise a jour",
    loadMore: "Charger plus",
    loading: "Chargement...",
    newSignal: "nouveau signal",
    newSignals: "nouveaux signaux",
    noSignals:
      "Aucun signal ne correspond encore a vos filtres. L'IA apprend de ce que vous sauvegardez et ignorez.",
    originalLanguage: "Langue originale",
    peerActivity: "Activite des pairs",
    peerChat: "Chat pairs",
    peerSignal: "Signal pair",
    prioritySignals: "Signaux prioritaires",
    profile: "Profil",
    refresh: "Actualiser",
    report: "Rapport",
    reports: "Rapports",
    save: "Sauvegarder",
    saveSignal: "Sauvegarder le signal",
    saveSignalTitle: "Sauvegarder le signal - choisir l'importance",
    savedAs: "Sauvegarde avec importance {importance}",
    search: "Rechercher",
    searchPlaceholder: "Rechercher des signaux par mot-cle",
    showDetails: "Afficher les details",
    signalIgnored: "Signal ignore.",
    signalInbox: "Boite de signaux",
    signals: "Signaux",
    sort: "Tri",
    sourceErrorFallback:
      "Affichage de signaux d'exemple jusqu'a ce que les sources en direct soient disponibles.",
    sourceExcerpt: "Extrait de la source",
    sourceIssue: "probleme de source",
    sourceIssues: "problemes de source",
    suggestedNextStep: "Prochaine etape suggeree",
    tags: "Tags",
    theAiSuggested: "L'IA a suggere :",
    translate: "Traduire",
    translation: "Traduction",
    translationProviderEmpty:
      "Le fournisseur de traduction n'a pas renvoye de vraie traduction. Redemarrez le backend et reessayez.",
    updateSignals: "Mettre a jour les signaux",
    viewSource: "Voir la source",
    whyThisMatters: "Pourquoi c'est important",
    yourNgo: "votre ONG",
  },
  de: {
    analysis: "Analyse",
    amount: "Betrag",
    basic: "Basis",
    cancel: "Abbrechen",
    canYouApply: "Koennen Sie sich bewerben?",
    chooseImportance: "Bitte waehlen Sie, wie wichtig dies fuer Ihre Organisation ist.",
    deadline: "Frist",
    enhanced: "Erweitert",
    eligibility: "Foerderfaehigkeit",
    filter: "Filter",
    funder: "Foerderer",
    funding: "Foerderung",
    fundingLeads: "Foerderhinweise",
    hideDetails: "Details ausblenden",
    ignore: "Ignorieren",
    keyDetails: "Wichtige Details",
    languageEnglish: "Englisch",
    languageFrench: "Franzoesisch",
    languageGerman: "Deutsch",
    lastUpdate: "Letzte Aktualisierung",
    loadMore: "Mehr laden",
    loading: "Laedt...",
    newSignal: "neues Signal",
    newSignals: "neue Signale",
    noSignals:
      "Noch keine Signale passen zu Ihren Filtern. Die KI lernt aus dem, was Sie speichern und ignorieren.",
    originalLanguage: "Originalsprache",
    peerActivity: "Peer-Aktivitaet",
    peerChat: "Peer-Chat",
    peerSignal: "Peer-Signal",
    prioritySignals: "Prioritaetssignale",
    profile: "Profil",
    refresh: "Aktualisieren",
    report: "Bericht",
    reports: "Berichte",
    save: "Speichern",
    saveSignal: "Signal speichern",
    saveSignalTitle: "Signal speichern - Wichtigkeit waehlen",
    savedAs: "Als {importance} wichtig gespeichert",
    search: "Suchen",
    searchPlaceholder: "Signale nach Stichwort suchen",
    showDetails: "Details anzeigen",
    signalIgnored: "Signal ignoriert.",
    signalInbox: "Signal-Postfach",
    signals: "Signale",
    sort: "Sortierung",
    sourceErrorFallback:
      "Beispielsignale werden angezeigt, bis Live-Quellen verfuegbar sind.",
    sourceExcerpt: "Quellenauszug",
    sourceIssue: "Quellenproblem",
    sourceIssues: "Quellenprobleme",
    suggestedNextStep: "Vorgeschlagener naechster Schritt",
    tags: "Tags",
    theAiSuggested: "Die KI hat vorgeschlagen:",
    translate: "Uebersetzen",
    translation: "Uebersetzung",
    translationProviderEmpty:
      "Der Uebersetzungsdienst hat keine echte Uebersetzung geliefert. Starten Sie das Backend neu und versuchen Sie es erneut.",
    updateSignals: "Signale aktualisieren",
    viewSource: "Quelle ansehen",
    whyThisMatters: "Warum das wichtig ist",
    yourNgo: "Ihre NGO",
  },
};

const FILTER_LABELS: Record<Locale, Record<FilterKey, string>> = {
  en: {
    all: "All",
    news: "News",
    funding: "Funding",
    peer: "Peer Signals",
    reports: "Reports",
  },
  fr: {
    all: "Tous",
    news: "Actualites",
    funding: "Financement",
    peer: "Signaux pairs",
    reports: "Rapports",
  },
  de: {
    all: "Alle",
    news: "Nachrichten",
    funding: "Foerderung",
    peer: "Peer-Signale",
    reports: "Berichte",
  },
};

const SORT_LABELS: Record<Locale, Record<SortKey, string>> = {
  en: {
    mostRelevant: "Most relevant",
    mostUrgent: "Most urgent",
    newest: "Newest",
    deadlineSoon: "Deadline soon",
  },
  fr: {
    mostRelevant: "Les plus pertinents",
    mostUrgent: "Les plus urgents",
    newest: "Les plus recents",
    deadlineSoon: "Echeance proche",
  },
  de: {
    mostRelevant: "Am relevantesten",
    mostUrgent: "Am dringendsten",
    newest: "Neueste",
    deadlineSoon: "Frist bald",
  },
};

const IMPORTANCE_LABELS: Record<Locale, Record<ImportanceKey, string>> = {
  en: {
    urgent: "Urgent",
    important: "Important",
    high: "High",
    medium: "Medium",
    low: "Low",
    info: "For information",
  },
  fr: {
    urgent: "Urgent",
    important: "Important",
    high: "Elevee",
    medium: "Moyenne",
    low: "Faible",
    info: "Pour information",
  },
  de: {
    urgent: "Dringend",
    important: "Wichtig",
    high: "Hoch",
    medium: "Mittel",
    low: "Niedrig",
    info: "Zur Information",
  },
};

export function localeFromLanguage(language?: string | null): Locale {
  const normalized = language?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("german") || normalized === "de" || normalized === "deutsch") return "de";
  if (normalized.startsWith("french") || normalized === "fr" || normalized.startsWith("franc")) return "fr";
  return "en";
}

export function translate(language: string | undefined | null, key: TranslationKey): string {
  return DICTIONARY[localeFromLanguage(language)][key];
}

export function formatTranslation(
  language: string | undefined | null,
  key: TranslationKey,
  replacements: Record<string, string | number>,
): string {
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    translate(language, key),
  );
}

export function filterLabel(language: string | undefined | null, key: FilterKey): string {
  return FILTER_LABELS[localeFromLanguage(language)][key];
}

export function sortLabel(language: string | undefined | null, key: SortKey): string {
  return SORT_LABELS[localeFromLanguage(language)][key];
}

export function importanceLabel(
  language: string | undefined | null,
  key: ImportanceKey,
): string {
  return IMPORTANCE_LABELS[localeFromLanguage(language)][key];
}

export function typeLabel(language: string | undefined | null, type: string): string {
  if (type === "news") return filterLabel(language, "news");
  if (type === "funding") return filterLabel(language, "funding");
  if (type === "report") return translate(language, "report");
  if (type === "peer") return translate(language, "peerSignal");
  return type;
}

export function languageOptionLabel(language: string | undefined | null, option: string): string {
  const normalized = option.toLowerCase();
  if (normalized === "german") return translate(language, "languageGerman");
  if (normalized === "french") return translate(language, "languageFrench");
  if (normalized === "english") return translate(language, "languageEnglish");
  return option;
}

export function greeting(language: string | undefined | null, hour = new Date().getHours()): string {
  const locale = localeFromLanguage(language);
  if (locale === "fr") return hour < 12 ? "Bonjour" : hour < 18 ? "Bon apres-midi" : "Bonsoir";
  if (locale === "de") return hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export type { FilterKey, ImportanceKey, SortKey };

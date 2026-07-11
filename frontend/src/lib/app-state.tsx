import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getItems, ingestRss, itemToSignal, translateText, type IngestResult } from "./api";
import { BURUNDI_KIDS, DEMO_CONVERSATIONS, DEMO_SIGNALS } from "./demo-data";
import { localeFromLanguage } from "./i18n";
import type {
  ChatMessage,
  Conversation,
  NgoProfile,
  SavedCategory,
  SavedItem,
  SavedStatus,
  Signal,
} from "./types";

interface AppState {
  profile: NgoProfile | null;
  profileReady: boolean;
  setProfile: (p: NgoProfile | null) => void;
  loginAsDemo: () => void;
  signals: Signal[];
  signalSource: "backend" | "demo";
  isLoadingSignals: boolean;
  signalError: string | null;
  ingestResult: IngestResult | null;
  hasMoreSignals: boolean;
  refreshSignals: (q?: string) => Promise<void>;
  loadMoreSignals: () => Promise<void>;
  ingestFeeds: (q?: string) => Promise<void>;
  ignoredIds: Set<string>;
  ignoreSignal: (id: string) => void;
  saved: SavedItem[];
  saveSignal: (s: Signal, importance?: "high" | "medium" | "low", category?: SavedCategory) => void;
  updateSavedStatus: (id: string, status: SavedStatus) => void;
  addNote: (id: string, note: string) => void;
  archive: (id: string) => void;
  conversations: Conversation[];
  sendMessage: (convId: string, text: string, lang: string) => Promise<void>;
  saveInsight: (text: string) => void;
}

const Ctx = createContext<AppState | null>(null);
const PAGE_SIZE = 20;
const PROFILE_STORAGE_KEY = "impact-atlas-demo-profile-v1";

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<NgoProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    buildLocalizedDemoConversations(BURUNDI_KIDS.language),
  );
  const [backendSignals, setBackendSignals] = useState<Signal[]>([]);
  const [hasLoadedBackendSignals, setHasLoadedBackendSignals] = useState(false);
  const [backendQuery, setBackendQuery] = useState("");
  const [hasMoreSignals, setHasMoreSignals] = useState(false);
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);

  const setProfile = useCallback((nextProfile: NgoProfile | null) => {
    setProfileState(nextProfile);

    if (typeof window === "undefined") return;
    try {
      if (nextProfile) {
        window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      } else {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    } catch {
      // Storage can be unavailable in private browsing or hardened environments.
    }
  }, []);

  const loginAsDemo = useCallback(() => setProfile(BURUNDI_KIDS), [setProfile]);

  useEffect(() => {
    try {
      const storedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const parsedProfile: unknown = JSON.parse(storedProfile);
        if (isNgoProfile(parsedProfile)) {
          setProfileState(parsedProfile);
        } else {
          window.localStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      }
    } catch {
      try {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      } catch {
        // Ignore storage failures; the demo remains usable for this page load.
      }
    } finally {
      setProfileReady(true);
    }
  }, []);

  const refreshSignals = useCallback(async (q = "") => {
    setIsLoadingSignals(true);
    setSignalError(null);
    try {
      const items = await getItems({ q, limit: PAGE_SIZE, offset: 0 });
      setBackendQuery(q);
      setHasLoadedBackendSignals(true);
      setBackendSignals(items.map(itemToSignal));
      setHasMoreSignals(items.length === PAGE_SIZE);
    } catch (error) {
      setSignalError(error instanceof Error ? error.message : "Backend could not be reached");
    } finally {
      setIsLoadingSignals(false);
    }
  }, []);

  const loadMoreSignals = useCallback(async () => {
    setIsLoadingSignals(true);
    setSignalError(null);
    try {
      const items = await getItems({
        q: backendQuery,
        limit: PAGE_SIZE,
        offset: backendSignals.length,
      });
      setBackendSignals((prev) => [...prev, ...items.map(itemToSignal)]);
      setHasMoreSignals(items.length === PAGE_SIZE);
    } catch (error) {
      setSignalError(error instanceof Error ? error.message : "More items could not be loaded");
    } finally {
      setIsLoadingSignals(false);
    }
  }, [backendQuery, backendSignals.length]);

  const ingestFeeds = useCallback(
    async (q = backendQuery) => {
      setIsLoadingSignals(true);
      setSignalError(null);
      try {
        const result = await ingestRss();
        setIngestResult(result);
        const items = await getItems({ q, limit: PAGE_SIZE, offset: 0 });
        setBackendQuery(q);
        setHasLoadedBackendSignals(true);
        setBackendSignals(items.map(itemToSignal));
        setHasMoreSignals(items.length === PAGE_SIZE);
      } catch (error) {
        setSignalError(error instanceof Error ? error.message : "RSS ingestion failed");
      } finally {
        setIsLoadingSignals(false);
      }
    },
    [backendQuery],
  );

  useEffect(() => {
    void refreshSignals();
  }, [refreshSignals]);

  const profileLanguage = profile?.language;
  useEffect(() => {
    if (!profileLanguage) return;
    setConversations((current) =>
      hasUserChatMessages(current) ? current : buildLocalizedDemoConversations(profileLanguage),
    );
  }, [profileLanguage]);

  const ignoreSignal = useCallback((id: string) => {
    setIgnoredIds((prev) => new Set(prev).add(id));
  }, []);

  const saveSignal = useCallback(
    (s: Signal, importance?: "high" | "medium" | "low", category?: SavedCategory) => {
      const cat: SavedCategory =
        category ??
        (s.type === "funding"
          ? "funding_pipeline"
          : s.type === "news"
            ? "news_press"
            : s.type === "report"
              ? "field_intel"
              : "peer");
      setSaved((prev) =>
        prev.some((i) => i.signal.id === s.id)
          ? prev
          : [
              {
                signal: s,
                category: cat,
                status: "saved",
                savedAt: new Date().toISOString().slice(0, 10),
                importance,
              },
              ...prev,
            ],
      );
    },
    [],
  );

  const updateSavedStatus = useCallback((id: string, status: SavedStatus) => {
    setSaved((prev) => prev.map((i) => (i.signal.id === id ? { ...i, status } : i)));
  }, []);

  const addNote = useCallback((id: string, note: string) => {
    setSaved((prev) => prev.map((i) => (i.signal.id === id ? { ...i, note } : i)));
  }, []);

  const archive = useCallback((id: string) => {
    setSaved((prev) => prev.map((i) => (i.signal.id === id ? { ...i, status: "archived" } : i)));
  }, []);

  const sendMessage = useCallback(
    async (convId: string, text: string, lang: string) => {
      const conversation = conversations.find((item) => item.id === convId);
      if (!conversation) return;

      const targetLang = inferPeerLanguage(conversation, lang);
      const originalLang = languageCode(lang);
      let translatedText = text;
      let translationError: string | undefined;
      let translationKind: ChatMessage["translationKind"];

      if (targetLang !== originalLang) {
        try {
          translatedText = cleanTranslationText(
            (await translateText(text, languageName(targetLang))).translated_text,
          );
          if (!translatedText) {
            translatedText = text;
            translationError = "Translation unavailable";
          } else {
            translationKind = "provider";
          }
        } catch (error) {
          translatedText = text;
          translationError = error instanceof Error ? error.message : "Translation unavailable";
        }
      }

      const now = new Date();
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== convId) return conversation;
          const msg: ChatMessage = {
            id: `m-${Date.now()}`,
            sender: "me",
            originalText: text,
            originalLang,
            translatedText,
            targetLang,
            translationKind,
            translationError,
            timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            sentAt: now.toISOString(),
          };
          return { ...conversation, messages: [...conversation.messages, msg] };
        }),
      );
    },
    [conversations],
  );

  const saveInsight = useCallback(
    (text: string) => {
      const copy = peerInsightCopy(profile?.language);
      const s: Signal = {
        id: `insight-${Date.now()}`,
        priority: "relevant",
        type: "peer",
        title: copy.title,
        source: copy.source,
        date: new Date().toISOString().slice(0, 10),
        dateIso: new Date().toISOString(),
        originalLanguage: "auto",
        summary: text,
        whyRecommended: copy.whyRecommended,
        suggestedAction: copy.suggestedAction,
      };
      setSaved((prev) => [
        {
          signal: s,
          category: "funding_pipeline",
          status: "saved",
          savedAt: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ]);
    },
    [profile?.language],
  );

  const value = useMemo<AppState>(
    () => ({
      profile,
      profileReady,
      setProfile,
      loginAsDemo,
      signals: hasLoadedBackendSignals ? backendSignals : DEMO_SIGNALS,
      signalSource: hasLoadedBackendSignals ? "backend" : "demo",
      isLoadingSignals,
      signalError,
      ingestResult,
      hasMoreSignals,
      refreshSignals,
      loadMoreSignals,
      ingestFeeds,
      ignoredIds,
      ignoreSignal,
      saved,
      saveSignal,
      updateSavedStatus,
      addNote,
      archive,
      conversations,
      sendMessage,
      saveInsight,
    }),
    [
      profile,
      profileReady,
      setProfile,
      hasLoadedBackendSignals,
      backendSignals,
      isLoadingSignals,
      signalError,
      ingestResult,
      hasMoreSignals,
      refreshSignals,
      loadMoreSignals,
      ingestFeeds,
      ignoredIds,
      saved,
      conversations,
      loginAsDemo,
      ignoreSignal,
      saveSignal,
      updateSavedStatus,
      addNote,
      archive,
      sendMessage,
      saveInsight,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}

function inferPeerLanguage(conversation: Conversation, ownLanguage: string): string {
  const peerMessage = conversation.messages.find((message) => message.sender === "peer");
  if (peerMessage) return peerMessage.originalLang;

  const codes = conversation.translationStatus.match(/\b[A-Z]{2}\b/g);
  if (codes && codes.length >= 2) {
    const ownCode = languageCode(ownLanguage);
    return codes[0] === ownCode ? codes[1] : codes[0];
  }
  if (codes && codes.length === 1) return codes[0];

  return languageCode(ownLanguage);
}

function isNgoProfile(value: unknown): value is NgoProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<NgoProfile>;
  return (
    typeof profile.id === "string" &&
    typeof profile.name === "string" &&
    typeof profile.country === "string" &&
    typeof profile.language === "string" &&
    isOptionalString(profile.city) &&
    isOptionalString(profile.website) &&
    isOptionalString(profile.description) &&
    isStringArray(profile.topics) &&
    isStringArray(profile.keywords) &&
    isStringArray(profile.focusAreas) &&
    isStringArray(profile.regions) &&
    isStringArray(profile.suggestedKeywords) &&
    (profile.sources === undefined || isStringArray(profile.sources)) &&
    isOptionalString(profile.sourcesNote) &&
    isFundingPreferences(profile.fundingPrefs)
  );
}

function isFundingPreferences(value: NgoProfile["fundingPrefs"] | unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const preferences = value as NonNullable<NgoProfile["fundingPrefs"]>;
  return (
    typeof preferences.enabled === "boolean" &&
    isStringArray(preferences.regions) &&
    isOptionalString(preferences.min) &&
    isOptionalString(preferences.max) &&
    isStringArray(preferences.applicantTypes) &&
    isStringArray(preferences.fundingTopics) &&
    isStringArray(preferences.chips) &&
    isOptionalString(preferences.urgency)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function languageCode(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (normalized.startsWith("german") || normalized === "de") return "DE";
  if (normalized.startsWith("french") || normalized === "fr") return "FR";
  if (normalized.startsWith("english") || normalized === "en") return "EN";
  return language || "auto";
}

function languageName(language: string): string {
  const code = languageCode(language);
  if (code === "DE") return "German";
  if (code === "FR") return "French";
  return "English";
}

function peerInsightCopy(language: string | undefined) {
  const locale = localeFromLanguage(language);
  if (locale === "fr") {
    return {
      source: "Demo de chat pair",
      suggestedAction: "Utiliser uniquement comme note de demonstration.",
      title: "Note simulee sauvegardee depuis le chat local",
      whyRecommended: "Sauvegardee depuis une simulation locale; aucune ONG ne l'a fournie.",
    };
  }
  if (locale === "de") {
    return {
      source: "Peer-Chat-Demo",
      suggestedAction: "Nur als Demo-Notiz verwenden.",
      title: "Simulierte Notiz aus lokalem Chat gespeichert",
      whyRecommended: "Aus einer lokalen Simulation gespeichert; keine NGO hat sie bereitgestellt.",
    };
  }
  return {
    source: "Peer Chat Demo",
    suggestedAction: "Use only as a demonstration note.",
    title: "Simulated note saved from local chat demo",
    whyRecommended: "Saved from a local simulation; no organization provided it.",
  };
}

function cleanTranslationText(text: string): string {
  const value = text.trim();
  if (
    /^\[Demo translation fallback: [^\]]+\]\s*/.test(value) ||
    /^\[Translation preview: [^\]]+\]\s*/.test(value) ||
    /^\[(German|French|English|DE|FR|EN) preview\]\s*/.test(value)
  ) {
    return "";
  }
  return value;
}

function buildLocalizedDemoConversations(preferredLanguage: string): Conversation[] {
  const ownCode = supportedDemoLanguageCode(preferredLanguage);
  return DEMO_CONVERSATIONS.map((conversation, index) => {
    const peerCode = demoPeerLanguage(ownCode, index);
    const localized: Conversation = {
      ...conversation,
      translationStatus:
        peerCode === ownCode
          ? `Same language (${ownCode})`
          : `Auto-translating ${peerCode} <-> ${ownCode}`,
      messages: [],
    };

    if (conversation.id !== "c1") return localized;

    const ownText = DEMO_CHAT_TEXT[ownCode];
    const peerText = DEMO_CHAT_TEXT[peerCode];
    return {
      ...localized,
      messages: [
        {
          id: "m1",
          sender: "me",
          originalText: ownText.me,
          originalLang: ownCode,
          translatedText: peerText.me,
          targetLang: peerCode,
          translationKind: "demo",
          timestamp: "09:14",
          sentAt: minutesAgo(180),
        },
        {
          id: "m2",
          sender: "peer",
          originalText: peerText.peer,
          originalLang: peerCode,
          translatedText: ownText.peer,
          targetLang: ownCode,
          translationKind: "demo",
          timestamp: "10:02",
          sentAt: minutesAgo(12),
        },
      ],
    };
  });
}

function supportedDemoLanguageCode(language: string): "DE" | "FR" | "EN" {
  const code = languageCode(language);
  if (code === "DE" || code === "FR" || code === "EN") return code;
  return "EN";
}

function demoPeerLanguage(ownCode: "DE" | "FR" | "EN", index: number): "DE" | "FR" | "EN" {
  const candidates: Array<"DE" | "FR" | "EN"> =
    index % 2 === 0 ? ["FR", "EN", "DE"] : ["EN", "FR", "DE"];
  return candidates.find((code) => code !== ownCode) ?? "EN";
}

function hasUserChatMessages(conversations: Conversation[]): boolean {
  return conversations.some((conversation) =>
    conversation.messages.some((message) => /^m-\d+$/.test(message.id)),
  );
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const DEMO_CHAT_TEXT = {
  DE: {
    me: "Hallo, wir haben gesehen, dass ihr diese Foerdermoeglichkeit fuer Maedchenbildung gespeichert habt. Habt ihr bereits geprueft, ob unsere Organisation antragsberechtigt ist?",
    peer: "Hallo, wir haben die Kriterien geprueft. Ein lokaler Partner ist verpflichtend, aber eure Organisation kann koordinieren.",
  },
  FR: {
    me: "Bonjour, nous avons vu que vous avez enregistre cette opportunite de financement pour l'education des filles. Avez-vous deja verifie si notre organisation peut deposer une demande ?",
    peer: "Bonjour, nous avons verifie les criteres. Un partenaire local est obligatoire, mais votre organisation peut coordonner.",
  },
  EN: {
    me: "Hello, we saw that you saved this funding opportunity for girls' education. Have you checked whether our organization is eligible to apply?",
    peer: "Hello, we checked the criteria. A local partner is required, but your organization can coordinate.",
  },
} satisfies Record<"DE" | "FR" | "EN", { me: string; peer: string }>;

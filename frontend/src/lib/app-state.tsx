import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BURUNDI_KIDS, DEMO_CONVERSATIONS, DEMO_SIGNALS } from "./demo-data";
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
  setProfile: (p: NgoProfile | null) => void;
  loginAsDemo: () => void;
  signals: Signal[];
  ignoredIds: Set<string>;
  ignoreSignal: (id: string) => void;
  saved: SavedItem[];
  saveSignal: (s: Signal, importance?: "high" | "medium" | "low", category?: SavedCategory) => void;
  updateSavedStatus: (id: string, status: SavedStatus) => void;
  addNote: (id: string, note: string) => void;
  archive: (id: string) => void;
  conversations: Conversation[];
  sendMessage: (convId: string, text: string, lang: string) => void;
  saveInsight: (text: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<NgoProfile | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(DEMO_CONVERSATIONS);

  const loginAsDemo = useCallback(() => setProfile(BURUNDI_KIDS), []);

  const ignoreSignal = useCallback((id: string) => {
    setIgnoredIds((prev) => new Set(prev).add(id));
  }, []);

  const saveSignal = useCallback((s: Signal, importance?: "high" | "medium" | "low", category?: SavedCategory) => {
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
  }, []);

  const updateSavedStatus = useCallback((id: string, status: SavedStatus) => {
    setSaved((prev) => prev.map((i) => (i.signal.id === id ? { ...i, status } : i)));
  }, []);

  const addNote = useCallback((id: string, note: string) => {
    setSaved((prev) => prev.map((i) => (i.signal.id === id ? { ...i, note } : i)));
  }, []);

  const archive = useCallback((id: string) => {
    setSaved((prev) =>
      prev.map((i) => (i.signal.id === id ? { ...i, status: "archived" } : i)),
    );
  }, []);

  const sendMessage = useCallback((convId: string, text: string, lang: string) => {
    const now = new Date();
    const msg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "me",
      originalText: text,
      originalLang: lang,
      translatedText: text, // mock translation
      targetLang: "auto",
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sentAt: now.toISOString(),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, msg] } : c)),
    );
  }, []);

  const saveInsight = useCallback((text: string) => {
    const s: Signal = {
      id: `insight-${Date.now()}`,
      priority: "relevant",
      type: "peer",
      title: "Peer insight saved from Peer Chat",
      source: "Peer Chat",
      date: new Date().toISOString().slice(0, 10),
      originalLanguage: "auto",
      summary: text,
      whyRecommended: "Saved by you from a peer conversation.",
      suggestedAction: "Reference in your funding pipeline.",
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
  }, []);

  const value = useMemo<AppState>(
    () => ({
      profile,
      setProfile,
      loginAsDemo,
      signals: DEMO_SIGNALS,
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
    [profile, ignoredIds, saved, conversations, loginAsDemo, ignoreSignal, saveSignal, updateSavedStatus, addNote, archive, sendMessage, saveInsight],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bookmark, Languages, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { toast } from "sonner";
import { knownLabel, localeFromLanguage, translate } from "@/lib/i18n";

export const Route = createFileRoute("/app/chat")({
  head: () => ({ meta: [{ title: "Peer Chat Demo - Impact Atlas" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { conversations, sendMessage, saveInsight, profile } = useAppState();
  const language = profile?.language;
  const copy = chatCopy(language);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [isSending, setIsSending] = useState(false);

  const active = activeId ? (conversations.find((c) => c.id === activeId) ?? null) : null;

  if (!active) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {translate(language, "peerChat")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {copy.simulationNotice}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {conversations.map((conversation) => {
            const last = conversation.messages[conversation.messages.length - 1];
            return (
              <button
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
                className="flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left transition last:border-b-0 hover:bg-secondary/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {conversation.orgName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {conversation.orgName}
                    </div>
                    {last && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatChatTimeLocalized(last.sentAt, language) || last.timestamp}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {conversation.country} /{" "}
                    {conversation.sharedTopics
                      .slice(0, 2)
                      .map((topic) => knownLabel(language, topic))
                      .join(", ")}
                  </div>
                  {last && (
                    <div className="mt-1 line-clamp-1 text-xs text-foreground/70">
                      {last.sender === "me" ? last.originalText : last.translatedText}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col gap-3 px-3 py-3 md:h-screen md:px-5 md:py-6">
      <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            onClick={() => setActiveId(null)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/70 hover:bg-secondary"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="text-sm font-semibold text-foreground">{active.orgName}</div>
            <div className="text-xs text-muted-foreground">
              {active.country} /{" "}
              {active.sharedTopics.map((topic) => knownLabel(language, topic)).join(", ")}
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Languages className="h-3 w-3" />{" "}
            {localizedTranslationStatus(active.translationStatus, language)}
          </span>
        </header>

        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-950">
          {copy.simulationNotice}
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-4 py-5 md:px-5">
          {active.messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
              {copy.empty}
            </div>
          )}
          {active.messages.map((message) => {
            const mine = message.sender === "me";
            const toggled = !!showOriginal[message.id];
            const translationFailed = !!message.translationError;
            const visibleText = translationFailed
              ? message.originalText
              : mine
                ? toggled
                  ? message.translatedText
                  : message.originalText
                : toggled
                  ? message.originalText
                  : message.translatedText;
            const translationLabel = translationFailed
              ? `${copy.writtenIn} ${message.originalLang} / ${copy.translationUnavailable}`
              : message.translationKind === "demo"
                ? `${copy.demoTranslationPreview} ${message.originalLang} -> ${message.targetLang}`
                : message.translationKind === "provider"
                  ? `${copy.providerTranslated} ${message.originalLang} -> ${message.targetLang}`
                  : copy.noTranslationNeeded;
            const toggleLabel = translationFailed
              ? ""
              : mine
                ? toggled
                  ? copy.showMyMessage
                  : copy.showPeerLanguagePreview
                : toggled
                  ? copy.showTranslation
                  : copy.showOriginal;

            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-[10px] opacity-80">
                    <span>{mine ? (profile?.name ?? copy.you) : active.orgName}</span>
                    <span>
                      {formatChatTimeLocalized(message.sentAt, language) || message.timestamp}
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed">{visibleText}</div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] opacity-80">
                    <span className="inline-flex items-center gap-1">
                      <Languages className="h-3 w-3" /> {translationLabel}
                    </span>
                    {!translationFailed && (
                      <button
                        className="underline-offset-2 hover:underline"
                        onClick={() =>
                          setShowOriginal((current) => ({
                            ...current,
                            [message.id]: !current[message.id],
                          }))
                        }
                      >
                        {toggleLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="border-t border-border bg-card p-4">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={copy.placeholder}
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isSending}
              onClick={async () => {
                if (!draft.trim()) return;
                const text = draft;
                setIsSending(true);
                try {
                  await sendMessage(active.id, text, profile?.language ?? "auto");
                  setDraft("");
                  toast.success(copy.addedLocally);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : copy.messageFailed);
                } finally {
                  setIsSending(false);
                }
              }}
            >
              <Send className="h-4 w-4" /> {isSending ? copy.sending : copy.send}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft(draftReply(profile?.language))}
            >
              <Sparkles className="h-4 w-4" /> {copy.aiDraftReply}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                saveInsight(`${copy.savedInsightPrefix} ${active.orgName}`);
                toast.success(copy.savedToTags);
              }}
            >
              <Bookmark className="h-4 w-4" /> {copy.saveInsightToTags}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{copy.localOnly}</p>
        </footer>
      </section>
    </div>
  );
}

function draftReply(language: string | undefined): string {
  const normalized = language?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("german") || normalized === "de") {
    return "Hallo, vielen Dank fuer eure Notizen. Habt ihr Erfahrungen mit passenden Antragstellern oder lokalen Partnern?";
  }
  if (normalized.startsWith("french") || normalized === "fr") {
    return "Bonjour, merci pour vos notes. Avez-vous de l'experience avec des demandeurs eligibles ou des partenaires locaux ?";
  }
  return "Hello, thank you for your notes. Do you have experience with eligible applicants or local partners?";
}

function chatCopy(language: string | undefined) {
  const locale = localeFromLanguage(language);
  if (locale === "fr") {
    return {
      addedLocally: "Ajoute uniquement a cette simulation locale; rien n'a ete envoye.",
      aiDraftReply: "Brouillon de demo local",
      demoTranslationPreview: "Apercu de traduction de demo locale (non livre)",
      empty: "Aucun message simule pour l'instant. Ajoutez-en un uniquement dans ce navigateur.",
      localOnly: "Les messages restent dans la memoire de ce navigateur et ne sont jamais livres.",
      messageFailed: "La traduction du message a echoue",
      noTranslationNeeded: "Aucune traduction necessaire / simulation locale",
      placeholder: "Ecrivez un message simule. Il ne sera pas envoye a l'organisation affichee.",
      providerTranslated: "Traduction fournisseur pour cette simulation locale",
      savedInsightPrefix: "Note simulee sauvegardee depuis le chat local avec l'exemple",
      savedToTags: "Sauvegarde dans Tags",
      saveInsightToTags: "Sauvegarder dans Tags",
      send: "Ajouter a la simulation",
      sending: "Ajout...",
      showMyMessage: "Afficher mon message",
      showOriginal: "Afficher l'original",
      showPeerLanguagePreview: "Afficher l'apercu dans la langue du pair",
      showTranslation: "Afficher la traduction",
      simulationNotice:
        "Simulation locale uniquement: aucune organisation reelle ne recoit ces messages.",
      subtitle: "Simulation locale avec des organisations exemples; aucun message n'est livre.",
      translationUnavailable: "non traduit; fournisseur indisponible ou apercu uniquement",
      writtenIn: "Ecrit en",
      you: "Vous",
    };
  }
  if (locale === "de") {
    return {
      addedLocally: "Nur zu dieser lokalen Simulation hinzugefuegt; nichts wurde gesendet.",
      aiDraftReply: "Lokaler Demo-Entwurf",
      demoTranslationPreview: "Lokale Demo-Uebersetzungsvorschau (nicht zugestellt)",
      empty: "Noch keine simulierten Nachrichten. Fuegen Sie eine nur in diesem Browser hinzu.",
      localOnly: "Nachrichten bleiben im Browser-Speicher und werden nie zugestellt.",
      messageFailed: "Nachrichtenuebersetzung fehlgeschlagen",
      noTranslationNeeded: "Keine Uebersetzung noetig / lokale Simulation",
      placeholder:
        "Schreiben Sie eine simulierte Nachricht. Sie wird nicht an die angezeigte Organisation gesendet.",
      providerTranslated: "Anbieter-Uebersetzung fuer diese lokale Simulation",
      savedInsightPrefix: "Simulierte Notiz aus lokalem Chat mit Beispiel",
      savedToTags: "In Tags gespeichert",
      saveInsightToTags: "In Tags speichern",
      send: "Zur Simulation hinzufuegen",
      sending: "Wird hinzugefuegt...",
      showMyMessage: "Meine Nachricht anzeigen",
      showOriginal: "Original anzeigen",
      showPeerLanguagePreview: "Vorschau in Peer-Sprache anzeigen",
      showTranslation: "Uebersetzung anzeigen",
      simulationNotice:
        "Nur lokale Simulation: Keine echte Organisation erhaelt diese Nachrichten.",
      subtitle: "Lokale Simulation mit Beispielorganisationen; nichts wird zugestellt.",
      translationUnavailable: "nicht uebersetzt; Anbieter nicht verfuegbar oder nur Vorschau",
      writtenIn: "Geschrieben auf",
      you: "Sie",
    };
  }
  return {
    addedLocally: "Added only to this local simulation; nothing was sent.",
    aiDraftReply: "Local demo draft",
    demoTranslationPreview: "Local demo translation preview (not delivered)",
    empty: "No simulated messages yet. Add one only in this browser.",
    localOnly: "Messages remain in browser memory and are never delivered.",
    messageFailed: "Message translation failed",
    noTranslationNeeded: "No translation needed / local simulation",
    placeholder: "Write a simulated message. It will not be sent to the organization shown.",
    providerTranslated: "Provider translation for this local simulation",
    savedInsightPrefix: "Saved simulated note from local chat with example",
    savedToTags: "Saved to Tags",
    saveInsightToTags: "Save insight to Tags",
    send: "Add to simulation",
    sending: "Adding...",
    showMyMessage: "Show my message",
    showOriginal: "Show original",
    showPeerLanguagePreview: "Show peer-language preview",
    showTranslation: "Show translation",
    simulationNotice: "Local simulation only: no real organization receives these messages.",
    subtitle: "Local simulation with example organizations; no messages are delivered.",
    translationUnavailable: "not translated; provider unavailable or preview only",
    writtenIn: "Written in",
    you: "You",
  };
}

function localizedTranslationStatus(status: string, language: string | undefined): string {
  const codes = status.match(/\b[A-Z]{2}\b/g) ?? [];
  const locale = localeFromLanguage(language);
  if (codes.length === 1) {
    if (locale === "fr") return `Meme langue (${codes[0]})`;
    if (locale === "de") return `Gleiche Sprache (${codes[0]})`;
    return `Same language (${codes[0]})`;
  }
  if (codes.length >= 2) {
    if (locale === "fr") return `Simulation de traduction ${codes[0]} <-> ${codes[1]}`;
    if (locale === "de") return `Uebersetzungssimulation ${codes[0]} <-> ${codes[1]}`;
    return `Translation simulation ${codes[0]} <-> ${codes[1]}`;
  }
  return status;
}

function formatChatTimeLocalized(iso: string | undefined, language: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  const locale = localeFromLanguage(language);
  if (diffMin < 1) {
    if (locale === "fr") return "A l'instant";
    if (locale === "de") return "Gerade eben";
    return "Just now";
  }
  if (diffMin < 60) {
    if (locale === "fr") return `il y a ${diffMin} min`;
    if (locale === "de") return `vor ${diffMin} Min.`;
    return `${diffMin} min ago`;
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

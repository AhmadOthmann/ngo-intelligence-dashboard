import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bookmark, Languages, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { toast } from "sonner";
import { knownLabel, localeFromLanguage, translate } from "@/lib/i18n";

export const Route = createFileRoute("/app/chat")({
  head: () => ({ meta: [{ title: "Peer Chat - Impact Atlas" }] }),
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

  const active = activeId ? conversations.find((c) => c.id === activeId) ?? null : null;

  if (!active) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {translate(language, "peerChat")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.subtitle}
          </p>
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
                    {conversation.sharedTopics.slice(0, 2).map((topic) => knownLabel(language, topic)).join(", ")}
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
              {active.country} / {active.sharedTopics.map((topic) => knownLabel(language, topic)).join(", ")}
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Languages className="h-3 w-3" /> {localizedTranslationStatus(active.translationStatus, language)}
          </span>
        </header>

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
              ? `${copy.sentIn} ${message.originalLang} / ${copy.translationUnavailable}`
              : mine
              ? `${copy.sentIn} ${message.originalLang} / ${copy.translatedTo} ${message.targetLang}`
              : `${copy.autoTranslated} ${message.originalLang} -> ${message.targetLang}`;
            const toggleLabel = translationFailed
              ? ""
              : mine
              ? toggled
                ? copy.showMyMessage
                : copy.showRecipientTranslation
              : toggled
                ? copy.showTranslation
                : copy.showOriginal;

            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-[10px] opacity-80">
                    <span>{mine ? profile?.name ?? copy.you : active.orgName}</span>
                    <span>{formatChatTimeLocalized(message.sentAt, language) || message.timestamp}</span>
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
      aiDraftReply: "Brouillon IA",
      autoTranslated: "Traduit automatiquement",
      empty: "Aucun message pour l'instant. Lancez la conversation et Impact Atlas traduira.",
      messageFailed: "La traduction du message a echoue",
      placeholder: "Ecrivez dans votre langue. Impact Atlas traduira pour le destinataire.",
      savedInsightPrefix: "Note sauvegardee depuis la conversation avec",
      savedToTags: "Sauvegarde dans Tags",
      saveInsightToTags: "Sauvegarder dans Tags",
      send: "Envoyer",
      sending: "Envoi...",
      sentIn: "Envoye en",
      showMyMessage: "Afficher mon message",
      showOriginal: "Afficher l'original",
      showRecipientTranslation: "Afficher la traduction destinataire",
      showTranslation: "Afficher la traduction",
      subtitle: "Conversations avec des ONG pairs, traduites entre votre langue et la leur.",
      translatedTo: "traduit vers",
      translationUnavailable: "traduction indisponible",
      you: "Vous",
    };
  }
  if (locale === "de") {
    return {
      aiDraftReply: "KI-Antwortentwurf",
      autoTranslated: "Automatisch uebersetzt",
      empty: "Noch keine Nachrichten. Starten Sie die Unterhaltung und Impact Atlas uebersetzt.",
      messageFailed: "Nachrichtenuebersetzung fehlgeschlagen",
      placeholder: "Schreiben Sie in Ihrer Sprache. Impact Atlas uebersetzt fuer den Empfaenger.",
      savedInsightPrefix: "Gespeicherte Notiz aus der Unterhaltung mit",
      savedToTags: "In Tags gespeichert",
      saveInsightToTags: "In Tags speichern",
      send: "Senden",
      sending: "Sendet...",
      sentIn: "Gesendet in",
      showMyMessage: "Meine Nachricht anzeigen",
      showOriginal: "Original anzeigen",
      showRecipientTranslation: "Empfaenger-Uebersetzung anzeigen",
      showTranslation: "Uebersetzung anzeigen",
      subtitle: "Unterhaltungen mit Peer-NGOs, uebersetzt zwischen Ihrer Sprache und ihrer.",
      translatedTo: "uebersetzt nach",
      translationUnavailable: "Uebersetzung nicht verfuegbar",
      you: "Sie",
    };
  }
  return {
    aiDraftReply: "AI draft reply",
    autoTranslated: "Auto-translated",
    empty: "No messages yet. Start the conversation and Impact Atlas will translate it.",
    messageFailed: "Message translation failed",
    placeholder: "Write in your language. Impact Atlas will translate it for the recipient.",
    savedInsightPrefix: "Saved insight from conversation with",
    savedToTags: "Saved to Tags",
    saveInsightToTags: "Save insight to Tags",
    send: "Send",
    sending: "Sending...",
    sentIn: "Sent in",
    showMyMessage: "Show my message",
    showOriginal: "Show original",
    showRecipientTranslation: "Show recipient translation",
    showTranslation: "Show translation",
    subtitle: "Conversations with peer NGOs, translated between your language and theirs.",
    translatedTo: "translated to",
    translationUnavailable: "translation unavailable",
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
    if (locale === "fr") return `Traduction automatique ${codes[0]} <-> ${codes[1]}`;
    if (locale === "de") return `Automatische Uebersetzung ${codes[0]} <-> ${codes[1]}`;
    return `Auto-translating ${codes[0]} <-> ${codes[1]}`;
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

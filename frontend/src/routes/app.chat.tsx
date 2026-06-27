import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bookmark, Languages, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { toast } from "sonner";
import { formatChatTime } from "@/lib/utils";

export const Route = createFileRoute("/app/chat")({
  head: () => ({ meta: [{ title: "Peer Chat - FieldSignal AI" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { conversations, sendMessage, saveInsight, profile } = useAppState();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [isSending, setIsSending] = useState(false);

  const active = activeId ? conversations.find((c) => c.id === activeId) ?? null : null;

  if (!active) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Peer Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversations with peer NGOs, translated between your language and theirs.
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
                        {formatChatTime(last.sentAt) || last.timestamp}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {conversation.country} / {conversation.sharedTopics.slice(0, 2).join(", ")}
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
              {active.country} / {active.sharedTopics.join(", ")}
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Languages className="h-3 w-3" /> {active.translationStatus}
          </span>
        </header>

        <div className="flex-1 space-y-4 overflow-auto px-4 py-5 md:px-5">
          {active.messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation and FieldSignal will translate it.
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
              ? `Sent in ${message.originalLang} / translation unavailable`
              : mine
              ? `Sent in ${message.originalLang} / translated to ${message.targetLang}`
              : `Auto-translated ${message.originalLang} -> ${message.targetLang}`;
            const toggleLabel = translationFailed
              ? ""
              : mine
              ? toggled
                ? "Show my message"
                : "Show recipient translation"
              : toggled
                ? "Show translation"
                : "Show original";

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
                    <span>{mine ? profile?.name ?? "You" : active.orgName}</span>
                    <span>{formatChatTime(message.sentAt) || message.timestamp}</span>
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
            placeholder="Write in your language. FieldSignal will translate it for the recipient."
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
                  toast.error(error instanceof Error ? error.message : "Message translation failed");
                } finally {
                  setIsSending(false);
                }
              }}
            >
              <Send className="h-4 w-4" /> {isSending ? "Sending..." : "Send"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft(draftReply(profile?.language))}
            >
              <Sparkles className="h-4 w-4" /> AI draft reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                saveInsight("Saved insight from conversation with " + active.orgName);
                toast.success("Saved to Tags");
              }}
            >
              <Bookmark className="h-4 w-4" /> Save insight to Tags
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

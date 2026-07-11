import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Inbox, Languages, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Impact Atlas - transparent NGO intelligence demo" },
      {
        name: "description",
        content:
          "Explore Impact Atlas's working intelligence backend and clearly labelled hackathon workflow demos.",
      },
      { property: "og:title", content: "Impact Atlas" },
      {
        property: "og:description",
        content: "A transparent, working prototype for multilingual NGO intelligence.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { loginAsDemo } = useAppState();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/login">Open demo</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Configure demo</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Hackathon demo · multilingual NGO intelligence
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Explore multilingual NGO intelligence in a transparent, working prototype.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Explore a working intelligence-ingestion backend and a clearly labelled prototype of
            account, profile, saved-item, and peer workflows.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/signup">
                Configure Demo Profile <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                loginAsDemo();
                navigate({ to: "/app/inbox" });
              }}
            >
              Continue as Demo NGO
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-5 sm:grid-cols-3">
          <FeatureCard
            icon={<Inbox className="h-5 w-5" />}
            title="Backend Signal Inbox"
            body="View stored backend records or an explicitly labelled static demo dataset."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title="Peer Intelligence Demo"
            body="Explore static example activity; no messages are sent to real organizations."
          />
          <FeatureCard
            icon={<Languages className="h-5 w-5" />}
            title="Translation Integration"
            body="Use a configured provider; without one, preview text is labelled as untranslated."
          />
        </section>

        <section className="mt-20 rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            An MVP for small and mid-size NGOs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            The backend ingests, analyzes, and summarizes intelligence. Organization-specific
            routing, accounts, saved items, and peer messaging remain clearly labelled demo flows.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-card/60 py-6 text-center text-xs text-muted-foreground">
        © 2026 Impact Atlas · hackathon prototype
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowRight, Inbox, Languages, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/signup" });
  },
  head: () => ({
    meta: [
      { title: "Impact Atlas - NGO intelligence, routed to the right organization" },
      {
        name: "description",
        content:
          "Impact Atlas helps NGOs discover news, funding, and peer-discovered resources - translated, prioritized, and explained.",
      },
      { property: "og:title", content: "Impact Atlas" },
      {
        property: "og:description",
        content:
          "Relevant NGO intelligence, routed to the right organization in the right language.",
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
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Sign up</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI-powered, multilingual, NGO-focused
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Relevant NGO intelligence, routed to the right organization in the right language.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Impact Atlas helps NGOs discover news, funding opportunities, and peer-discovered
            resources - automatically translated, prioritized, and explained.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/signup">
                Create NGO Profile <ArrowRight className="h-4 w-4" />
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
            title="AI Signal Inbox"
            body="Relevant news and funding opportunities in one place."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title="Peer Intelligence"
            body="Learn from what similar NGOs save, share, and act on."
          />
          <FeatureCard
            icon={<Languages className="h-5 w-5" />}
            title="Seamless Translation"
            body="Communicate across organizations in your own language."
          />
        </section>

        <section className="mt-20 rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Built for small and mid-size NGOs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Not a social network. Impact Atlas routes signals - funding, news, field reports - to
            the NGOs they actually matter to. Following peers is optional; relevance comes first.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-card/60 py-6 text-center text-xs text-muted-foreground">
        © 2026 Impact Atlas - for the NGO community.
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

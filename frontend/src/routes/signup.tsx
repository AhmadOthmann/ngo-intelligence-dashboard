import { Link, createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Configure demo - Impact Atlas" },
      { name: "description", content: "Configure a temporary Impact Atlas demo profile." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-xl font-semibold text-foreground">
          Configure a temporary NGO profile
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          This prototype stores profile settings only in this browser so they survive a reload. No
          account is created, and clearing site data removes the profile.
        </p>
        <Button className="mt-6 w-full" asChild>
          <Link to="/onboarding">Start demo setup</Link>
        </Button>
        <Button className="mt-3 w-full" variant="outline" asChild>
          <Link to="/login">Use the default demo NGO</Link>
        </Button>
      </div>
    </div>
  );
}

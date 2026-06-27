import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — FieldSignal AI" },
      { name: "description", content: "Log in to your FieldSignal AI account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { loginAsDemo } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-6 text-center text-xl font-semibold text-foreground">
          Welcome back
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Log in to your Signal Inbox.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            loginAsDemo();
            navigate({ to: "/app/inbox" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ngo.org"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">Log in</Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            loginAsDemo();
            navigate({ to: "/app/inbox" });
          }}
        >
          Continue as Demo NGO
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          New to FieldSignal?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create NGO profile
          </Link>
        </p>
      </div>
    </div>
  );
}
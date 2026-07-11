import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Open demo - Impact Atlas" },
      { name: "description", content: "Open the temporary Impact Atlas demo workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { loginAsDemo } = useAppState();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-xl font-semibold text-foreground">
          Open the demo workspace
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          There is no account system in this prototype. No password is collected or authenticated.
        </p>

        <Button
          className="mt-6 w-full"
          onClick={() => {
            loginAsDemo();
            navigate({ to: "/app/inbox" });
          }}
        >
          Enter as Demo NGO
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Want different temporary NGO settings?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Configure the demo profile
          </Link>
        </p>
      </div>
    </div>
  );
}

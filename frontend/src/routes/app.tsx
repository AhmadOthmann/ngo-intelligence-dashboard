import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Inbox, MessageCircle, Tag, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAppState } from "@/lib/app-state";
import { translate } from "@/lib/i18n";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const NAV = [
  { to: "/app/inbox", labelKey: "signalInbox", icon: Inbox },
  { to: "/app/saved", labelKey: "tags", icon: Tag },
  { to: "/app/chat", labelKey: "peerChat", icon: MessageCircle },
  { to: "/app/profile", labelKey: "profile", icon: User },
] as const;

function AppLayout() {
  const { profile } = useAppState();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!profile) {
      void navigate({ to: "/signup", replace: true });
    }
  }, [profile, navigate]);

  if (!profile) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-primary text-primary-foreground md:flex">
        <Link to="/app/inbox" className="flex items-center gap-2.5 px-5 py-5">
          <Logo tone="inverse" />
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white text-primary shadow-sm"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                <n.icon className="h-4 w-4" /> {translate(profile.language, n.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/75">
          <div className="font-medium text-white">
            {profile?.name ?? translate(profile.language, "yourNgo")}
          </div>
          <div className="opacity-80">
            {profile?.country ?? ""}
            {profile?.language ? ` / ${profile.language}` : ""}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground md:hidden">
          <Logo tone="inverse" />
        </header>
        <nav className="flex gap-1 overflow-x-auto bg-primary px-2 pb-2 text-primary-foreground md:hidden">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  active ? "bg-white text-primary" : "text-white/85 hover:bg-white/10"
                }`}
              >
                <n.icon className="h-3.5 w-3.5" /> {translate(profile.language, n.labelKey)}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

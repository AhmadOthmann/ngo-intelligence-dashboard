import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bookmark, Inbox, LayoutDashboard, MessageCircle, Radio, User } from "lucide-react";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/inbox", label: "Signal Inbox", icon: Inbox },
  { to: "/app/saved", label: "Saved Signals", icon: Bookmark },
  { to: "/app/chat", label: "Peer Chat", icon: MessageCircle },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;

function AppLayout() {
  const { profile, loginAsDemo } = useAppState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!profile) {
      loginAsDemo();
    }
  }, [profile, loginAsDemo]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-primary text-primary-foreground md:flex">
        <Link to="/app/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Radio className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight">
              FieldSignal <span className="opacity-80">AI</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">
              NGO intelligence
            </div>
          </div>
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
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/75">
          <div className="font-medium text-white">{profile?.name ?? "Your NGO"}</div>
          <div className="opacity-80">
            {profile?.country ?? ""}
            {profile?.language ? ` · ${profile.language}` : ""}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground md:hidden">
          <Radio className="h-4 w-4" />
          <div className="text-sm font-semibold">FieldSignal AI</div>
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
                <n.icon className="h-3.5 w-3.5" /> {n.label}
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

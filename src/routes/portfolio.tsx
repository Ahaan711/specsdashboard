import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Briefcase,
  Eye,
  Settings as SettingsIcon,
  Home,
  Search,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { syncAll } from "@/lib/cloud-sync";
import { toast } from "sonner";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "PortfolioOS — SpECS Fund" },
      {
        name: "description",
        content:
          "Private credit & venture portfolio management for institutional analysts.",
      },
    ],
  }),
  component: PortfolioLayout,
});

type NavItem = { to: string; label: string; icon: typeof Briefcase; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/portfolio", label: "Portfolio", icon: Briefcase, exact: true },
  { to: "/portfolio/watchlist", label: "Watchlist", icon: Eye },
  { to: "/portfolio/settings", label: "Settings", icon: SettingsIcon },
];

function PortfolioLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncAll();
    setSyncing(false);
    if (res.ok) {
      toast.success("Synced with cloud.");
      window.dispatchEvent(new CustomEvent("portfolio:synced"));
    } else if (res.notProvisioned) {
      toast.warning("Cloud sync not provisioned yet — retry later.");
    } else {
      toast.error(res.error || "Sync failed.");
    }
  };

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: "#0F1B2E", color: "#E5E7EB" }}>
      {/* Sidebar */}
      <aside
        className="flex w-56 shrink-0 flex-col"
        style={{ backgroundColor: "#0B1422", borderRight: "1px solid #1A2B47" }}
      >
        <Link to="/" className="flex h-14 items-center gap-2 border-b px-4" style={{ borderColor: "#1A2B47" }}>
          <Home className="h-4 w-4" style={{ color: "#FF7553" }} />
          <span className="text-sm font-medium tracking-wide">PortfolioOS</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as "/portfolio"}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
                style={{
                  backgroundColor: active ? "#1C3151" : "transparent",
                  color: active ? "#FF7553" : "#9CA3AF",
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 text-[10px] uppercase tracking-wider text-white/30" style={{ borderColor: "#1A2B47" }}>
          SpECS Fund · Internal
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-14 shrink-0 items-center gap-3 px-5"
          style={{ borderBottom: "1px solid #1A2B47", backgroundColor: "#0F1B2E" }}
        >
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                window.dispatchEvent(new CustomEvent("portfolio:search", { detail: e.target.value }));
              }}
              placeholder="Search companies, sectors…"
              className="h-9 border-0 bg-[#15253F] pl-9 text-sm text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-[#FF7553]/40"
            />
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium text-white/80 transition-colors hover:bg-[#1C3151] disabled:opacity-50"
            style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}
            title="Push local changes to cloud and pull latest"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

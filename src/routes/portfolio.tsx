import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Briefcase,
  GitMerge,
  Eye,
  Settings as SettingsIcon,
  Home,
  Search,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

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

const NAV = [
  { to: "/portfolio", label: "Portfolio", icon: Briefcase, exact: true },
  { to: "/portfolio/watchlist", label: "Watchlist", icon: Eye },
  { to: "/pipeline", label: "Pipeline", icon: GitMerge },
  { to: "/portfolio/settings", label: "Settings", icon: SettingsIcon },
  { to: "/portfolio-legacy", label: "Legacy App", icon: FileText },
] as const;

function PortfolioLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: "#0A0C10", color: "#E5E7EB" }}>
      {/* Sidebar */}
      <aside
        className="flex w-56 shrink-0 flex-col"
        style={{ backgroundColor: "#0D0F14", borderRight: "1px solid #1E2229" }}
      >
        <Link to="/" className="flex h-14 items-center gap-2 border-b px-4" style={{ borderColor: "#1E2229" }}>
          <Home className="h-4 w-4" style={{ color: "#C9A84C" }} />
          <span className="text-sm font-medium tracking-wide">PortfolioOS</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
                style={{
                  backgroundColor: active ? "#1A1D24" : "transparent",
                  color: active ? "#C9A84C" : "#9CA3AF",
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 text-[10px] uppercase tracking-wider text-white/30" style={{ borderColor: "#1E2229" }}>
          SpECS Fund · Internal
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-14 shrink-0 items-center gap-3 px-5"
          style={{ borderBottom: "1px solid #1E2229", backgroundColor: "#0A0C10" }}
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
              className="h-9 border-0 bg-[#111318] pl-9 text-sm text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-[#C9A84C]/40"
            />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

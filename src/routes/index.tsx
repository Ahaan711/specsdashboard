import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, GitMerge, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — PortfolioOS" },
      {
        name: "description",
        content:
          "Choose between Portfolio OS for active companies or Pipeline Tracker for deal origination.",
      },
    ],
  }),
  component: HomePage,
});

const cards = [
  {
    to: "/portfolio",
    icon: Briefcase,
    title: "Portfolio OS",
    subtitle: "Active companies, live data, term sheets & pre-DD notes",
  },
  {
    to: "/portfolio-legacy",
    icon: GitMerge,
    title: "Pipeline Tracker",
    subtitle: "Open the live SpECS Fund Manager workspace",
  },
] as const;

function HomePage() {
  return (
    <div
      className="min-h-screen w-full text-white"
      style={{
        backgroundColor: "#0A0C10",
        backgroundImage:
          "radial-gradient(circle, rgba(201,168,76,0.06) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <header className="px-8 py-6">
        <span
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            color: "#C9A84C",
            fontSize: "1.25rem",
            letterSpacing: "0.02em",
          }}
        >
          PortfolioOS
        </span>
      </header>

      <main className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[920px]">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-light tracking-tight text-white sm:text-4xl">
              Command Center
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Select a workspace to continue
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {cards.map(({ to, icon: Icon, title, subtitle }) => (
              <Link
                key={to}
                to={to}
                className="group relative flex h-[280px] flex-col justify-between rounded-lg p-7 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: "#111318",
                  border: "1px solid #1E2229",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#C9A84C")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#1E2229")
                }
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: "rgba(201,168,76,0.08)",
                      color: "#C9A84C",
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <ArrowUpRight
                    className="h-5 w-5 text-white/30 transition-colors group-hover:text-[#C9A84C]"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-medium text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

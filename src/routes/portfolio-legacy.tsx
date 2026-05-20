import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/portfolio-legacy")({
  head: () => ({
    meta: [
      { title: "Portfolio OS — SpECS Fund Manager" },
      {
        name: "description",
        content:
          "Active companies, live data, term sheets and pre-DD notes for the SpECS Fund.",
      },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  return (
    <div className="flex h-screen w-full flex-col" style={{ backgroundColor: "#0A0C10" }}>
      <div
        className="flex h-10 shrink-0 items-center px-4"
        style={{ backgroundColor: "#0A0C10", borderBottom: "1px solid #1E2229" }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-[#C9A84C]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>
      </div>
      <iframe
        src="/pcf-app.html"
        title="SpECS Fund Manager"
        className="block w-full flex-1 border-0"
      />
    </div>
  );
}

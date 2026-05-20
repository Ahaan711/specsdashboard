import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadCompanies, type Company, formatCr, SECTOR_COLORS } from "@/lib/portfolio-data";
import { AlertTriangle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/portfolio/watchlist")({
  component: WatchlistPage,
});

function WatchlistPage() {
  const [items, setItems] = useState<Company[]>([]);
  useEffect(() => {
    setItems(loadCompanies().filter((c) => c.status === "Watch"));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white">Watchlist</h1>
      <p className="mt-1 text-sm text-white/50">Companies flagged for active monitoring.</p>

      <div className="mt-6 space-y-3">
        {items.length === 0 && (
          <div className="rounded-lg border p-10 text-center text-sm text-white/40" style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}>
            No companies on watch.
          </div>
        )}
        {items.map((c) => (
          <Link
            key={c.id}
            to="/portfolio/$companyId"
            params={{ companyId: c.id }}
            className="block rounded-lg border p-4 transition-colors hover:border-[#EF444460]"
            style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                  <span className="text-base font-medium text-white">{c.name}</span>
                  <span
                    className="rounded px-2 py-0.5 text-[11px]"
                    style={{ backgroundColor: `${SECTOR_COLORS[c.sector]}20`, color: SECTOR_COLORS[c.sector] }}
                  >
                    {c.sector}
                  </span>
                </div>
                {c.watchReason && <p className="ml-6 mt-1.5 text-sm text-white/60">{c.watchReason}</p>}
                <div className="ml-6 mt-2 text-xs text-white/40">
                  {c.investmentType} · {formatCr(c.exposureCr)}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

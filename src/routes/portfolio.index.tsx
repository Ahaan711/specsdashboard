import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  loadCompanies,
  type Company,
  SECTOR_COLORS,
  STATUS_COLORS,
  formatCr,
  formatDate,
} from "@/lib/portfolio-data";
import { Plus, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portfolio/")({
  component: PortfolioDashboard,
});

function PortfolioDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setCompanies(loadCompanies());
    const onSearch = (e: Event) => setQuery((e as CustomEvent<string>).detail || "");
    window.addEventListener("portfolio:search", onSearch);
    return () => window.removeEventListener("portfolio:search", onSearch);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return companies;
    const q = query.toLowerCase();
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q),
    );
  }, [companies, query]);

  const totals = useMemo(() => {
    const exposure = companies.reduce((s, c) => s + c.exposureCr, 0);
    const active = companies.filter((c) => c.status === "Active").length;
    const watch = companies.filter((c) => c.status === "Watch").length;
    return { exposure, active, watch, count: companies.length };
  }, [companies]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Portfolio</h1>
          <p className="mt-1 text-sm text-white/50">
            {totals.count} companies · {formatCr(totals.exposure)} total exposure
          </p>
        </div>
        <Button
          className="h-9 gap-1.5 bg-[#C9A84C] text-[#0A0C10] hover:bg-[#D9B85C]"
          disabled
          title="Add company flow — coming next"
        >
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <Kpi label="Total Exposure" value={formatCr(totals.exposure)} />
        <Kpi label="Companies" value={String(totals.count)} />
        <Kpi label="Active" value={String(totals.active)} accent="#22C55E" />
        <Kpi label="On Watch" value={String(totals.watch)} accent="#EF4444" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: "#1E2229", backgroundColor: "#111318" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-white/40" style={{ borderBottom: "1px solid #1E2229" }}>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Instrument</th>
              <th className="px-4 py-3 text-right font-medium">Exposure</th>
              <th className="px-4 py-3 font-medium">Entry</th>
              <th className="px-4 py-3 font-medium">Maturity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="group transition-colors hover:bg-[#1A1D24]"
                style={{ borderBottom: "1px solid #1A1D22" }}
              >
                <td className="px-4 py-3.5">
                  <Link to="/portfolio/$companyId" params={{ companyId: c.id }} className="font-medium text-white hover:text-[#C9A84C]">
                    {c.name}
                  </Link>
                  {c.status === "Watch" && (
                    <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5 text-[#EF4444]" />
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `${SECTOR_COLORS[c.sector]}20`,
                      color: SECTOR_COLORS[c.sector],
                    }}
                  >
                    {c.sector}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-white/70">{c.investmentType}</td>
                <td className="px-4 py-3.5 text-right font-mono text-white/90">{formatCr(c.exposureCr)}</td>
                <td className="px-4 py-3.5 text-white/60">{formatDate(c.entryDate)}</td>
                <td className="px-4 py-3.5 text-white/60">{formatDate(c.maturityDate)}</td>
                <td className="px-4 py-3.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs"
                    style={{ color: STATUS_COLORS[c.status] }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[c.status] }} />
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link to="/portfolio/$companyId" params={{ companyId: c.id }}>
                    <ChevronRight className="h-4 w-4 text-white/30 transition-colors group-hover:text-[#C9A84C]" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-white/40">
                  No companies match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "#111318", borderColor: "#1E2229" }}
    >
      <div className="text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1.5 text-xl font-semibold" style={{ color: accent || "#FFFFFF" }}>
        {value}
      </div>
    </div>
  );
}

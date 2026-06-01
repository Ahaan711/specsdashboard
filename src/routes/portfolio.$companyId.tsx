import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getCompany,
  updateCompany,
  normalizeCovenants,
  type Company,
  type MISEntry,
  type ComplianceFinding,
  type TermSheetData,
  formatCr,
  formatDate,
  SECTOR_COLORS,
  STATUS_COLORS,
} from "@/lib/portfolio-data";
import { extractPdfText, extractDocText } from "@/lib/pdf-extract";
import { parseDocument } from "@/lib/portfolio-ai.functions";
import { uploadDocument } from "@/lib/cloud-sync";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Upload,
  Loader2,
  ExternalLink,
  TrendingUp,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  CheckCircle,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/portfolio/$companyId")({
  component: CompanyDetail,
});

type TabKey = "overview" | "live" | "termsheet" | "predd";

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const [company, setCompany] = useState<Company | undefined>();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const c = getCompany(companyId);
    if (!c) setMissing(true);
    else setCompany(c);
  }, [companyId]);

  if (missing) {
    return (
      <div className="p-8 text-sm text-white/60">
        Company not found.{" "}
        <Link to="/portfolio" className="text-[#FF7553] hover:underline">Back to portfolio</Link>
      </div>
    );
  }
  if (!company) return <div className="p-8 text-white/40">Loading…</div>;

  return (
    <div className="p-6">
      <Link
        to="/portfolio"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-[#FF7553]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Portfolio
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">{company.name}</h1>
            <span
              className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: `${SECTOR_COLORS[company.sector]}20`,
                color: SECTOR_COLORS[company.sector],
              }}
            >
              {company.sector}
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: STATUS_COLORS[company.status] }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[company.status] }}
              />
              {company.status}
            </span>
          </div>
          {company.description && (
            <p className="mt-2 max-w-3xl text-sm text-white/60">{company.description}</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
            {company.cin && <span>CIN: {company.cin}</span>}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-[#FF7553]"
              >
                Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-white/40">Our Exposure</div>
          <div className="mt-1 text-2xl font-semibold text-[#FF7553]">{formatCr(company.exposureCr)}</div>
          <div className="mt-0.5 text-xs text-white/40">
            {company.investmentType} · {company.tenor || "—"}
          </div>
        </div>
      </div>

      {company.status === "Watch" && company.watchReason && (
        <div
          className="mb-6 flex items-start gap-2 rounded-md border p-3 text-sm"
          style={{ borderColor: "#EF444440", backgroundColor: "#EF444410", color: "#FCA5A5" }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Watchlist flag</div>
            <div className="text-xs opacity-90">{company.watchReason}</div>
          </div>
        </div>
      )}

      <WatchlistSuggestionBanner company={company} onUpdate={setCompany} />


      <Tabs defaultValue={"overview" as TabKey} className="w-full">
        <TabsList className="border bg-[#15253F]" style={{ borderColor: "#1A2B47" }}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="live">Live Data</TabsTrigger>
          <TabsTrigger value="termsheet">Term Sheet</TabsTrigger>
          <TabsTrigger value="predd">Pre-DD</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab company={company} />
        </TabsContent>
        <TabsContent value="live" className="mt-4">
          <LiveTab company={company} />
        </TabsContent>
        <TabsContent value="termsheet" className="mt-4">
          <TermSheetTab company={company} onUpdate={setCompany} />
        </TabsContent>
        <TabsContent value="predd" className="mt-4">
          <PreDDTab company={company} onUpdate={setCompany} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}>
      <div className="mb-3 text-[11px] uppercase tracking-wider text-white/40">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-0.5 text-sm text-white/90">{value || "—"}</div>
    </div>
  );
}

function OverviewTab({ company }: { company: Company }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card title="Company">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sector" value={company.sector} />
          <Field label="Sub-sector" value={company.subSector} />
          <Field label="CIN" value={company.cin} />
          <Field label="Website" value={company.website} />
        </div>
      </Card>
      <Card title="Our Investment">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Instrument" value={company.investmentType} />
          <Field label="Exposure" value={formatCr(company.exposureCr)} />
          <Field label="Entry Date" value={formatDate(company.entryDate)} />
          <Field label="Maturity" value={formatDate(company.maturityDate)} />
          <Field label="Tenor" value={company.tenor} />
          <Field label="Status" value={company.status} />
        </div>
      </Card>
      <Card title="Key People">
        <ul className="space-y-2">
          {company.keyPeople.map((p) => (
            <li key={p.name} className="flex justify-between text-sm">
              <span className="text-white/90">{p.name}</span>
              <span className="text-white/50">{p.designation}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Shareholding">
        {company.shareholding ? (
          <div className="space-y-2">
            {Object.entries(company.shareholding).map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="capitalize text-white/60">{k}</span>
                  <span className="text-white/90">{v}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1A2B47]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${v}%`, backgroundColor: "#FF7553" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/40">No shareholding data.</div>
        )}
      </Card>
    </div>
  );
}

function LiveTab({ company }: { company: Company }) {
  const live = company.liveData;
  if (!live) {
    return <div className="text-sm text-white/40">No live data yet.</div>;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {[
          { l: "Revenue", v: live.revenue },
          { l: "EBITDA", v: live.ebitda },
          { l: "PAT", v: live.pat },
          { l: "Debt", v: live.debt },
          { l: "Net Worth", v: live.netWorth },
        ].map((m) => (
          <Card key={m.l} title={m.l}>
            <div className="text-lg font-semibold text-white">{m.v || "—"}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Key Ratios">
          <div className="grid grid-cols-2 gap-3">
            {live.ratios?.map((r) => (
              <div key={r.label} className="flex justify-between border-b pb-1.5 text-sm" style={{ borderColor: "#1A2B47" }}>
                <span className="text-white/60">{r.label}</span>
                <span className="font-mono text-white/90">{r.value}</span>
              </div>
            )) || <div className="text-sm text-white/40">No ratios.</div>}
          </div>
        </Card>
        <Card title="Rating & Market">
          <div className="space-y-3">
            {live.rating && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-white/40">Credit Rating</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[#FF7553]">{live.rating.rating}</span>
                  <span className="text-xs text-white/50">{live.rating.agency} · {live.rating.outlook}</span>
                </div>
              </div>
            )}
            {live.stockPrice && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#22C55E]" />
                <span className="text-sm text-white/90">{live.stockPrice}</span>
              </div>
            )}
            <div className="text-[10px] text-white/30">
              Last updated {live.updatedAt ? formatDate(live.updatedAt) : "—"} · placeholder data
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// =================== Watchlist suggestion banner ===================

function WatchlistSuggestionBanner({
  company,
  onUpdate,
}: {
  company: Company;
  onUpdate: (c: Company) => void;
}) {
  const history = company.termSheet?.misHistory || [];
  const latest = history.length ? history[history.length - 1] : undefined;
  if (!latest || !latest.breachDetected || latest.watchlistDismissed) return null;
  if (company.status === "Watch") return null;

  const accept = () => {
    const reason =
      latest.suggestedWatchReason ||
      latest.aiSummary ||
      "AI flagged potential covenant/security/escrow breach in latest MIS.";
    const newHist = history.map((h) =>
      h.id === latest.id ? { ...h, watchlistDismissed: true } : h,
    );
    const updated = updateCompany(company.id, {
      status: "Watch",
      watchReason: reason,
      termSheet: { ...(company.termSheet || {}), misHistory: newHist },
    });
    if (updated) {
      onUpdate(updated);
      toast.success("Company added to watchlist.");
    }
  };

  const dismiss = () => {
    const newHist = history.map((h) =>
      h.id === latest.id ? { ...h, watchlistDismissed: true } : h,
    );
    const updated = updateCompany(company.id, {
      termSheet: { ...(company.termSheet || {}), misHistory: newHist },
    });
    if (updated) onUpdate(updated);
  };

  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-md border p-3 text-sm"
      style={{ borderColor: "#F59E0B60", backgroundColor: "#F59E0B14", color: "#FCD34D" }}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <div className="font-medium">AI detected possible breach in latest MIS</div>
        <div className="mt-0.5 text-xs opacity-90">
          {latest.aiSummary || latest.suggestedWatchReason || "Review compliance findings below."}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={accept}
          className="rounded-md bg-[#F59E0B] px-2.5 py-1 text-xs font-medium text-[#0F1B2E] hover:bg-[#FBBF24]"
        >
          Add to Watchlist
        </button>
        <button
          onClick={dismiss}
          className="rounded-md border px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
          style={{ borderColor: "#F59E0B60" }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// =================== Term Sheet (split into Covenants / Security / Escrow + MIS) ===================

function statusIcon(s: ComplianceFinding["status"]) {
  if (s === "pass") return <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />;
  if (s === "breach") return <XCircle className="h-3.5 w-3.5 text-[#EF4444]" />;
  return <MinusCircle className="h-3.5 w-3.5 text-white/30" />;
}

function statusPill(s: ComplianceFinding["status"]) {
  const map = {
    pass: { bg: "#22C55E20", c: "#22C55E", label: "Compliant" },
    breach: { bg: "#EF444420", c: "#EF4444", label: "Breach" },
    unknown: { bg: "#64748B20", c: "#94A3B8", label: "Unknown" },
  } as const;
  const v = map[s];
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ backgroundColor: v.bg, color: v.c }}
    >
      {v.label}
    </span>
  );
}

function findingByKey(latest: MISEntry | undefined, key: string) {
  return latest?.findings?.find((f) => f.key === key);
}

function TermSheetTab({
  company,
  onUpdate,
}: {
  company: Company;
  onUpdate: (c: Company) => void;
}) {
  const ts = company.termSheet;
  const parseFn = useServerFn(parseDocument);
  const [loadingTs, setLoadingTs] = useState(false);

  const handleTermSheet = async (file: File) => {
    setLoadingTs(true);
    try {
      toast.info(`Extracting text from ${file.name}…`);
      const text = await extractDocText(file);
      if (text.length < 30) {
        toast.error("Could not extract text from file (might be scanned PDF or empty HTML).");
        return;
      }
      toast.info("Parsing with AI…");
      const res = await parseFn({ data: { text, mode: "termsheet" } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const parsed = res.data as TermSheetData;
      // Preserve existing MIS history when re-uploading term sheet
      const merged: TermSheetData = {
        ...parsed,
        misHistory: ts?.misHistory || [],
      };
      const updated = updateCompany(company.id, { termSheet: merged });
      if (updated) {
        onUpdate(updated);
        toast.success("Term sheet parsed and saved.");
      }
      // Best-effort: archive original document to cloud (non-blocking).
      uploadDocument(file, {
        kind: "termsheet",
        companyId: company.id,
        companyName: company.name,
      }).then((r) => {
        if (!r.ok && !r.notProvisioned) {
          console.warn("Document archive failed:", r.error);
        }
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTs(false);
    }
  };

  if (!ts) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs text-white/50">
            Upload Term Sheet (PDF or HTML) to auto-extract covenants, security & escrow waterfall.
          </div>
          <UploadButton
            loading={loadingTs}
            onPick={handleTermSheet}
            label="Upload Term Sheet"
            accept="application/pdf,text/html,.htm,.html"
          />
        </div>
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-sm text-white/40"
          style={{ borderColor: "#1A2B47" }}
        >
          <FileText className="mb-3 h-8 w-8 text-white/20" />
          No term sheet uploaded yet.
        </div>
      </div>
    );
  }

  const covenants = normalizeCovenants(ts.covenants);
  const security = ts.securityDetail || {};
  const escrow = ts.escrow || {};
  const history = ts.misHistory || [];
  const latest = history.length ? history[history.length - 1] : undefined;

  return (
    <div className="space-y-6">
      {/* Top bar: key terms summary + re-upload */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border p-4"
        style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}
      >
        <SummaryBit label="Issuer" value={ts.issuer} />
        <SummaryBit label="Instrument" value={ts.instrument} />
        <SummaryBit label="Issue Size" value={ts.issueSize} />
        <SummaryBit label="Coupon" value={ts.coupon} />
        <SummaryBit label="Tenor" value={ts.tenor} />
        <SummaryBit label="Closing" value={ts.closingDate} />
        <div className="ml-auto">
          <UploadButton
            loading={loadingTs}
            onPick={handleTermSheet}
            label="Re-upload Term Sheet"
            small
            accept="application/pdf,text/html,.htm,.html"
          />
        </div>
      </div>

      <Tabs defaultValue="covenants" className="w-full">
        <TabsList className="border bg-[#15253F]" style={{ borderColor: "#1A2B47" }}>
          <TabsTrigger value="covenants">Covenants</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="escrow">Escrow Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="covenants" className="mt-4">
          <CovenantsSection covenants={covenants} latest={latest} />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecuritySection security={security} latest={latest} />
        </TabsContent>
        <TabsContent value="escrow" className="mt-4">
          <EscrowSection escrow={escrow} latest={latest} />
        </TabsContent>
      </Tabs>

      <MISPanel company={company} onUpdate={onUpdate} />
    </div>
  );
}

function SummaryBit({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-sm text-white/90">{value || "—"}</div>
    </div>
  );
}

function UploadButton({
  loading,
  onPick,
  label,
  small,
  accept = "application/pdf",
}: {
  loading: boolean;
  onPick: (f: File) => void;
  label: string;
  small?: boolean;
  accept?: string;
}) {
  return (
    <label>
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={loading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <span
        className={`inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#FF7553] font-medium text-[#0F1B2E] hover:bg-[#FF8E72] ${
          small ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm"
        }`}
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {label}
      </span>
    </label>
  );
}

function CovenantsSection({
  covenants,
  latest,
}: {
  covenants: ReturnType<typeof normalizeCovenants>;
  latest?: MISEntry;
}) {
  if (covenants.length === 0) {
    return (
      <Card title="Covenants">
        <div className="text-sm text-white/40">None extracted.</div>
      </Card>
    );
  }
  return (
    <Card title="Covenants">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Covenant</th>
              <th className="py-2 pr-3">Threshold</th>
              <th className="py-2 pr-3">Latest MIS</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {covenants.map((c) => {
              const f = findingByKey(latest, c.id);
              return (
                <tr key={c.id} className="border-t" style={{ borderColor: "#1A2B47" }}>
                  <td className="py-2 pr-3 text-xs uppercase text-white/50">{c.type || "—"}</td>
                  <td className="py-2 pr-3 text-white/85">{c.text}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-white/70">{c.threshold || "—"}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-white/70">
                    {f?.actualValue || (f?.note ?? "—")}
                  </td>
                  <td className="py-2">{f ? statusPill(f.status) : statusPill("unknown")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SecuritySection({
  security,
  latest,
}: {
  security: NonNullable<TermSheetData["securityDetail"]>;
  latest?: MISEntry;
}) {
  const fields: { key: keyof typeof security; label: string }[] = [
    { key: "collateral", label: "Collateral" },
    { key: "charge", label: "Charge" },
    { key: "coverage", label: "Asset Cover" },
    { key: "guarantors", label: "Guarantors" },
    { key: "valuation", label: "Valuation" },
    { key: "perfectionStatus", label: "Perfection Status" },
  ];

  return (
    <Card title="Security Structure">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {fields.map((f) => {
          const finding = findingByKey(latest, `security.${f.key}`);
          return (
            <div key={f.key}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-white/40">{f.label}</div>
                {finding && statusPill(finding.status)}
              </div>
              <div className="mt-0.5 text-sm text-white/90">{security[f.key] || "—"}</div>
              {finding?.note && (
                <div className="mt-1 text-xs text-white/50">MIS: {finding.note}</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EscrowSection({
  escrow,
  latest,
}: {
  escrow: NonNullable<TermSheetData["escrow"]>;
  latest?: MISEntry;
}) {
  const waterfall = escrow.waterfall && escrow.waterfall.length > 0
    ? [...escrow.waterfall].sort((a, b) => a.step - b.step)
    : [];

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1 space-y-4">
        <Card title="Escrow Account">
          <Field label="Bank" value={escrow.bank} />
          <div className="h-3" />
          <Field label="Account" value={escrow.account} />
          <div className="h-3" />
          <Field label="Trigger Events" value={escrow.triggerEvents} />
        </Card>
      </div>
      <div className="col-span-2">
        <Card title="Cash-Flow Waterfall">
          {waterfall.length === 0 ? (
            <div className="text-sm text-white/40">No waterfall extracted.</div>
          ) : (
            <div className="flex flex-col items-stretch gap-2">
              {waterfall.map((s, i) => {
                const finding = findingByKey(latest, `escrow.step.${s.step}`);
                const breach = finding?.status === "breach";
                return (
                  <div key={s.step}>
                    <div
                      className="flex items-start gap-3 rounded-md border p-3"
                      style={{
                        borderColor: breach ? "#EF444460" : "#1A2B47",
                        backgroundColor: breach ? "#EF444410" : "#1C3151",
                      }}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: breach ? "#EF444430" : "#FF755330",
                          color: breach ? "#EF4444" : "#FF7553",
                        }}
                      >
                        {s.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-white/90">{s.label}</div>
                          {finding && statusPill(finding.status)}
                        </div>
                        {s.description && (
                          <div className="mt-0.5 text-xs text-white/60">{s.description}</div>
                        )}
                        {finding?.actualValue && (
                          <div className="mt-1 font-mono text-xs text-white/70">
                            Actual: {finding.actualValue}
                          </div>
                        )}
                        {finding?.note && (
                          <div className="mt-1 text-xs text-white/50">{finding.note}</div>
                        )}
                      </div>
                    </div>
                    {i < waterfall.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-4 w-4 text-white/30" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// =================== MIS Panel ===================

function MISPanel({
  company,
  onUpdate,
}: {
  company: Company;
  onUpdate: (c: Company) => void;
}) {
  const ts = company.termSheet!;
  const history = ts.misHistory || [];
  const sorted = [...history].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
  const parseFn = useServerFn(parseDocument);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(sorted[0]?.id ?? null);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      toast.info(`Extracting text from ${file.name}…`);
      const text = await extractPdfText(file);
      if (text.length < 30) {
        toast.error("Could not extract text from MIS PDF.");
        return;
      }
      // Build compact context from current termSheet obligations
      const context = JSON.stringify({
        covenants: normalizeCovenants(ts.covenants),
        security: ts.securityDetail || {},
        escrow: ts.escrow || {},
      });
      toast.info("Running AI compliance check…");
      const res = await parseFn({ data: { text, mode: "mis", context } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const r = res.data as {
        period?: string;
        breachDetected?: boolean;
        aiSummary?: string;
        suggestedWatchReason?: string;
        findings?: ComplianceFinding[];
        financials?: {
          revenue?: string;
          ebitda?: string;
          pat?: string;
          debt?: string;
          netWorth?: string;
          ratios?: { label: string; value: string }[];
        };
      };
      const entry: MISEntry = {
        id: `mis-${Date.now()}`,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        period: r.period,
        aiSummary: r.aiSummary,
        suggestedWatchReason: r.suggestedWatchReason,
        breachDetected: !!r.breachDetected,
        findings: Array.isArray(r.findings) ? r.findings : [],
      };
      const newHist = [...history, entry];

      // Merge any non-empty financial fields into company.liveData
      const prevLive = company.liveData || {};
      const fin = r.financials || {};
      const pickStr = (next?: string, prev?: string) =>
        next && next.trim() ? next : prev;
      const mergedLive = {
        ...prevLive,
        revenue: pickStr(fin.revenue, prevLive.revenue),
        ebitda: pickStr(fin.ebitda, prevLive.ebitda),
        pat: pickStr(fin.pat, prevLive.pat),
        debt: pickStr(fin.debt, prevLive.debt),
        netWorth: pickStr(fin.netWorth, prevLive.netWorth),
        ratios:
          Array.isArray(fin.ratios) && fin.ratios.length > 0
            ? fin.ratios
            : prevLive.ratios,
        updatedAt: new Date().toISOString(),
      };

      const updated = updateCompany(company.id, {
        termSheet: { ...ts, misHistory: newHist },
        liveData: mergedLive,
      });
      if (updated) {
        onUpdate(updated);
        setExpanded(entry.id);
        const breaches = entry.findings.filter((f) => f.status === "breach").length;
        if (entry.breachDetected) {
          toast.warning(
            `MIS parsed — financials updated, ${entry.findings.length} findings (${breaches} breach${breaches === 1 ? "" : "es"}).`,
          );
        } else {
          toast.success(
            `MIS parsed — financials updated, ${entry.findings.length} findings, no breaches.`,
          );
        }
      }
      uploadDocument(file, {
        kind: "mis",
        companyId: company.id,
        companyName: company.name,
      }).then((r) => {
        if (!r.ok && !r.notProvisioned) {
          console.warn("Document archive failed:", r.error);
        }
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#FF7553]" />
            <h3 className="text-sm font-semibold text-white">MIS Reports</h3>
            <span className="text-xs text-white/40">({sorted.length})</span>
          </div>
          <div className="mt-0.5 text-xs text-white/50">
            Upload periodic MIS to check covenant / security / escrow compliance.
          </div>
        </div>
        <UploadButton loading={loading} onPick={handleFile} label="Upload MIS" />
      </div>

      {sorted.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-md border border-dashed py-10 text-sm text-white/40"
          style={{ borderColor: "#1A2B47" }}
        >
          <FileText className="mb-2 h-6 w-6 text-white/20" />
          No MIS uploaded yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <li
                key={e.id}
                className="rounded-md border"
                style={{ borderColor: "#1A2B47", backgroundColor: "#1C3151" }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-white/50" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white/50" />
                  )}
                  <FileText className="h-4 w-4 text-white/40" />
                  <div className="flex-1">
                    <div className="text-sm text-white/90">{e.fileName}</div>
                    <div className="text-[11px] text-white/40">
                      {e.period || "Period —"} · uploaded {formatDate(e.uploadedAt)}
                    </div>
                  </div>
                  {e.breachDetected ? (
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                      style={{ backgroundColor: "#EF444420", color: "#EF4444" }}
                    >
                      Breach
                    </span>
                  ) : (
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                      style={{ backgroundColor: "#22C55E20", color: "#22C55E" }}
                    >
                      Compliant
                    </span>
                  )}
                </button>
                {isOpen && (
                  <div className="border-t px-3 py-3" style={{ borderColor: "#1A2B47" }}>
                    {e.aiSummary && (
                      <div className="mb-3 text-xs text-white/70">{e.aiSummary}</div>
                    )}
                    {e.findings.length === 0 ? (
                      <div className="text-xs text-white/40">No findings parsed.</div>
                    ) : (
                      <ul className="space-y-1.5">
                        {e.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <span className="mt-0.5">{statusIcon(f.status)}</span>
                            <div className="flex-1">
                              <div className="text-white/85">{f.label}</div>
                              {(f.note || f.actualValue) && (
                                <div className="text-white/50">
                                  {f.actualValue ? `${f.actualValue}` : ""}
                                  {f.actualValue && f.note ? " — " : ""}
                                  {f.note || ""}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PreDDTab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const dd = company.preDD;

  const toggleCheck = (idx: number) => {
    if (!dd?.checklist) return;
    const next = dd.checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c));
    const updated = updateCompany(company.id, { preDD: { ...dd, checklist: next } });
    if (updated) onUpdate(updated);
  };

  return (
    <DocumentTab
      mode="predd"
      company={company}
      onUpdate={onUpdate}
      emptyHint="Upload Pre-DD note PDF to extract thesis, risks, red flags & auto-generate DD checklist."
      currentData={dd}
      patchKey="preDD"
      render={(data: typeof dd) =>
        data && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <Card title="Snapshot">
                <p className="text-sm text-white/80">{data.snapshot || "—"}</p>
              </Card>
              <Card title="Investment Thesis">
                <p className="whitespace-pre-line text-sm text-white/80">{data.thesis || "—"}</p>
              </Card>
              <Card title="Deal Structure">
                <p className="whitespace-pre-line text-sm text-white/80">{data.structure || "—"}</p>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card title="Risks">
                  <ul className="space-y-1.5 text-sm text-white/80">
                    {(data.risks || []).map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </Card>
                <Card title="Red Flags">
                  <ul className="space-y-1.5 text-sm">
                    {(data.redFlags || []).map((r, i) => (
                      <li key={i} className="flex gap-2"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" /><span className="text-white/80">{r}</span></li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
            <div className="space-y-4">
              <Card title="DD Checklist">
                <ul className="space-y-2">
                  {(data.checklist || []).map((c, i) => (
                    <li key={i}>
                      <button onClick={() => toggleCheck(i)} className="flex w-full items-start gap-2 text-left text-sm">
                        {c.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
                        )}
                        <span className={c.done ? "text-white/40 line-through" : "text-white/85"}>{c.item}</span>
                      </button>
                    </li>
                  ))}
                  {(data.checklist || []).length === 0 && <div className="text-sm text-white/40">No checklist.</div>}
                </ul>
              </Card>
              <Card title="Next Steps">
                <ul className="space-y-1.5 text-sm text-white/80">
                  {(data.nextSteps || []).map((s, i) => <li key={i}>→ {s}</li>)}
                </ul>
              </Card>
              <Card title="Meta">
                <Field label="Analyst" value={data.analyst} />
                <div className="h-2" />
                <Field label="Date" value={data.date} />
              </Card>
            </div>
          </div>
        )
      }
    />
  );
}

function DocumentTab<T>({
  mode,
  company,
  onUpdate,
  render,
  emptyHint,
  currentData,
  patchKey,
}: {
  mode: "termsheet" | "predd";
  company: Company;
  onUpdate: (c: Company) => void;
  render: (data: T | undefined) => React.ReactNode;
  emptyHint: string;
  currentData: T | undefined;
  patchKey: "termSheet" | "preDD";
}) {
  const parseFn = useServerFn(parseDocument);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      toast.info(`Extracting text from ${file.name}…`);
      const text = await extractPdfText(file);
      if (text.length < 30) {
        toast.error("Could not extract text from PDF (might be scanned).");
        return;
      }
      toast.info("Parsing with AI…");
      const res = await parseFn({ data: { text, mode } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const updated = updateCompany(company.id, { [patchKey]: res.data } as Partial<Company>);
      if (updated) {
        onUpdate(updated);
        toast.success("Document parsed and saved.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-white/50">
          {currentData ? "Extracted data shown below. Re-upload to refresh." : emptyHint}
        </div>
        <label>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <span
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-[#FF7553] px-3 text-sm font-medium text-[#0F1B2E] hover:bg-[#FF8E72]"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload PDF
          </span>
        </label>
      </div>
      {currentData ? (
        render(currentData)
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-sm text-white/40"
          style={{ borderColor: "#1A2B47" }}
        >
          <FileText className="mb-3 h-8 w-8 text-white/20" />
          {emptyHint}
        </div>
      )}
    </div>
  );
}

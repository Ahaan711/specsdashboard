import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getCompany,
  updateCompany,
  type Company,
  formatCr,
  formatDate,
  SECTOR_COLORS,
  STATUS_COLORS,
} from "@/lib/portfolio-data";
import { extractPdfText } from "@/lib/pdf-extract";
import { parseDocument } from "@/lib/portfolio-ai.functions";
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
        <Link to="/portfolio" className="text-[#C9A84C] hover:underline">Back to portfolio</Link>
      </div>
    );
  }
  if (!company) return <div className="p-8 text-white/40">Loading…</div>;

  return (
    <div className="p-6">
      <Link
        to="/portfolio"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-[#C9A84C]"
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
                className="inline-flex items-center gap-1 hover:text-[#C9A84C]"
              >
                Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-white/40">Our Exposure</div>
          <div className="mt-1 text-2xl font-semibold text-[#C9A84C]">{formatCr(company.exposureCr)}</div>
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

      <Tabs defaultValue={"overview" as TabKey} className="w-full">
        <TabsList className="border bg-[#111318]" style={{ borderColor: "#1E2229" }}>
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
    <div className="rounded-lg border p-5" style={{ borderColor: "#1E2229", backgroundColor: "#111318" }}>
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
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1E2229]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${v}%`, backgroundColor: "#C9A84C" }}
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
              <div key={r.label} className="flex justify-between border-b pb-1.5 text-sm" style={{ borderColor: "#1E2229" }}>
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
                  <span className="text-2xl font-semibold text-[#C9A84C]">{live.rating.rating}</span>
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

function TermSheetTab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const ts = company.termSheet;
  return (
    <DocumentTab
      mode="termsheet"
      company={company}
      onUpdate={onUpdate}
      emptyHint="Upload Term Sheet PDF to auto-extract issuer, coupon, covenants, risks."
      render={(data: typeof ts) =>
        data && (
          <div className="grid grid-cols-2 gap-4">
            <Card title="Key Terms">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Issuer" value={data.issuer} />
                <Field label="Instrument" value={data.instrument} />
                <Field label="Issue Size" value={data.issueSize} />
                <Field label="Coupon" value={data.coupon} />
                <Field label="Tenor" value={data.tenor} />
                <Field label="Closing" value={data.closingDate} />
              </div>
            </Card>
            <Card title="Security & Structure">
              <div className="space-y-3">
                <Field label="Security" value={data.security} />
                <Field label="Repayment" value={data.repayment} />
                <Field label="Put / Call" value={data.putCall} />
                <Field label="Conditions Precedent" value={data.conditionsPrecedent} />
              </div>
            </Card>
            <Card title="Covenants">
              <ul className="list-inside list-disc space-y-1 text-sm text-white/80">
                {(data.covenants || []).map((c, i) => <li key={i}>{c}</li>)}
                {(data.covenants || []).length === 0 && <li className="list-none text-white/40">None extracted.</li>}
              </ul>
            </Card>
            <Card title="Key Risks (AI)">
              <ul className="space-y-1.5 text-sm">
                {(data.risks || []).map((r, i) => (
                  <li key={i} className="flex gap-2"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" /><span className="text-white/80">{r}</span></li>
                ))}
                {(data.risks || []).length === 0 && <div className="text-white/40">No risks flagged.</div>}
              </ul>
            </Card>
          </div>
        )
      }
      currentData={ts}
      patchKey="termSheet"
    />
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
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-[#C9A84C] px-3 text-sm font-medium text-[#0A0C10] hover:bg-[#D9B85C]"
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
          style={{ borderColor: "#1E2229" }}
        >
          <FileText className="mb-3 h-8 w-8 text-white/20" />
          {emptyHint}
        </div>
      )}
    </div>
  );
}

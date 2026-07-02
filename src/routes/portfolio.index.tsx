import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  loadCompanies,
  addCompany,
  type Company,
  type Sector,
  type InvestmentType,
  type CompanyStatus,
  type CovenantItem,
  type SecurityItem,
  type SecurityStatus,
  type CPCSItem,
  type DSRAInstrument,
  type LienStatus,
  SECTOR_COLORS,
  STATUS_COLORS,
  formatCr,
  formatDate,
} from "@/lib/portfolio-data";
import { pullCompaniesOverwrite, pushCompanies } from "@/lib/cloud-sync";
import { toast } from "sonner";
import { Plus, ChevronRight, AlertTriangle, RefreshCw, Loader2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LabeledInput, LabeledTextarea, LabeledSelect, inputCls, inputStyle, labelCls } from "@/components/portfolio-form-fields";

export const Route = createFileRoute("/portfolio/")({
  component: PortfolioDashboard,
});

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const SECTORS: Sector[] = ["NBFC", "Renewable Energy", "Solar PV Mfg", "rPET Recycling", "AIF", "Manufacturing", "Infrastructure", "Other"];
const INVESTMENT_TYPES: InvestmentType[] = ["NCD", "CCD", "Equity", "Structured Equity", "Senior Secured", "Structured"];
const COMPANY_STATUSES: CompanyStatus[] = ["Active", "Watch", "Exit", "Pipeline"];
const SECURITY_STATUS_OPTIONS: SecurityStatus[] = ["Pending", "In Process", "Perfected"];
const LIEN_STATUS_OPTIONS: LienStatus[] = ["Lien Marked", "Lien Pending", "No Lien"];

function PortfolioDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows: Record<string, string>[] = [];
      const today = Date.now();

      companies.forEach((c) => {
        (c.cpCsItems || []).forEach((item: CPCSItem) => {
          if (item.status === "Completed") return;
          const overdue = item.dueDate && new Date(item.dueDate).getTime() < today;
          rows.push({
            Company: c.name,
            Category: item.kind === "CP" ? "Condition Precedent" : "Condition Subsequent",
            Item: item.description || "(untitled)",
            "Due Date": item.dueDate ? formatDate(item.dueDate) : "—",
            Status: overdue ? "Overdue" : "Pending",
          });
        });
        (c.dsra || []).forEach((d: DSRAInstrument) => {
          if (!d.maturityDate) return;
          const maturityTs = new Date(d.maturityDate).getTime();
          if (maturityTs < today) return; // already matured, not a pending item
          const daysLeft = Math.ceil((maturityTs - today) / 86400000);
          rows.push({
            Company: c.name,
            Category: "DSRA Maturity",
            Item: `${d.bankName || "—"} · ${d.fdNumber || "—"}`,
            "Due Date": formatDate(d.maturityDate),
            Status: daysLeft <= 7 ? `Maturing in ${daysLeft}d` : "Upcoming",
          });
        });
      });

      if (rows.length === 0) {
        toast.info("No pending items across the portfolio right now.");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pending Items");
      XLSX.writeFile(wb, `Pending_Items_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exported ${rows.length} pending items.`);
    } catch (e) {
      toast.error((e as Error).message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Monitoring Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">
            {totals.count} companies · {formatCr(totals.exposure)} total exposure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Pending Items Report
          </button>
          <button
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                const res = await pullCompaniesOverwrite();
                if (res.ok) {
                  setCompanies(loadCompanies());
                  toast.success("Synced");
                } else if (res.notProvisioned) {
                  toast.warning("Cloud sync not provisioned yet — retry later.");
                } else {
                  toast.error(res.error || "Sync failed.");
                }
              } catch (e) {
                toast.error((e as Error).message || "Sync failed.");
              } finally {
                setSyncing(false);
              }
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
          <Button
            onClick={() => setAddOpen(true)}
            className="h-9 gap-1.5 bg-[#FF7553] text-[#0F1B2E] hover:bg-[#FF8E72]"
          >
            <Plus className="h-4 w-4" /> Add Company
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <Kpi label="Total Exposure" value={formatCr(totals.exposure)} />
        <Kpi label="Companies" value={String(totals.count)} />
        <Kpi label="Active" value={String(totals.active)} accent="#22C55E" />
        <Kpi label="On Watch" value={String(totals.watch)} accent="#EF4444" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-white/40" style={{ borderBottom: "1px solid #1A2B47" }}>
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
                className="group transition-colors hover:bg-[#1C3151]"
                style={{ borderBottom: "1px solid #1A2B47" }}
              >
                <td className="px-4 py-3.5">
                  <Link to="/portfolio/$companyId" params={{ companyId: c.id }} className="font-medium text-white hover:text-[#FF7553]">
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
                    <ChevronRight className="h-4 w-4 text-white/30 transition-colors group-hover:text-[#FF7553]" />
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

      <AddCompanyDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(c) => {
          setCompanies(loadCompanies());
          setAddOpen(false);
          toast.success(`${c.name} added.`);
        }}
      />
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "#15253F", borderColor: "#1A2B47" }}
    >
      <div className="text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1.5 text-xl font-semibold" style={{ color: accent || "#FFFFFF" }}>
        {value}
      </div>
    </div>
  );
}

// =================== Add Company ===================

type NewCompanyForm = {
  name: string;
  cin: string;
  website: string;
  sector: Sector;
  subSector: string;
  description: string;
  investmentType: InvestmentType;
  exposureCr: string;
  entryDate: string;
  tenor: string;
  maturityDate: string;
  status: CompanyStatus;
  issuer: string;
  instrument: string;
  issueSize: string;
  coupon: string;
  repayment: string;
  putCall: string;
  closingDate: string;
};

const BLANK_FORM: NewCompanyForm = {
  name: "",
  cin: "",
  website: "",
  sector: "Other",
  subSector: "",
  description: "",
  investmentType: "NCD",
  exposureCr: "",
  entryDate: new Date().toISOString().slice(0, 10),
  tenor: "",
  maturityDate: "",
  status: "Active",
  issuer: "",
  instrument: "",
  issueSize: "",
  coupon: "",
  repayment: "",
  putCall: "",
  closingDate: "",
};

function AddCompanyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: Company) => void;
}) {
  const [form, setForm] = useState<NewCompanyForm>(BLANK_FORM);
  const [covenants, setCovenants] = useState<CovenantItem[]>([]);
  const [security, setSecurity] = useState<SecurityItem[]>([]);
  const [cpCsItems, setCpCsItems] = useState<CPCSItem[]>([]);
  const [dsra, setDsra] = useState<DSRAInstrument[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(BLANK_FORM);
      setCovenants([]);
      setSecurity([]);
      setCpCsItems([]);
      setDsra([]);
    }
  }, [open]);

  const set = (k: keyof NewCompanyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Company name is required.");
      return;
    }
    if (!form.exposureCr.trim() || isNaN(Number(form.exposureCr))) {
      toast.error("Exposure (₹ Cr) must be a number.");
      return;
    }
    setSaving(true);
    try {
      const company: Company = {
        id: uid("co"),
        name: form.name.trim(),
        cin: form.cin.trim() || undefined,
        website: form.website.trim() || undefined,
        sector: form.sector,
        subSector: form.subSector.trim() || undefined,
        description: form.description.trim() || undefined,
        keyPeople: [],
        investmentType: form.investmentType,
        exposureCr: Number(form.exposureCr),
        entryDate: form.entryDate,
        tenor: form.tenor.trim() || undefined,
        maturityDate: form.maturityDate || undefined,
        status: form.status,
        termSheet: {
          issuer: form.issuer.trim() || undefined,
          instrument: form.instrument.trim() || undefined,
          issueSize: form.issueSize.trim() || undefined,
          coupon: form.coupon.trim() || undefined,
          tenor: form.tenor.trim() || undefined,
          repayment: form.repayment.trim() || undefined,
          putCall: form.putCall.trim() || undefined,
          closingDate: form.closingDate || undefined,
          covenants: covenants.length ? covenants : undefined,
        },
        security: security.length ? security : undefined,
        cpCsItems: cpCsItems.length ? cpCsItems : undefined,
        dsra: dsra.length ? dsra : undefined,
      };
      addCompany(company);
      const pushRes = await pushCompanies();
      if (!pushRes.ok && !pushRes.notProvisioned) {
        toast.warning(`Saved locally, but cloud sync failed: ${pushRes.error || "unknown error"}. Use Sync to retry.`);
      }
      onCreated(company);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[85vh] max-w-3xl overflow-y-auto"
        style={{ backgroundColor: "#0F1B2E", borderColor: "#1A2B47", color: "#E5E7EB" }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">Add Company</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Section title="Company Basics">
            <div className="grid grid-cols-2 gap-4">
              <LabeledInput label="Company Name *" value={form.name} onChange={(v) => set("name", v)} />
              <LabeledInput label="CIN" value={form.cin} onChange={(v) => set("cin", v)} />
              <LabeledInput label="Website" value={form.website} onChange={(v) => set("website", v)} />
              <LabeledSelect label="Sector" value={form.sector} onChange={(v) => set("sector", v)} options={SECTORS} />
              <LabeledInput label="Sub-sector" value={form.subSector} onChange={(v) => set("subSector", v)} />
              <LabeledSelect label="Status" value={form.status} onChange={(v) => set("status", v)} options={COMPANY_STATUSES} />
            </div>
            <div className="mt-4">
              <LabeledTextarea label="Description" value={form.description} onChange={(v) => set("description", v)} rows={2} />
            </div>
          </Section>

          <Section title="Our Investment">
            <div className="grid grid-cols-3 gap-4">
              <LabeledSelect label="Instrument" value={form.investmentType} onChange={(v) => set("investmentType", v)} options={INVESTMENT_TYPES} />
              <LabeledInput label="Exposure (₹ Cr) *" value={form.exposureCr} onChange={(v) => set("exposureCr", v)} type="number" />
              <LabeledInput label="Tenor" value={form.tenor} onChange={(v) => set("tenor", v)} />
              <LabeledInput label="Entry Date" value={form.entryDate} onChange={(v) => set("entryDate", v)} type="date" />
              <LabeledInput label="Maturity Date" value={form.maturityDate} onChange={(v) => set("maturityDate", v)} type="date" />
            </div>
          </Section>

          <Section title="Term Sheet (Executed)">
            <div className="grid grid-cols-3 gap-4">
              <LabeledInput label="Issuer" value={form.issuer} onChange={(v) => set("issuer", v)} />
              <LabeledInput label="Instrument" value={form.instrument} onChange={(v) => set("instrument", v)} />
              <LabeledInput label="Issue Size" value={form.issueSize} onChange={(v) => set("issueSize", v)} placeholder="₹ Cr" />
              <LabeledInput label="Coupon" value={form.coupon} onChange={(v) => set("coupon", v)} />
              <LabeledInput label="Closing Date" value={form.closingDate} onChange={(v) => set("closingDate", v)} type="date" />
              <LabeledInput label="Put / Call" value={form.putCall} onChange={(v) => set("putCall", v)} />
            </div>
            <div className="mt-4">
              <LabeledTextarea label="Repayment" value={form.repayment} onChange={(v) => set("repayment", v)} rows={2} />
            </div>
          </Section>

          <Section
            title="Covenants"
            action={
              <button
                onClick={() => setCovenants((p) => [...p, { id: uid("cov"), text: "", type: "affirmative", threshold: "" }])}
                className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#FF7553]"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            }
          >
            {covenants.length === 0 ? (
              <div className="py-3 text-center text-xs text-white/30">None added — you can add these later too.</div>
            ) : (
              <div className="space-y-2">
                {covenants.map((c, i) => (
                  <RowWithDelete key={c.id} onDelete={() => setCovenants((p) => p.filter((x) => x.id !== c.id))}>
                    <input
                      className={`${inputCls} flex-1`}
                      style={inputStyle}
                      placeholder="Covenant text"
                      value={c.text}
                      onChange={(e) =>
                        setCovenants((p) => p.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))
                      }
                    />
                    <select
                      className={inputCls}
                      style={{ ...inputStyle, width: 140 }}
                      value={c.type}
                      onChange={(e) =>
                        setCovenants((p) => p.map((x, idx) => (idx === i ? { ...x, type: e.target.value as CovenantItem["type"] } : x)))
                      }
                    >
                      <option value="financial">Financial</option>
                      <option value="affirmative">Affirmative</option>
                      <option value="negative">Negative</option>
                    </select>
                    <input
                      className={inputCls}
                      style={{ ...inputStyle, width: 120 }}
                      placeholder="Threshold"
                      value={c.threshold}
                      onChange={(e) =>
                        setCovenants((p) => p.map((x, idx) => (idx === i ? { ...x, threshold: e.target.value } : x)))
                      }
                    />
                  </RowWithDelete>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Security"
            action={
              <button
                onClick={() =>
                  setSecurity((p) => [
                    ...p,
                    { id: uid("sec"), collateral: "", charge: "", coverage: "", guarantors: "", valuation: "", status: "Pending" as SecurityStatus },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#FF7553]"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            }
          >
            {security.length === 0 ? (
              <div className="py-3 text-center text-xs text-white/30">None added — you can add these later too.</div>
            ) : (
              <div className="space-y-2">
                {security.map((s, i) => (
                  <RowWithDelete key={s.id} onDelete={() => setSecurity((p) => p.filter((x) => x.id !== s.id))}>
                    <input
                      className={`${inputCls} flex-1`}
                      style={inputStyle}
                      placeholder="Collateral"
                      value={s.collateral}
                      onChange={(e) => setSecurity((p) => p.map((x, idx) => (idx === i ? { ...x, collateral: e.target.value } : x)))}
                    />
                    <input
                      className={inputCls}
                      style={{ ...inputStyle, width: 140 }}
                      placeholder="Charge"
                      value={s.charge}
                      onChange={(e) => setSecurity((p) => p.map((x, idx) => (idx === i ? { ...x, charge: e.target.value } : x)))}
                    />
                    <select
                      className={inputCls}
                      style={{ ...inputStyle, width: 130 }}
                      value={s.status}
                      onChange={(e) => setSecurity((p) => p.map((x, idx) => (idx === i ? { ...x, status: e.target.value as SecurityStatus } : x)))}
                    >
                      {SECURITY_STATUS_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </RowWithDelete>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Conditions Precedent / Subsequent"
            action={
              <button
                onClick={() => setCpCsItems((p) => [...p, { id: uid("cpcs"), kind: "CP", description: "", dueDate: "", status: "Pending" }])}
                className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#FF7553]"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            }
          >
            {cpCsItems.length === 0 ? (
              <div className="py-3 text-center text-xs text-white/30">None added — you can add these later too.</div>
            ) : (
              <div className="space-y-2">
                {cpCsItems.map((c, i) => (
                  <RowWithDelete key={c.id} onDelete={() => setCpCsItems((p) => p.filter((x) => x.id !== c.id))}>
                    <select
                      className={inputCls}
                      style={{ ...inputStyle, width: 80 }}
                      value={c.kind}
                      onChange={(e) => setCpCsItems((p) => p.map((x, idx) => (idx === i ? { ...x, kind: e.target.value as "CP" | "CS" } : x)))}
                    >
                      <option value="CP">CP</option>
                      <option value="CS">CS</option>
                    </select>
                    <input
                      className={`${inputCls} flex-1`}
                      style={inputStyle}
                      placeholder="Description"
                      value={c.description}
                      onChange={(e) => setCpCsItems((p) => p.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))}
                    />
                    <input
                      className={inputCls}
                      style={{ ...inputStyle, width: 150 }}
                      type="date"
                      value={c.dueDate || ""}
                      onChange={(e) => setCpCsItems((p) => p.map((x, idx) => (idx === i ? { ...x, dueDate: e.target.value } : x)))}
                    />
                  </RowWithDelete>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="DSRA (FD / MF)"
            action={
              <button
                onClick={() =>
                  setDsra((p) => [
                    ...p,
                    { id: uid("dsra"), bankName: "", fdNumber: "", creationDate: "", maturityDate: "", amount: 0, roi: 0, lienStatus: "Lien Pending" as LienStatus },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#FF7553]"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            }
          >
            {dsra.length === 0 ? (
              <div className="py-3 text-center text-xs text-white/30">None added — you can add these later too.</div>
            ) : (
              <div className="space-y-2">
                {dsra.map((d, i) => (
                  <RowWithDelete key={d.id} onDelete={() => setDsra((p) => p.filter((x) => x.id !== d.id))}>
                    <input
                      className={inputCls}
                      style={{ ...inputStyle, width: 140 }}
                      placeholder="Bank Name"
                      value={d.bankName}
                      onChange={(e) => setDsra((p) => p.map((x, idx) => (idx === i ? { ...x, bankName: e.target.value } : x)))}
                    />
                    <input
                      className={inputCls}
                      style={{ ...inputStyle, width: 120 }}
                      placeholder="FD Number"
                      value={d.fdNumber}
                      onChange={(e) => setDsra((p) => p.map((x, idx) => (idx === i ? { ...x, fdNumber: e.target.value } : x)))}
                    />
                    <input
                      className={inputCls}
                      style={{ ...inputStyle, width: 150 }}
                      type="date"
                      value={d.maturityDate}
                      onChange={(e) => setDsra((p) => p.map((x, idx) => (idx === i ? { ...x, maturityDate: e.target.value } : x)))}
                    />
                    <input
                      className={inputCls}
                      style={{ ...inputStyle, width: 110 }}
                      type="number"
                      placeholder="Amount"
                      value={d.amount || ""}
                      onChange={(e) => setDsra((p) => p.map((x, idx) => (idx === i ? { ...x, amount: Number(e.target.value) || 0 } : x)))}
                    />
                  </RowWithDelete>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "#1A2B47" }}>
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm text-white/70 hover:bg-[#1C3151]"
            style={{ borderColor: "#1A2B47" }}
          >
            Cancel
          </button>
          <Button onClick={handleSave} disabled={saving} className="h-9 gap-1.5 bg-[#FF7553] text-[#0F1B2E] hover:bg-[#FF8E72]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Company
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-white/40">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function RowWithDelete({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <button onClick={onDelete} className="shrink-0 text-white/30 hover:text-[#EF4444]">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

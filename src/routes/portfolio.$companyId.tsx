import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getCompany,
  updateCompany,
  deleteCompanyLocal,
  normalizeCovenants,
  formatCr,
  formatDate,
  SECTOR_COLORS,
  STATUS_COLORS,
  type Company,
  type Sector,
  type InvestmentType,
  type CompanyStatus,
  type TermSheetData,
  type CovenantItem,
  type SecurityItem,
  type SecurityStatus,
  type CPCSItem,
  type CPCSStatus,
  type CovenantComplianceEntry,
  type CovenantComplianceStatus,
  type MeetingNote,
  type DSRAInstrument,
  type LienStatus,
  type KeyPerson,
} from "@/lib/portfolio-data";
import {
  uploadDocument,
  listDocuments,
  getDocumentSignedUrl,
  deleteDocument,
  deleteCompanyRemote,
  pushCompaniesDebounced,
  type DocumentRow,
} from "@/lib/cloud-sync";
import {
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Upload,
  Loader2,
  FileText,
  Plus,
  Trash2,
  Clock,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LabeledInput, LabeledTextarea, LabeledSelect, inputCls, inputStyle, labelCls } from "@/components/portfolio-form-fields";

export const Route = createFileRoute("/portfolio/$companyId")({
  component: CompanyDetail,
});

const SECTORS: Sector[] = ["NBFC", "Renewable Energy", "Solar PV Mfg", "rPET Recycling", "AIF", "Manufacturing", "Infrastructure", "Other"];
const INVESTMENT_TYPES: InvestmentType[] = ["NCD", "CCD", "Equity", "Structured Equity", "Senior Secured", "Structured"];
const COMPANY_STATUSES: CompanyStatus[] = ["Active", "Watch", "Exit", "Pipeline"];

// Persist a company patch to localStorage immediately, reflect it in local
// component state, and push to the cloud (debounced). Every tab below saves
// through this single path so nothing forgets the cloud push -- previously
// updateCompany() only ever wrote to localStorage; pushCompanies() existed
// but was never called from any screen, so company edits never left the
// browser they were made on. Fixed here, once, for every tab.
function persist(
  companyId: string,
  patch: Partial<Company>,
  onUpdate: (c: Company) => void,
) {
  const updated = updateCompany(companyId, patch);
  if (updated) onUpdate(updated);
  pushCompaniesDebounced();
  return updated;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | undefined>();
  const [missing, setMissing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const c = getCompany(companyId);
    if (!c) setMissing(true);
    else setCompany(c);
  }, [companyId]);

  const handleDelete = async () => {
    if (!company) return;
    if (!window.confirm(`Delete ${company.name} entirely? This removes all its data — term sheet, security, compliance history, everything. This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    deleteCompanyLocal(company.id);
    const res = await deleteCompanyRemote(company.id);
    setDeleting(false);
    if (!res.ok && !res.notProvisioned) {
      toast.error(`Removed locally, but cloud delete failed: ${res.error || "unknown error"}. It may reappear after a sync — try deleting again once the cloud is reachable.`);
    } else {
      toast.success(`${company.name} deleted.`);
    }
    navigate({ to: "/portfolio" });
  };

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
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-[#FF7553]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Portfolio
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-[#EF4444]/80 hover:bg-[#EF444415] hover:text-[#EF4444] disabled:opacity-50"
          style={{ borderColor: "#EF444440" }}
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete Company
        </button>
      </div>

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

      <DSRAMaturityBanner company={company} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap border bg-[#15253F]" style={{ borderColor: "#1A2B47" }}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="termsheet">Term Sheet</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="cpcs">CP &amp; CS</TabsTrigger>
          <TabsTrigger value="covenants">Covenant Compliance</TabsTrigger>
          <TabsTrigger value="review">Review Notes</TabsTrigger>
          <TabsTrigger value="meetings">Meeting Notes</TabsTrigger>
          <TabsTrigger value="dsra">DSRA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab company={company} onUpdate={setCompany} />
        </TabsContent>
        <TabsContent value="termsheet" className="mt-4">
          <TermSheetTab company={company} onUpdate={setCompany} />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityTab company={company} onUpdate={setCompany} />
        </TabsContent>
        <TabsContent value="cpcs" className="mt-4">
          <CPCSTab company={company} onUpdate={setCompany} />
        </TabsContent>
        <TabsContent value="covenants" className="mt-4">
          <CovenantComplianceTab company={company} onUpdate={setCompany} />
        </TabsContent>
        <TabsContent value="review" className="mt-4">
          <ReviewNotesTab company={company} />
        </TabsContent>
        <TabsContent value="meetings" className="mt-4">
          <MeetingNotesTab company={company} onUpdate={setCompany} />
        </TabsContent>
        <TabsContent value="dsra" className="mt-4">
          <DSRATab company={company} onUpdate={setCompany} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =================== Shared bits ===================

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-white/40">{title}</div>
        {action}
      </div>
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


function SaveCancelBar({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={onCancel}
        className="inline-flex h-9 items-center rounded-md border px-4 text-sm text-white/70 hover:bg-[#1C3151]"
        style={{ borderColor: "#1A2B47" }}
      >
        Cancel
      </button>
      <Button
        onClick={onSave}
        disabled={saving}
        className="h-9 gap-1.5 bg-[#FF7553] text-[#0F1B2E] hover:bg-[#FF8E72]"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save
      </Button>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-white/70 hover:bg-[#1C3151]"
      style={{ borderColor: "#1A2B47" }}
    >
      <Pencil className="h-3 w-3" /> Edit
    </button>
  );
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-10 text-sm text-white/40"
      style={{ borderColor: "#1A2B47" }}
    >
      <span>{label}</span>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-md bg-[#FF7553] px-3 py-1.5 text-xs font-medium text-[#0F1B2E] hover:bg-[#FF8E72]"
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>
  );
}

function StatusPill({ status, colorMap }: { status: string; colorMap: Record<string, { bg: string; c: string }> }) {
  const v = colorMap[status] || { bg: "#64748B20", c: "#94A3B8" };
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ backgroundColor: v.bg, color: v.c }}
    >
      {status}
    </span>
  );
}

// =================== Overview (unchanged) ===================

type OverviewForm = {
  sector: Sector;
  subSector: string;
  cin: string;
  website: string;
  description: string;
  investmentType: InvestmentType;
  exposureCr: string;
  entryDate: string;
  maturityDate: string;
  tenor: string;
  status: CompanyStatus;
  watchReason: string;
};

function toOverviewForm(c: Company): OverviewForm {
  return {
    sector: c.sector,
    subSector: c.subSector || "",
    cin: c.cin || "",
    website: c.website || "",
    description: c.description || "",
    investmentType: c.investmentType,
    exposureCr: String(c.exposureCr ?? ""),
    entryDate: c.entryDate || "",
    maturityDate: c.maturityDate || "",
    tenor: c.tenor || "",
    status: c.status,
    watchReason: c.watchReason || "",
  };
}

function OverviewTab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OverviewForm>(toOverviewForm(company));
  const [people, setPeople] = useState<KeyPerson[]>(company.keyPeople || []);
  const [share, setShare] = useState({
    promoter: company.shareholding?.promoter ?? 0,
    institutional: company.shareholding?.institutional ?? 0,
    public: company.shareholding?.public ?? 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(toOverviewForm(company));
    setPeople(company.keyPeople || []);
    setShare({
      promoter: company.shareholding?.promoter ?? 0,
      institutional: company.shareholding?.institutional ?? 0,
      public: company.shareholding?.public ?? 0,
    });
    setEditing(false);
  }, [company.id]);

  const set = (k: keyof OverviewForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const addPerson = () => setPeople((p) => [...p, { name: "", designation: "" }]);
  const removePerson = (idx: number) => setPeople((p) => p.filter((_, i) => i !== idx));
  const patchPerson = (idx: number, k: keyof KeyPerson, v: string) =>
    setPeople((p) => p.map((x, i) => (i === idx ? { ...x, [k]: v } : x)));

  const save = () => {
    if (!form.exposureCr.trim() || isNaN(Number(form.exposureCr))) {
      toast.error("Exposure must be a number.");
      return;
    }
    setSaving(true);
    persist(
      company.id,
      {
        sector: form.sector,
        subSector: form.subSector.trim() || undefined,
        cin: form.cin.trim() || undefined,
        website: form.website.trim() || undefined,
        description: form.description.trim() || undefined,
        investmentType: form.investmentType,
        exposureCr: Number(form.exposureCr),
        entryDate: form.entryDate,
        maturityDate: form.maturityDate || undefined,
        tenor: form.tenor.trim() || undefined,
        status: form.status,
        watchReason: form.status === "Watch" ? form.watchReason.trim() || undefined : undefined,
        keyPeople: people.filter((p) => p.name.trim()),
        shareholding: share,
      },
      onUpdate,
    );
    setTimeout(() => setSaving(false), 300);
    setEditing(false);
    toast.success("Overview saved.");
  };

  const cancel = () => {
    setForm(toOverviewForm(company));
    setPeople(company.keyPeople || []);
    setShare({
      promoter: company.shareholding?.promoter ?? 0,
      institutional: company.shareholding?.institutional ?? 0,
      public: company.shareholding?.public ?? 0,
    });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <EditButton onClick={() => setEditing(true)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card title="Company">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sector" value={company.sector} />
              <Field label="Sub-sector" value={company.subSector} />
              <Field label="CIN" value={company.cin} />
              <Field label="Website" value={company.website} />
            </div>
            {company.description && (
              <div className="mt-4">
                <Field label="Description" value={company.description} />
              </div>
            )}
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
            {(company.keyPeople || []).length === 0 ? (
              <div className="text-sm text-white/40">No key people recorded.</div>
            ) : (
              <ul className="space-y-2">
                {company.keyPeople.map((p, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-white/90">{p.name}</span>
                    <span className="text-white/50">{p.designation}</span>
                  </li>
                ))}
              </ul>
            )}
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card title="Company">
        <div className="grid grid-cols-2 gap-4">
          <LabeledSelect label="Sector" value={form.sector} onChange={(v) => set("sector", v)} options={SECTORS} />
          <LabeledInput label="Sub-sector" value={form.subSector} onChange={(v) => set("subSector", v)} />
          <LabeledInput label="CIN" value={form.cin} onChange={(v) => set("cin", v)} />
          <LabeledInput label="Website" value={form.website} onChange={(v) => set("website", v)} />
        </div>
        <div className="mt-4">
          <LabeledTextarea label="Description" value={form.description} onChange={(v) => set("description", v)} rows={2} />
        </div>
      </Card>

      <Card title="Our Investment">
        <div className="grid grid-cols-3 gap-4">
          <LabeledSelect label="Instrument" value={form.investmentType} onChange={(v) => set("investmentType", v)} options={INVESTMENT_TYPES} />
          <LabeledInput label="Exposure (₹ Cr)" value={form.exposureCr} onChange={(v) => set("exposureCr", v)} type="number" />
          <LabeledInput label="Tenor" value={form.tenor} onChange={(v) => set("tenor", v)} />
          <LabeledInput label="Entry Date" value={form.entryDate} onChange={(v) => set("entryDate", v)} type="date" />
          <LabeledInput label="Maturity Date" value={form.maturityDate} onChange={(v) => set("maturityDate", v)} type="date" />
          <LabeledSelect label="Status" value={form.status} onChange={(v) => set("status", v)} options={COMPANY_STATUSES} />
        </div>
        {form.status === "Watch" && (
          <div className="mt-4">
            <LabeledTextarea label="Watch Reason" value={form.watchReason} onChange={(v) => set("watchReason", v)} rows={2} />
          </div>
        )}
      </Card>

      <Card
        title="Key People"
        action={
          <button onClick={addPerson} className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#FF7553]">
            <Plus className="h-3.5 w-3.5" /> Add Person
          </button>
        }
      >
        {people.length === 0 ? (
          <div className="py-3 text-center text-xs text-white/30">No key people added.</div>
        ) : (
          <div className="space-y-2">
            {people.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  style={inputStyle}
                  placeholder="Name"
                  value={p.name}
                  onChange={(e) => patchPerson(idx, "name", e.target.value)}
                />
                <input
                  className={`${inputCls} flex-1`}
                  style={inputStyle}
                  placeholder="Designation"
                  value={p.designation}
                  onChange={(e) => patchPerson(idx, "designation", e.target.value)}
                />
                <button onClick={() => removePerson(idx)} className="shrink-0 text-white/30 hover:text-[#EF4444]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Shareholding (%)">
        <div className="grid grid-cols-3 gap-4">
          <LabeledInput label="Promoter" value={share.promoter} onChange={(v) => setShare((s) => ({ ...s, promoter: Number(v) || 0 }))} type="number" />
          <LabeledInput label="Institutional" value={share.institutional} onChange={(v) => setShare((s) => ({ ...s, institutional: Number(v) || 0 }))} type="number" />
          <LabeledInput label="Public" value={share.public} onChange={(v) => setShare((s) => ({ ...s, public: Number(v) || 0 }))} type="number" />
        </div>
      </Card>

      <SaveCancelBar onSave={save} onCancel={cancel} saving={saving} />
    </div>
  );
}

// =================== Term Sheet (Executed) — manual entry ===================

function TermSheetTab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const ts = company.termSheet || {};
  const hasData = !!(ts.issuer || ts.instrument || ts.issueSize || ts.coupon || ts.tenor || ts.repayment || ts.putCall || ts.closingDate);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TermSheetData>(ts);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(company.termSheet || {});
    setEditing(false);
  }, [company.id]);

  const set = (k: keyof TermSheetData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    setSaving(true);
    persist(company.id, { termSheet: { ...company.termSheet, ...form } }, onUpdate);
    setTimeout(() => setSaving(false), 300);
    setEditing(false);
    toast.success("Term sheet saved.");
  };

  const cancel = () => {
    setForm(company.termSheet || {});
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <TermSheetDocuments company={company} />
      <Card
        title="Executed Term Sheet"
        action={!editing ? <EditButton onClick={() => setEditing(true)} /> : null}
      >
        {!editing && !hasData ? (
          <EmptyState label="No term sheet details entered yet." onAdd={() => setEditing(true)} />
        ) : !editing ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Issuer" value={form.issuer} />
              <Field label="Instrument" value={form.instrument} />
              <Field label="Issue Size" value={form.issueSize} />
              <Field label="Coupon" value={form.coupon} />
              <Field label="Tenor" value={form.tenor} />
              <Field label="Closing Date" value={formatDate(form.closingDate)} />
              <Field label="Put / Call" value={form.putCall} />
            </div>
            <div className="mt-4">
              <Field label="Repayment" value={form.repayment} />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <LabeledInput label="Issuer" value={form.issuer || ""} onChange={(v) => set("issuer", v)} />
              <LabeledInput label="Instrument" value={form.instrument || ""} onChange={(v) => set("instrument", v)} />
              <LabeledInput label="Issue Size" value={form.issueSize || ""} onChange={(v) => set("issueSize", v)} placeholder="₹ Cr" />
              <LabeledInput label="Coupon" value={form.coupon || ""} onChange={(v) => set("coupon", v)} placeholder="e.g. 13.5% p.a." />
              <LabeledInput label="Tenor" value={form.tenor || ""} onChange={(v) => set("tenor", v)} />
              <LabeledInput label="Closing Date" value={form.closingDate || ""} onChange={(v) => set("closingDate", v)} type="date" />
              <LabeledInput label="Put / Call" value={form.putCall || ""} onChange={(v) => set("putCall", v)} />
            </div>
            <div className="mt-4">
              <LabeledTextarea label="Repayment" value={form.repayment || ""} onChange={(v) => set("repayment", v)} />
            </div>
          </>
        )}
      </Card>
      {editing && <SaveCancelBar onSave={save} onCancel={cancel} saving={saving} />}
    </div>
  );
}

// Plain file storage for the executed term sheet document itself — no
// parsing or extraction, matching the "manual entry, no AI" direction for
// the whole tab. The most recently uploaded file gets a prominent one-click
// Open button; older uploads (e.g. amendments) stay listed below for the
// audit trail, same pattern as Quarterly Review Notes.
function TermSheetDocuments({ company }: { company: Company }) {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const res = await listDocuments();
    if (res.ok) {
      const filtered = (res.data || []).filter((d) => d.company_id === company.id && d.kind === "termsheet");
      filtered.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      setDocs(filtered);
      setStatus(null);
    } else if (res.notProvisioned) {
      setStatus("Cloud sync not provisioned yet — try again after running the setup migration.");
    } else {
      setStatus(res.error || "Couldn't load documents.");
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadDocument(file, { kind: "termsheet", companyId: company.id, companyName: company.name });
      if (res.ok) {
        toast.success("Term sheet uploaded.");
        refresh();
      } else {
        toast.error(res.error || "Upload failed.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (d: DocumentRow) => {
    setOpening(true);
    try {
      const url = await getDocumentSignedUrl(d.storage_path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("Couldn't generate a link to open the document.");
    } finally {
      setOpening(false);
    }
  };

  const handleDelete = async (d: DocumentRow) => {
    const res = await deleteDocument(d);
    if (res.ok) {
      toast.success("Deleted.");
      refresh();
    } else {
      toast.error(res.error || "Couldn't delete.");
    }
  };

  const latest = docs[0];
  const older = docs.slice(1);

  return (
    <Card
      title="Executed Term Sheet Document"
      action={
        <label>
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <span
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium text-white/70 hover:bg-[#1C3151]"
            style={{ borderColor: "#1A2B47", opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {latest ? "Upload New Version" : "Upload"}
          </span>
        </label>
      }
    >
      {loading ? (
        <div className="py-6 text-center text-xs text-white/40">Loading…</div>
      ) : status ? (
        <div className="rounded-md border border-dashed p-4 text-xs text-white/50" style={{ borderColor: "#1A2B47" }}>{status}</div>
      ) : !latest ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-10 text-xs text-white/40" style={{ borderColor: "#1A2B47" }}>
          <FileText className="mb-2 h-6 w-6 text-white/20" />
          No executed term sheet uploaded yet. Plain file storage only — nothing is parsed or extracted.
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="flex items-center justify-between rounded-md border p-3"
            style={{ borderColor: "#1A2B47", backgroundColor: "#0F1B2E" }}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-[#FF7553]" />
              <div>
                <div className="text-sm text-white/90">{latest.filename}</div>
                <div className="text-xs text-white/40">Uploaded {new Date(latest.uploaded_at).toLocaleString()}</div>
              </div>
            </div>
            <Button
              onClick={() => handleOpen(latest)}
              disabled={opening}
              className="h-8 gap-1.5 bg-[#FF7553] text-[#0F1B2E] hover:bg-[#FF8E72]"
            >
              {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Open Term Sheet
            </Button>
          </div>

          {older.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-wider text-white/30">Earlier Versions</div>
              <div className="space-y-1">
                {older.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-1.5" style={{ borderColor: "#1A2B47" }}>
                    <span className="text-xs text-white/60">{d.filename} · {new Date(d.uploaded_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleOpen(d)} className="text-xs text-white/50 hover:text-[#FF7553]">Open</button>
                      <button onClick={() => handleDelete(d)} className="text-white/30 hover:text-[#EF4444]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// =================== Security ===================

const SECURITY_STATUS_OPTIONS: SecurityStatus[] = ["Pending", "In Process", "Perfected"];
const SECURITY_STATUS_COLORS: Record<string, { bg: string; c: string }> = {
  Pending: { bg: "#64748B20", c: "#94A3B8" },
  "In Process": { bg: "#F59E0B20", c: "#F59E0B" },
  Perfected: { bg: "#22C55E20", c: "#22C55E" },
};

function SecurityTab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const saved = company.security || [];
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<SecurityItem[]>(saved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(company.security || []);
    setEditing(false);
  }, [company.id]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: uid("sec"), collateral: "", charge: "", coverage: "", guarantors: "", valuation: "", status: "Pending" },
    ]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((s) => s.id !== id));
  const patch = (id: string, k: keyof SecurityItem, v: string) =>
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, [k]: v } : s)));

  const save = () => {
    setSaving(true);
    persist(company.id, { security: items }, onUpdate);
    setTimeout(() => setSaving(false), 300);
    setEditing(false);
    toast.success("Security details saved.");
  };

  const cancel = () => {
    setItems(company.security || []);
    setEditing(false);
  };

  const startEdit = () => {
    setItems(company.security && company.security.length ? company.security : [
      { id: uid("sec"), collateral: "", charge: "", coverage: "", guarantors: "", valuation: "", status: "Pending" },
    ]);
    setEditing(true);
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        {saved.length === 0 ? (
          <EmptyState label="No security packages recorded yet." onAdd={startEdit} />
        ) : (
          <>
            {saved.map((s, idx) => (
              <Card
                key={s.id}
                title={`Security Package ${idx + 1}`}
                action={
                  <div className="flex items-center gap-2">
                    <StatusPill status={s.status} colorMap={SECURITY_STATUS_COLORS} />
                    {idx === 0 && <EditButton onClick={startEdit} />}
                  </div>
                }
              >
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Collateral" value={s.collateral} />
                  <Field label="Charge" value={s.charge} />
                  <Field label="Coverage" value={s.coverage} />
                  <Field label="Guarantors" value={s.guarantors} />
                  <Field label="Valuation" value={s.valuation} />
                </div>
                {s.notes && (
                  <div className="mt-4">
                    <Field label="Notes" value={s.notes} />
                  </div>
                )}
              </Card>
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((s, idx) => (
        <Card
          key={s.id}
          title={`Security Package ${idx + 1}`}
          action={
            <div className="flex items-center gap-2">
              <StatusPill status={s.status} colorMap={SECURITY_STATUS_COLORS} />
              <button onClick={() => removeItem(s.id)} className="text-white/30 hover:text-[#EF4444]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-3 gap-4">
            <LabeledInput label="Collateral" value={s.collateral || ""} onChange={(v) => patch(s.id, "collateral", v)} />
            <LabeledInput label="Charge" value={s.charge || ""} onChange={(v) => patch(s.id, "charge", v)} placeholder="First / Second / Pari-passu / Exclusive" />
            <LabeledInput label="Coverage" value={s.coverage || ""} onChange={(v) => patch(s.id, "coverage", v)} placeholder="e.g. 2.0x asset cover" />
            <LabeledInput label="Guarantors" value={s.guarantors || ""} onChange={(v) => patch(s.id, "guarantors", v)} />
            <LabeledInput label="Valuation" value={s.valuation || ""} onChange={(v) => patch(s.id, "valuation", v)} />
            <LabeledSelect label="Status" value={s.status} onChange={(v) => patch(s.id, "status", v)} options={SECURITY_STATUS_OPTIONS} />
          </div>
          <div className="mt-4">
            <LabeledTextarea label="Notes" value={s.notes || ""} onChange={(v) => patch(s.id, "notes", v)} rows={2} />
          </div>
        </Card>
      ))}
      <div className="flex items-center justify-between">
        <button
          onClick={addItem}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs text-white/70 hover:bg-[#1C3151]"
          style={{ borderColor: "#1A2B47" }}
        >
          <Plus className="h-3.5 w-3.5" /> Add Security Package
        </button>
        <SaveCancelBar onSave={save} onCancel={cancel} saving={saving} />
      </div>
    </div>
  );
}

// =================== CP & CS Compliance ===================

const CPCS_STATUS_COLORS: Record<string, { bg: string; c: string }> = {
  Pending: { bg: "#64748B20", c: "#94A3B8" },
  Completed: { bg: "#22C55E20", c: "#22C55E" },
  Overdue: { bg: "#EF444420", c: "#EF4444" },
};

// "Overdue" is derived, never stored -- see CPCSItem in portfolio-data.ts.
function cpcsDisplayStatus(item: CPCSItem): string {
  if (item.status === "Completed") return "Completed";
  if (item.dueDate && new Date(item.dueDate).getTime() < Date.now()) return "Overdue";
  return "Pending";
}

function CPCSTab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const savedItems = company.cpCsItems || [];
  const [editingKind, setEditingKind] = useState<"CP" | "CS" | null>(null);
  const [items, setItems] = useState<CPCSItem[]>(savedItems);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(company.cpCsItems || []);
    setEditingKind(null);
  }, [company.id]);

  const addItem = (kind: "CP" | "CS") =>
    setItems((prev) => [...prev, { id: uid("cpcs"), kind, description: "", dueDate: "", status: "Pending" }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const patch = (id: string, k: keyof CPCSItem, v: string) =>
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, [k]: v } as CPCSItem;
        if (k === "status" && v === "Completed") next.completedAt = new Date().toISOString();
        if (k === "status" && v === "Pending") next.completedAt = undefined;
        return next;
      }),
    );

  const save = () => {
    setSaving(true);
    persist(company.id, { cpCsItems: items }, onUpdate);
    setTimeout(() => setSaving(false), 300);
    setEditingKind(null);
    toast.success("CP & CS items saved.");
  };

  const cancel = () => {
    setItems(company.cpCsItems || []);
    setEditingKind(null);
  };

  const startEdit = (kind: "CP" | "CS") => {
    setItems(company.cpCsItems || []);
    setEditingKind(kind);
  };

  const savedCps = savedItems.filter((i) => i.kind === "CP");
  const savedCss = savedItems.filter((i) => i.kind === "CS");
  const editCps = items.filter((i) => i.kind === "CP");
  const editCss = items.filter((i) => i.kind === "CS");

  const renderReadOnly = (label: string, kind: "CP" | "CS", group: CPCSItem[]) => (
    <Card title={label} action={<EditButton onClick={() => startEdit(kind)} />}>
      {group.length === 0 ? (
        <EmptyState label={`No ${label.toLowerCase()} items yet.`} onAdd={() => startEdit(kind)} />
      ) : (
        <div className="space-y-2">
          {group.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b py-2" style={{ borderColor: "#1A2B47" }}>
              <div>
                <div className="text-sm text-white/90">{item.description || "(untitled)"}</div>
                <div className="text-xs text-white/40">Due {item.dueDate ? formatDate(item.dueDate) : "—"}</div>
              </div>
              <StatusPill status={cpcsDisplayStatus(item)} colorMap={CPCS_STATUS_COLORS} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderEdit = (label: string, kind: "CP" | "CS", group: CPCSItem[]) => (
    <Card
      title={label}
      action={
        <button
          onClick={() => addItem(kind)}
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#FF7553]"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      }
    >
      {group.length === 0 ? (
        <div className="py-6 text-center text-xs text-white/40">No {label.toLowerCase()} items yet.</div>
      ) : (
        <div className="space-y-3">
          {group.map((item) => (
            <div key={item.id} className="grid grid-cols-12 items-end gap-2 border-b pb-3" style={{ borderColor: "#1A2B47" }}>
              <div className="col-span-6">
                <label className={labelCls}>Description</label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={item.description}
                  onChange={(e) => patch(item.id, "description", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Due Date</label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="date"
                  value={item.dueDate || ""}
                  onChange={(e) => patch(item.id, "dueDate", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Status</label>
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={item.status}
                  onChange={(e) => patch(item.id, "status", e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="col-span-1 flex justify-center">
                <StatusPill status={cpcsDisplayStatus(item)} colorMap={CPCS_STATUS_COLORS} />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeItem(item.id)} className="text-white/30 hover:text-[#EF4444]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      {editingKind === "CP" ? renderEdit("Conditions Precedent", "CP", editCps) : renderReadOnly("Conditions Precedent", "CP", savedCps)}
      {editingKind === "CS" ? renderEdit("Conditions Subsequent", "CS", editCss) : renderReadOnly("Conditions Subsequent", "CS", savedCss)}
      {editingKind && <SaveCancelBar onSave={save} onCancel={cancel} saving={saving} />}
    </div>
  );
}

// =================== Covenant Compliance ===================

const COVENANT_STATUS_COLORS: Record<string, { bg: string; c: string }> = {
  Compliant: { bg: "#22C55E20", c: "#22C55E" },
  Breach: { bg: "#EF444420", c: "#EF4444" },
  "Not Tested": { bg: "#64748B20", c: "#94A3B8" },
};

function CovenantComplianceTab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const savedDefs = normalizeCovenants(company.termSheet?.covenants);
  const [editingDefs, setEditingDefs] = useState(false);
  const [defs, setDefs] = useState<CovenantItem[]>(savedDefs);
  const [defsSaving, setDefsSaving] = useState(false);

  const [entries, setEntries] = useState<CovenantComplianceEntry[]>(company.covenantCompliance || []);
  const [period, setPeriod] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logDirty, setLogDirty] = useState(false);

  useEffect(() => {
    setDefs(normalizeCovenants(company.termSheet?.covenants));
    setEditingDefs(false);
    setEntries(company.covenantCompliance || []);
    setLogDirty(false);
  }, [company.id]);

  const addCovenant = () =>
    setDefs((prev) => [...prev, { id: uid("cov"), text: "", type: "affirmative", threshold: "" }]);
  const removeCovenant = (id: string) => {
    setDefs((prev) => prev.filter((c) => c.id !== id));
    setEntries((prev) => prev.filter((e) => e.covenantId !== id));
  };
  const patchCovenant = (id: string, k: keyof CovenantItem, v: string) =>
    setDefs((prev) => prev.map((c) => (c.id === id ? { ...c, [k]: v } : c)));

  const statusFor = (covenantId: string, p: string) =>
    entries.find((e) => e.covenantId === covenantId && e.period === p);

  const setStatus = (covenantId: string, p: string, status: CovenantComplianceStatus) => {
    if (!p.trim()) {
      toast.error('Enter a reporting period first (e.g. "Q3 FY26").');
      return;
    }
    setLogDirty(true);
    setEntries((prev) => {
      const existing = prev.find((e) => e.covenantId === covenantId && e.period === p);
      if (existing) {
        return prev.map((e) => (e === existing ? { ...e, status, recordedAt: new Date().toISOString() } : e));
      }
      return [...prev, { id: uid("cce"), covenantId, period: p, status, recordedAt: new Date().toISOString() }];
    });
  };

  const setNote = (covenantId: string, p: string, note: string) => {
    if (!p.trim()) {
      toast.error('Enter a reporting period first (e.g. "Q3 FY26").');
      return;
    }
    setLogDirty(true);
    setEntries((prev) => {
      const existing = prev.find((e) => e.covenantId === covenantId && e.period === p);
      if (existing) {
        return prev.map((e) => (e === existing ? { ...e, note, recordedAt: new Date().toISOString() } : e));
      }
      // Writing a note before picking a status: create the entry as
      // "Not Tested" by default rather than forcing a status choice first.
      return [...prev, { id: uid("cce"), covenantId, period: p, status: "Not Tested", note, recordedAt: new Date().toISOString() }];
    });
  };

  const saveDefs = () => {
    setDefsSaving(true);
    persist(company.id, { termSheet: { ...company.termSheet, covenants: defs } }, onUpdate);
    setTimeout(() => setDefsSaving(false), 300);
    setEditingDefs(false);
    toast.success("Covenant definitions saved.");
  };

  const cancelDefs = () => {
    setDefs(savedDefs);
    setEditingDefs(false);
  };

  const saveLog = () => {
    setLogSaving(true);
    persist(company.id, { covenantCompliance: entries }, onUpdate);
    setTimeout(() => setLogSaving(false), 300);
    setLogDirty(false);
    toast.success("Compliance log saved.");
  };

  const periodsLogged = Array.from(new Set(entries.map((e) => e.period))).sort().reverse();
  const activeDefs = editingDefs ? defs : savedDefs;

  return (
    <div className="space-y-4">
      {!editingDefs ? (
        <Card title="Covenant Definitions" action={<EditButton onClick={() => setEditingDefs(true)} />}>
          {savedDefs.length === 0 ? (
            <EmptyState label="No covenants defined yet." onAdd={() => setEditingDefs(true)} />
          ) : (
            <div className="space-y-2">
              {savedDefs.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b py-2" style={{ borderColor: "#1A2B47" }}>
                  <span className="text-sm font-semibold text-white">{c.text || "(untitled)"}</span>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <span className="capitalize">{c.type}</span>
                    <span>{c.threshold || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
          <Card
            title="Covenant Definitions"
            action={
              <button onClick={addCovenant} className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#FF7553]">
                <Plus className="h-3.5 w-3.5" /> Add Covenant
              </button>
            }
          >
            {defs.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/40">No covenants defined yet.</div>
            ) : (
              <div className="space-y-3">
                {defs.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 border-b pb-3" style={{ borderColor: "#1A2B47" }}>
                    <div className="col-span-6">
                      <label className={labelCls}>Covenant</label>
                      <input className={inputCls} style={inputStyle} value={c.text} onChange={(e) => patchCovenant(c.id, "text", e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <label className={labelCls}>Type</label>
                      <select className={inputCls} style={inputStyle} value={c.type || "affirmative"} onChange={(e) => patchCovenant(c.id, "type", e.target.value)}>
                        <option value="financial">Financial</option>
                        <option value="affirmative">Affirmative</option>
                        <option value="negative">Negative</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Threshold</label>
                      <input className={inputCls} style={inputStyle} value={c.threshold || ""} onChange={(e) => patchCovenant(c.id, "threshold", e.target.value)} />
                    </div>
                    <div className="col-span-1 flex items-end justify-end">
                      <button onClick={() => removeCovenant(c.id)} className="text-white/30 hover:text-[#EF4444]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <SaveCancelBar onSave={saveDefs} onCancel={cancelDefs} saving={defsSaving} />
        </>
      )}

      <Card title="Log Compliance for a Period">
        <div className="mb-4 max-w-xs">
          <LabeledInput label="Reporting Period" value={period} onChange={setPeriod} placeholder='e.g. "Q3 FY26"' />
        </div>
        {activeDefs.length === 0 ? (
          <div className="py-4 text-center text-xs text-white/40">Add covenants above first.</div>
        ) : (
          <div className="space-y-2">
            {activeDefs.map((c) => {
              const entry = period ? statusFor(c.id, period) : undefined;
              return (
                <div key={c.id} className="border-b py-2.5" style={{ borderColor: "#1A2B47" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white/90">{c.text || "(untitled covenant)"}</span>
                    <div className="flex gap-1.5">
                      {(["Compliant", "Breach", "Not Tested"] as CovenantComplianceStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(c.id, period, s)}
                          className="rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-opacity"
                          style={{
                            backgroundColor: COVENANT_STATUS_COLORS[s].bg,
                            color: COVENANT_STATUS_COLORS[s].c,
                            opacity: entry?.status === s ? 1 : 0.35,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    className={`${inputCls} mt-2`}
                    style={{ ...inputStyle, height: 32 }}
                    placeholder="Actual value / commentary for this period (optional)"
                    value={entry?.note || ""}
                    disabled={!period.trim()}
                    onChange={(e) => setNote(c.id, period, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        )}
        {logDirty && (
          <div className="mt-4 flex justify-end">
            <Button onClick={saveLog} disabled={logSaving} className="h-9 gap-1.5 bg-[#FF7553] text-[#0F1B2E] hover:bg-[#FF8E72]">
              {logSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Compliance Log
            </Button>
          </div>
        )}
      </Card>

      {periodsLogged.length > 0 && (
        <Card title="Compliance History">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
                  <th className="py-2 pr-4 font-medium">Covenant</th>
                  {periodsLogged.map((p) => (
                    <th key={p} className="px-3 py-2 text-center font-medium">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeDefs.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: "#1A2B47" }}>
                    <td className="py-2 pr-4 font-semibold text-white">{c.text || "(untitled)"}</td>
                    {periodsLogged.map((p) => {
                      const e = statusFor(c.id, p);
                      return (
                        <td key={p} className="px-3 py-2 text-center align-top">
                          {e ? (
                            <div className="flex flex-col items-center gap-1">
                              <StatusPill status={e.status} colorMap={COVENANT_STATUS_COLORS} />
                              {e.note && <div className="max-w-[160px] whitespace-normal text-[11px] text-white/50">{e.note}</div>}
                            </div>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// =================== Quarterly Review Notes ===================

function ReviewNotesTab({ company }: { company: Company }) {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const res = await listDocuments();
    if (res.ok) {
      setDocs((res.data || []).filter((d) => d.company_id === company.id && d.kind === "quarterly_review"));
      setStatus(null);
    } else if (res.notProvisioned) {
      setStatus("Cloud sync not provisioned yet — try again after running the setup migration.");
    } else {
      setStatus(res.error || "Couldn't load review notes.");
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadDocument(file, { kind: "quarterly_review", companyId: company.id, companyName: company.name });
      if (res.ok) {
        toast.success("Review note uploaded.");
        refresh();
      } else {
        toast.error(res.error || "Upload failed.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (d: DocumentRow) => {
    const res = await deleteDocument(d);
    if (res.ok) {
      toast.success("Deleted.");
      refresh();
    } else {
      toast.error(res.error || "Couldn't delete.");
    }
  };

  return (
    <Card
      title="Quarterly Portfolio Review Notes"
      action={
        <label>
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <span
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-[#FF7553] px-2.5 text-xs font-medium text-[#0F1B2E] hover:bg-[#FF8E72]"
            style={{ opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </span>
        </label>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-xs text-white/40">Loading…</div>
      ) : status ? (
        <div className="rounded-md border border-dashed p-4 text-xs text-white/50" style={{ borderColor: "#1A2B47" }}>{status}</div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-xs text-white/40" style={{ borderColor: "#1A2B47" }}>
          <FileText className="mb-2 h-6 w-6 text-white/20" />
          No review notes uploaded yet. Plain file storage only — nothing is parsed or extracted.
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: "#1A2B47" }}>
              <div>
                <div className="text-sm text-white/90">{d.filename}</div>
                <div className="text-xs text-white/40">{new Date(d.uploaded_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    const url = await getDocumentSignedUrl(d.storage_path);
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                    else toast.error("Couldn't generate a download link.");
                  }}
                  className="text-xs text-white/60 hover:text-[#FF7553]"
                >
                  Download
                </button>
                <button onClick={() => handleDelete(d)} className="text-white/30 hover:text-[#EF4444]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// =================== Meeting Notes ===================

function MeetingNotesTab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const savedNotes = company.meetingNotes || [];
  const [notes, setNotes] = useState<MeetingNote[]>(savedNotes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(company.meetingNotes || []);
    setEditingId(null);
  }, [company.id]);

  const addNote = () => {
    const newNote: MeetingNote = { id: uid("meet"), date: new Date().toISOString().slice(0, 10), notes: "", kpis: [] };
    setNotes((prev) => [newNote, ...prev]);
    setEditingId(newNote.id);
  };
  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    persist(company.id, { meetingNotes: notes.filter((n) => n.id !== id) }, onUpdate);
    if (editingId === id) setEditingId(null);
    toast.success("Meeting note removed.");
  };
  const patchNote = (id: string, k: "date" | "notes", v: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, [k]: v } : n)));

  const addKpi = (noteId: string) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, kpis: [...n.kpis, { label: "", value: "" }] } : n)),
    );
  const removeKpi = (noteId: string, idx: number) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, kpis: n.kpis.filter((_, i) => i !== idx) } : n)),
    );
  const patchKpi = (noteId: string, idx: number, k: "label" | "value", v: string) =>
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, kpis: n.kpis.map((kv, i) => (i === idx ? { ...kv, [k]: v } : kv)) } : n,
      ),
    );

  const save = () => {
    setSaving(true);
    persist(company.id, { meetingNotes: notes }, onUpdate);
    setTimeout(() => setSaving(false), 300);
    setEditingId(null);
    toast.success("Meeting note saved.");
  };

  const cancel = (id: string) => {
    const isNew = !savedNotes.some((n) => n.id === id);
    if (isNew) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } else {
      setNotes(savedNotes);
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={addNote}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs text-white/70 hover:bg-[#1C3151]"
          style={{ borderColor: "#1A2B47" }}
        >
          <Plus className="h-3.5 w-3.5" /> Log Meeting
        </button>
      </div>

      {notes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-sm text-white/40" style={{ borderColor: "#1A2B47" }}>
          No meeting notes logged yet.
        </div>
      )}

      {notes.map((n) => {
        const isEditing = editingId === n.id;
        return (
          <Card
            key={n.id}
            title={formatDate(n.date)}
            action={
              isEditing ? null : (
                <div className="flex items-center gap-2">
                  <EditButton onClick={() => setEditingId(n.id)} />
                  <button onClick={() => removeNote(n.id)} className="text-white/30 hover:text-[#EF4444]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            }
          >
            {!isEditing ? (
              <>
                <div className="mb-3 whitespace-pre-wrap text-sm text-white/80">{n.notes || "—"}</div>
                {n.kpis.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {n.kpis.map((kv, idx) => (
                      <span key={idx} className="rounded px-2 py-1 text-xs" style={{ backgroundColor: "#0F1B2E", color: "#E5E7EB" }}>
                        <span className="text-white/40">{kv.label || "—"}:</span> {kv.value || "—"}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <LabeledInput label="Meeting Date" value={n.date} onChange={(v) => patchNote(n.id, "date", v)} type="date" />
                </div>
                <LabeledTextarea label="Notes" value={n.notes} onChange={(v) => patchNote(n.id, "notes", v)} rows={3} />

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-white/40">KPI Snapshot</span>
                    <button onClick={() => addKpi(n.id)} className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-[#FF7553]">
                      <Plus className="h-3.5 w-3.5" /> Add KPI
                    </button>
                  </div>
                  {n.kpis.length === 0 ? (
                    <div className="text-xs text-white/30">No KPIs recorded for this meeting.</div>
                  ) : (
                    <div className="space-y-2">
                      {n.kpis.map((kv, idx) => (
                        <div key={idx} className="grid grid-cols-12 items-end gap-2">
                          <div className="col-span-5">
                            <input
                              className={inputCls}
                              style={inputStyle}
                              placeholder="Label, e.g. Revenue"
                              value={kv.label}
                              onChange={(e) => patchKpi(n.id, idx, "label", e.target.value)}
                            />
                          </div>
                          <div className="col-span-6">
                            <input
                              className={inputCls}
                              style={inputStyle}
                              placeholder="Value"
                              value={kv.value}
                              onChange={(e) => patchKpi(n.id, idx, "value", e.target.value)}
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button onClick={() => removeKpi(n.id, idx)} className="text-white/30 hover:text-[#EF4444]">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <SaveCancelBar onSave={save} onCancel={() => cancel(n.id)} saving={saving} />
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// =================== DSRA (FD / MF tracking) ===================

const LIEN_STATUS_OPTIONS: LienStatus[] = ["Lien Marked", "Lien Pending", "No Lien"];
const MATURITY_WARNING_DAYS = 7;

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

// Shown at the top of every company page: flags any DSRA instrument on THIS
// company maturing within MATURITY_WARNING_DAYS. Purely client-side, checked
// on page load -- no scheduled job or email involved (per the "in-app only"
// decision), so it only surfaces when someone actually opens the page.
function DSRAMaturityBanner({ company }: { company: Company }) {
  const upcoming = (company.dsra || []).filter((d) => {
    const days = daysUntil(d.maturityDate);
    return days !== null && days >= 0 && days <= MATURITY_WARNING_DAYS;
  });
  if (upcoming.length === 0) return null;
  return (
    <div
      className="mb-6 flex items-start gap-2 rounded-md border p-3 text-sm"
      style={{ borderColor: "#F59E0B40", backgroundColor: "#F59E0B10", color: "#FCD34D" }}
    >
      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">
          {upcoming.length} FD{upcoming.length > 1 ? "s" : ""} maturing within {MATURITY_WARNING_DAYS} days
        </div>
        <div className="text-xs opacity-90">
          {upcoming.map((d) => `${d.bankName} · ${d.fdNumber} (${formatDate(d.maturityDate)})`).join(" · ")}
        </div>
      </div>
    </div>
  );
}

function DSRATab({ company, onUpdate }: { company: Company; onUpdate: (c: Company) => void }) {
  const saved = company.dsra || [];
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<DSRAInstrument[]>(saved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(company.dsra || []);
    setEditing(false);
  }, [company.id]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: uid("dsra"),
        bankName: "",
        fdNumber: "",
        creationDate: "",
        maturityDate: "",
        amount: 0,
        roi: 0,
        lienStatus: "Lien Pending" as LienStatus,
      },
    ]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((d) => d.id !== id));
  const patch = (id: string, k: keyof DSRAInstrument, v: string) =>
    setItems((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, [k]: k === "amount" || k === "roi" ? Number(v) || 0 : v }
          : d,
      ),
    );

  const save = () => {
    setSaving(true);
    persist(company.id, { dsra: items }, onUpdate);
    setTimeout(() => setSaving(false), 300);
    setEditing(false);
    toast.success("DSRA instruments saved.");
  };

  const cancel = () => {
    setItems(company.dsra || []);
    setEditing(false);
  };

  const startEdit = () => {
    setItems(
      company.dsra && company.dsra.length
        ? company.dsra
        : [
            {
              id: uid("dsra"),
              bankName: "",
              fdNumber: "",
              creationDate: "",
              maturityDate: "",
              amount: 0,
              roi: 0,
              lienStatus: "Lien Pending" as LienStatus,
            },
          ],
    );
    setEditing(true);
  };

  const totalAmount = saved.reduce((s, d) => s + (d.amount || 0), 0);

  if (!editing) {
    return (
      <div className="space-y-4">
        <Card title="DSRA Summary" action={saved.length > 0 ? <EditButton onClick={startEdit} /> : null}>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Instruments" value={String(saved.length)} />
            <Field label="Total Amount" value={formatCr(totalAmount / 1e7 < 0.001 ? 0 : totalAmount / 1e7)} />
          </div>
        </Card>

        {saved.length === 0 ? (
          <EmptyState label="No FD / MF instruments recorded yet." onAdd={startEdit} />
        ) : (
          saved.map((d, idx) => {
            const days = daysUntil(d.maturityDate);
            const isUpcoming = days !== null && days >= 0 && days <= MATURITY_WARNING_DAYS;
            return (
              <Card
                key={d.id}
                title={`Instrument ${idx + 1}`}
                action={
                  isUpcoming ? (
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ backgroundColor: "#F59E0B20", color: "#F59E0B" }}>
                      <Clock className="h-3 w-3" /> Maturing in {days}d
                    </span>
                  ) : null
                }
              >
                <div className="grid grid-cols-4 gap-4">
                  <Field label="Bank Name" value={d.bankName} />
                  <Field label="FD Number" value={d.fdNumber} />
                  <Field label="Creation Date" value={formatDate(d.creationDate)} />
                  <Field label="Maturity Date" value={formatDate(d.maturityDate)} />
                  <Field label="Amount (₹)" value={d.amount ? d.amount.toLocaleString("en-IN") : "—"} />
                  <Field label="ROI (% p.a.)" value={d.roi || "—"} />
                  <Field label="Lien Status" value={d.lienStatus} />
                </div>
                {d.notes && (
                  <div className="mt-4">
                    <Field label="Notes" value={d.notes} />
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((d, idx) => {
        const days = daysUntil(d.maturityDate);
        const isUpcoming = days !== null && days >= 0 && days <= MATURITY_WARNING_DAYS;
        return (
          <Card
            key={d.id}
            title={`Instrument ${idx + 1}`}
            action={
              <div className="flex items-center gap-2">
                {isUpcoming && (
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide" style={{ backgroundColor: "#F59E0B20", color: "#F59E0B" }}>
                    <Clock className="h-3 w-3" /> Maturing in {days}d
                  </span>
                )}
                <button onClick={() => removeItem(d.id)} className="text-white/30 hover:text-[#EF4444]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-4 gap-4">
              <LabeledInput label="Bank Name" value={d.bankName} onChange={(v) => patch(d.id, "bankName", v)} />
              <LabeledInput label="FD Number" value={d.fdNumber} onChange={(v) => patch(d.id, "fdNumber", v)} />
              <LabeledInput label="Creation Date" value={d.creationDate} onChange={(v) => patch(d.id, "creationDate", v)} type="date" />
              <LabeledInput label="Maturity Date" value={d.maturityDate} onChange={(v) => patch(d.id, "maturityDate", v)} type="date" />
              <LabeledInput label="Amount (₹)" value={d.amount || ""} onChange={(v) => patch(d.id, "amount", v)} type="number" />
              <LabeledInput label="ROI (% p.a.)" value={d.roi || ""} onChange={(v) => patch(d.id, "roi", v)} type="number" />
              <LabeledSelect label="Lien Status" value={d.lienStatus} onChange={(v) => patch(d.id, "lienStatus", v)} options={LIEN_STATUS_OPTIONS} />
            </div>
            <div className="mt-4">
              <LabeledTextarea label="Notes" value={d.notes || ""} onChange={(v) => patch(d.id, "notes", v)} rows={2} />
            </div>
          </Card>
        );
      })}

      <div className="flex items-center justify-between">
        <button
          onClick={addItem}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs text-white/70 hover:bg-[#1C3151]"
          style={{ borderColor: "#1A2B47" }}
        >
          <Plus className="h-3.5 w-3.5" /> Add Instrument
        </button>
        <SaveCancelBar onSave={save} onCancel={cancel} saving={saving} />
      </div>
    </div>
  );
}

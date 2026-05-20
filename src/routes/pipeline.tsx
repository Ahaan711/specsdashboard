import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, GitMerge } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline Tracker — PortfolioOS" },
      {
        name: "description",
        content:
          "New deal origination, stage tracking and deal scoring for the SpECS Fund pipeline.",
      },
    ],
  }),
  component: PipelinePage,
});

const STAGES = [
  "Origination",
  "Initial Screen",
  "Pre-DD",
  "Term Sheet",
  "Legal & Docs",
  "Closed",
  "Passed",
] as const;

const SECTORS = [
  "NBFC",
  "Renewable Energy",
  "Solar Mfg",
  "rPET",
  "Infrastructure",
  "Manufacturing",
  "Other",
] as const;

const INSTRUMENTS = ["NCD", "CCD", "Equity", "Senior Secured", "Structured"] as const;

const SECTOR_COLORS: Record<string, string> = {
  NBFC: "#3B82F6",
  "Renewable Energy": "#10B981",
  "Solar Mfg": "#22C55E",
  rPET: "#06B6D4",
  Infrastructure: "#A855F7",
  Manufacturing: "#F59E0B",
  Other: "#64748B",
};

type Stage = (typeof STAGES)[number];

type Deal = {
  id: string;
  company_name: string;
  sector: string;
  deal_size_cr: number;
  instrument_type: string;
  stage: Stage;
  analyst: string;
  source: string;
  expected_close_date: string;
  notes: string;
  stage_entered_at: string;
  created_at: string;
};

const STORAGE_KEY = "pipeline_deals_v1";

function loadDeals(): Deal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Deal[]) : [];
  } catch {
    return [];
  }
}

function saveDeals(deals: Deal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

function initials(name: string) {
  if (!name) return "—";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function daysSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const emptyForm = {
  company_name: "",
  sector: "Other",
  deal_size_cr: "",
  instrument_type: "NCD",
  stage: "Origination" as Stage,
  analyst: "",
  source: "",
  expected_close_date: "",
  notes: "",
};

function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setDeals(loadDeals());
  }, []);

  const stats = useMemo(() => {
    const total = deals.length;
    const value = deals.reduce((s, d) => s + Number(d.deal_size_cr || 0), 0);
    const avg = total ? value / total : 0;
    const closedThisQ = deals.filter((d) => {
      if (d.stage !== "Closed") return false;
      const dt = new Date(d.stage_entered_at);
      const now = new Date();
      const q = (m: number) => Math.floor(m / 3);
      return (
        dt.getFullYear() === now.getFullYear() &&
        q(dt.getMonth()) === q(now.getMonth())
      );
    }).length;
    return { total, value, avg, closedThisQ };
  }, [deals]);

  const byStage = useMemo(() => {
    const m = new Map<Stage, Deal[]>();
    STAGES.forEach((s) => m.set(s, []));
    deals.forEach((d) => m.get(d.stage)?.push(d));
    return m;
  }, [deals]);

  function handleSave() {
    if (!form.company_name.trim()) return;
    const now = new Date().toISOString();
    const newDeal: Deal = {
      id: crypto.randomUUID(),
      company_name: form.company_name.trim(),
      sector: form.sector,
      deal_size_cr: Number(form.deal_size_cr || 0),
      instrument_type: form.instrument_type,
      stage: form.stage,
      analyst: form.analyst.trim(),
      source: form.source.trim(),
      expected_close_date: form.expected_close_date,
      notes: form.notes.trim(),
      stage_entered_at: now,
      created_at: now,
    };
    const next = [newDeal, ...deals];
    setDeals(next);
    saveDeals(next);
    setForm({ ...emptyForm });
    setOpen(false);
  }

  function moveDeal(id: string, stage: Stage) {
    const next = deals.map((d) =>
      d.id === id
        ? { ...d, stage, stage_entered_at: new Date().toISOString() }
        : d,
    );
    setDeals(next);
    saveDeals(next);
  }

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: "#0A0C10" }}>
      {/* Sidebar */}
      <aside
        className="flex w-56 shrink-0 flex-col"
        style={{ backgroundColor: "#0C0E13", borderRight: "1px solid #1E2229" }}
      >
        <div className="px-4 py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-[#C9A84C]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
        <div className="px-4 pb-4">
          <div
            className="flex items-center gap-2 text-base font-medium"
            style={{ color: "#C9A84C" }}
          >
            <GitMerge className="h-4 w-4" />
            Pipeline
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {[
            { label: "Dashboard", active: true },
            { label: "Deals" },
            { label: "Scoring" },
            { label: "Reports" },
          ].map((item) => (
            <button
              key={item.label}
              className="rounded px-3 py-2 text-left text-sm transition-colors"
              style={{
                color: item.active ? "#fff" : "rgba(255,255,255,0.55)",
                backgroundColor: item.active ? "#16191F" : "transparent",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-auto">
        <div className="flex items-center justify-between px-8 py-6">
          <div>
            <h1 className="text-2xl font-light text-white">Pipeline Dashboard</h1>
            <p className="mt-1 text-xs text-white/40">
              Drag deal cards between stages to update status
            </p>
          </div>
          <Button
            onClick={() => setOpen(true)}
            style={{ backgroundColor: "#C9A84C", color: "#0A0C10" }}
            className="hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add New Deal
          </Button>
        </div>

        {/* Stat bar */}
        <div className="grid grid-cols-2 gap-3 px-8 md:grid-cols-4">
          <Stat label="Total Deals in Pipeline" value={String(stats.total)} />
          <Stat label="Total Deal Value" value={`₹${stats.value.toFixed(1)} Cr`} />
          <Stat label="Avg Deal Size" value={`₹${stats.avg.toFixed(1)} Cr`} />
          <Stat
            label="Deals Closed This Quarter"
            value={String(stats.closedThisQ)}
          />
        </div>

        {/* Kanban */}
        <div className="flex gap-3 overflow-x-auto px-8 py-6">
          {STAGES.map((stage) => {
            const items = byStage.get(stage) ?? [];
            return (
              <div
                key={stage}
                className="flex w-72 shrink-0 flex-col rounded-md"
                style={{
                  backgroundColor: "#0E1117",
                  border: "1px solid #1E2229",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) {
                    moveDeal(dragId, stage);
                    setDragId(null);
                  }
                }}
              >
                <div
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: "1px solid #1E2229" }}
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-white/70">
                    {stage}
                  </span>
                  <span className="text-xs text-white/40">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2 p-2">
                  {items.map((d) => {
                    const days = daysSince(d.stage_entered_at);
                    const stale = days > 30;
                    return (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={() => setDragId(d.id)}
                        onDragEnd={() => setDragId(null)}
                        className="cursor-grab rounded p-3 transition-colors active:cursor-grabbing"
                        style={{
                          backgroundColor: "#14171D",
                          border: "1px solid #1E2229",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium text-white">
                            {d.company_name}
                          </div>
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                            style={{
                              backgroundColor: "rgba(201,168,76,0.15)",
                              color: "#C9A84C",
                            }}
                            title={d.analyst || "Unassigned"}
                          >
                            {initials(d.analyst)}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${SECTOR_COLORS[d.sector] || "#64748B"}22`,
                              color: SECTOR_COLORS[d.sector] || "#94A3B8",
                            }}
                          >
                            {d.sector}
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] text-white/60"
                            style={{ backgroundColor: "#1E2229" }}
                          >
                            {d.instrument_type}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-white/80">
                            ₹{d.deal_size_cr} Cr
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px]"
                            style={{
                              backgroundColor: stale
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(255,255,255,0.05)",
                              color: stale ? "#F87171" : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {days}d
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="px-2 py-6 text-center text-[11px] text-white/30">
                      Drop deals here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Add Deal Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ backgroundColor: "#111318", border: "1px solid #1E2229", color: "#fff" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">Add New Deal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Company Name">
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="bg-[#0E1117] border-[#1E2229] text-white"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sector">
                <Select
                  value={form.sector}
                  onValueChange={(v) => setForm({ ...form, sector: v })}
                >
                  <SelectTrigger className="bg-[#0E1117] border-[#1E2229] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Deal Size (₹ Cr)">
                <Input
                  type="number"
                  value={form.deal_size_cr}
                  onChange={(e) => setForm({ ...form, deal_size_cr: e.target.value })}
                  className="bg-[#0E1117] border-[#1E2229] text-white"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Instrument">
                <Select
                  value={form.instrument_type}
                  onValueChange={(v) => setForm({ ...form, instrument_type: v })}
                >
                  <SelectTrigger className="bg-[#0E1117] border-[#1E2229] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Stage">
                <Select
                  value={form.stage}
                  onValueChange={(v) => setForm({ ...form, stage: v as Stage })}
                >
                  <SelectTrigger className="bg-[#0E1117] border-[#1E2229] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assigned Analyst">
                <Input
                  value={form.analyst}
                  onChange={(e) => setForm({ ...form, analyst: e.target.value })}
                  className="bg-[#0E1117] border-[#1E2229] text-white"
                />
              </Field>
              <Field label="Source">
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="bg-[#0E1117] border-[#1E2229] text-white"
                />
              </Field>
            </div>
            <Field label="Expected Close Date">
              <Input
                type="date"
                value={form.expected_close_date}
                onChange={(e) =>
                  setForm({ ...form, expected_close_date: e.target.value })
                }
                className="bg-[#0E1117] border-[#1E2229] text-white"
              />
            </Field>
            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-[#0E1117] border-[#1E2229] text-white"
                rows={3}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-white/70">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              style={{ backgroundColor: "#C9A84C", color: "#0A0C10" }}
              className="hover:opacity-90"
            >
              Save Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md p-4"
      style={{ backgroundColor: "#0E1117", border: "1px solid #1E2229" }}
    >
      <div className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-1 text-xl font-medium text-white">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-white/60">{label}</span>
      {children}
    </label>
  );
}

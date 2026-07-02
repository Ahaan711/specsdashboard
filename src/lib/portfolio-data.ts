// Portfolio data: seed companies, localStorage persistence, types.
// Switched to localStorage because Lovable Cloud has been intermittent.
// Migrate to Supabase later by swapping the load/save helpers only.

export type CompanyStatus = "Active" | "Watch" | "Exit" | "Pipeline";
export type InvestmentType =
  | "NCD"
  | "CCD"
  | "Equity"
  | "Structured Equity"
  | "Senior Secured"
  | "Structured";

export type Sector =
  | "NBFC"
  | "Renewable Energy"
  | "Solar PV Mfg"
  | "rPET Recycling"
  | "AIF"
  | "Manufacturing"
  | "Infrastructure"
  | "Other";

export type KeyPerson = { name: string; designation: string };

export type CovenantItem = {
  id: string;
  text: string;
  type?: "financial" | "affirmative" | "negative";
  threshold?: string;
};

// One security package (a company may have several — e.g. first charge on
// receivables, second charge on fixed assets — each tracked independently).
export type SecurityStatus = "Pending" | "In Process" | "Perfected";
export type SecurityItem = {
  id: string;
  collateral?: string;
  charge?: string;
  coverage?: string;
  guarantors?: string;
  valuation?: string;
  status: SecurityStatus;
  notes?: string;
};

// Conditions Precedent / Conditions Subsequent tracker. "Overdue" is not
// stored — it's derived from dueDate vs. today wherever this is displayed,
// so status never goes stale just from time passing.
export type CPCSStatus = "Pending" | "Completed";
export type CPCSItem = {
  id: string;
  kind: "CP" | "CS";
  description: string;
  dueDate?: string; // ISO
  status: CPCSStatus;
  completedAt?: string; // ISO, set when marked Completed
  notes?: string;
};

// A dated compliance check against one of the covenants defined in
// TermSheetData.covenants. Manually logged each review period, replacing the
// old AI/MIS-upload breach detection.
export type CovenantComplianceStatus = "Compliant" | "Breach" | "Not Tested";
export type CovenantComplianceEntry = {
  id: string;
  covenantId: string; // references CovenantItem.id
  period: string; // e.g. "Q3 FY26"
  status: CovenantComplianceStatus;
  note?: string;
  recordedAt: string; // ISO
};

export type MeetingNote = {
  id: string;
  date: string; // ISO
  notes: string;
  kpis: { label: string; value: string }[]; // flexible, differs per meeting
};

export type LienStatus = "Lien Marked" | "Lien Pending" | "No Lien";
export type DSRAInstrument = {
  id: string;
  bankName: string;
  fdNumber: string;
  creationDate: string; // ISO
  maturityDate: string; // ISO
  amount: number; // ₹
  roi: number; // % p.a.
  lienStatus: LienStatus;
  notes?: string;
};

export type TermSheetData = {
  issuer?: string;
  instrument?: string;
  issueSize?: string;
  coupon?: string;
  tenor?: string;
  repayment?: string;
  covenants?: CovenantItem[] | string[]; // back-compat
  putCall?: string;
  closingDate?: string;
};

// Normalize covenants from either legacy string[] or new CovenantItem[]
export function normalizeCovenants(
  cov: CovenantItem[] | string[] | undefined,
): CovenantItem[] {
  if (!cov) return [];
  return cov.map((c, i) =>
    typeof c === "string"
      ? { id: `cov-${i}`, text: c, type: "affirmative" as const }
      : c,
  );
}

export type Company = {
  id: string;
  name: string;
  cin?: string;
  address?: string;
  website?: string;
  sector: Sector;
  subSector?: string;
  description?: string;
  keyPeople: KeyPerson[];
  shareholding?: { promoter?: number; institutional?: number; public?: number };
  investmentType: InvestmentType;
  exposureCr: number;
  entryDate: string; // ISO
  tenor?: string;
  maturityDate?: string;
  status: CompanyStatus;
  watchReason?: string;
  termSheet?: TermSheetData;
  security?: SecurityItem[];
  cpCsItems?: CPCSItem[];
  covenantCompliance?: CovenantComplianceEntry[];
  meetingNotes?: MeetingNote[];
  dsra?: DSRAInstrument[];
};

const STORAGE_KEY = "portfolio_companies_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadCompanies(): Company[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Company[];
  } catch {
    return [];
  }
}

export function saveCompanies(list: Company[]) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addCompany(company: Company) {
  const list = loadCompanies();
  const next = [...list, company];
  saveCompanies(next);
  return company;
}

export function getCompany(id: string): Company | undefined {
  return loadCompanies().find((c) => c.id === id);
}

export function updateCompany(id: string, patch: Partial<Company>) {
  const list = loadCompanies();
  const next = list.map((c) => (c.id === id ? { ...c, ...patch } : c));
  saveCompanies(next);
  return next.find((c) => c.id === id);
}

export const SECTOR_COLORS: Record<Sector, string> = {
  NBFC: "#3B82F6",
  "Renewable Energy": "#10B981",
  "Solar PV Mfg": "#22C55E",
  "rPET Recycling": "#06B6D4",
  AIF: "#A855F7",
  Manufacturing: "#F59E0B",
  Infrastructure: "#8B5CF6",
  Other: "#64748B",
};

export const STATUS_COLORS: Record<CompanyStatus, string> = {
  Active: "#22C55E",
  Watch: "#EF4444",
  Exit: "#94A3B8",
  Pipeline: "#F59E0B",
};

export function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export function formatCr(n: number) {
  return `₹ ${n.toLocaleString("en-IN")} Cr`;
}

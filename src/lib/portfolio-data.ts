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

const SEED: Company[] = [
  {
    id: "moneyview",
    name: "Moneyview",
    cin: "U65999KA2014PTC076027",
    website: "https://moneyview.in",
    sector: "NBFC",
    subSector: "Personal Loans",
    description:
      "Digital-first consumer lending NBFC offering personal loans, BNPL and credit-line products via app. Backed by Tiger Global and Accel.",
    keyPeople: [
      { name: "Puneet Agarwal", designation: "Founder & CEO" },
      { name: "Sanjay Aggarwal", designation: "Co-Founder" },
    ],
    shareholding: { promoter: 22, institutional: 70, public: 8 },
    investmentType: "NCD",
    exposureCr: 100,
    entryDate: "2024-03-15",
    tenor: "36 months",
    maturityDate: "2027-03-15",
    status: "Active",
  },
  {
    id: "gps-renewables",
    name: "GPS Renewables",
    cin: "U40300KA2012PTC067244",
    website: "https://gpsrenewables.com",
    sector: "Renewable Energy",
    subSector: "Bio-CNG",
    description:
      "India's largest bio-CNG plant developer & operator. Builds compressed biogas plants for municipal and agri-waste.",
    keyPeople: [
      { name: "Mainak Chakraborty", designation: "Co-Founder & CEO" },
      { name: "Sreekrishna Sankar", designation: "Co-Founder & COO" },
    ],
    shareholding: { promoter: 41, institutional: 55, public: 4 },
    investmentType: "Senior Secured",
    exposureCr: 75,
    entryDate: "2024-08-20",
    tenor: "48 months",
    maturityDate: "2028-08-20",
    status: "Watch",
    watchReason:
      "Q3 plant utilisation dropped to 68% (vs 82% covenant floor). Awaiting operations note from CFO.",
  },
  {
    id: "kreditbee",
    name: "KreditBee",
    cin: "U65929KA2018PTC110237",
    website: "https://kreditbee.in",
    sector: "NBFC",
    subSector: "Digital Lending",
    description:
      "Digital lending NBFC focused on young professionals. Disburses personal loans via mobile app; backed by Premji Invest, Mitsubishi UFJ.",
    keyPeople: [
      { name: "Madhusudan Ekambaram", designation: "Co-Founder & CEO" },
      { name: "Karthikeyan K", designation: "Co-Founder & CTO" },
    ],
    shareholding: { promoter: 18, institutional: 76, public: 6 },
    investmentType: "NCD",
    exposureCr: 150,
    entryDate: "2023-11-10",
    tenor: "30 months",
    maturityDate: "2026-05-10",
    status: "Active",
  },
  {
    id: "solex-energy",
    name: "Solex Energy",
    cin: "L40108GJ1995PLC024633",
    website: "https://solexenergy.in",
    sector: "Solar PV Mfg",
    subSector: "Solar Modules",
    description:
      "Listed solar PV module manufacturer based in Gujarat. Capacity ~1.5 GW across mono PERC, TOPCon. Exports to MENA & Europe.",
    keyPeople: [
      { name: "Chetan Shah", designation: "Chairman & MD" },
      { name: "Vidushi Shah", designation: "CFO" },
    ],
    shareholding: { promoter: 58, institutional: 14, public: 28 },
    investmentType: "Structured Equity",
    exposureCr: 50,
    entryDate: "2025-01-25",
    tenor: "60 months",
    maturityDate: "2030-01-25",
    status: "Active",
  },
  {
    id: "srichakra-polyplast",
    name: "Srichakra Polyplast",
    cin: "U25209TG2011PTC076889",
    website: "https://srichakrapolyplast.com",
    sector: "rPET Recycling",
    subSector: "Food-grade rPET",
    description:
      "Food-grade rPET (recycled PET) producer. Supplies bottle-grade resin to FMCG majors. Capacity expansion underway.",
    keyPeople: [
      { name: "K. Ravi Kumar", designation: "Managing Director" },
      { name: "Lakshmi Narayanan", designation: "Director - Finance" },
    ],
    shareholding: { promoter: 72, institutional: 20, public: 8 },
    investmentType: "Equity",
    exposureCr: 30,
    entryDate: "2026-04-10",
    tenor: "60 months",
    maturityDate: "2031-04-10",
    status: "Pipeline",
  },
  {
    id: "alpha-alternatives",
    name: "Alpha Alternatives Holdings",
    cin: "U67100MH2017PTC298811",
    website: "https://alphaalternatives.in",
    sector: "AIF",
    subSector: "Multi-Strategy AIF",
    description:
      "Mumbai-based alternative asset manager. Runs long-short, structured credit, infra debt strategies. AUM ~₹ 24,000 Cr.",
    keyPeople: [
      { name: "Naresh Kothari", designation: "Founder & CEO" },
      { name: "Mukul Garg", designation: "CIO" },
    ],
    shareholding: { promoter: 51, institutional: 49 },
    investmentType: "NCD",
    exposureCr: 150,
    entryDate: "2024-06-05",
    tenor: "42 months",
    maturityDate: "2027-12-05",
    status: "Active",
  },
];

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadCompanies(): Company[] {
  if (!isBrowser()) return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Company[];
  } catch {
    return SEED;
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

export function resetSeed() {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
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

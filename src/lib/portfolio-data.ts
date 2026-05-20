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

export type TermSheetData = {
  issuer?: string;
  instrument?: string;
  issueSize?: string;
  coupon?: string;
  tenor?: string;
  security?: string;
  repayment?: string;
  covenants?: string[];
  putCall?: string;
  conditionsPrecedent?: string;
  closingDate?: string;
  risks?: string[];
};

export type PreDDData = {
  snapshot?: string;
  thesis?: string;
  structure?: string;
  risks?: string[];
  redFlags?: string[];
  nextSteps?: string[];
  analyst?: string;
  date?: string;
  checklist?: { item: string; done: boolean }[];
};

export type LiveFinancials = {
  revenue?: string;
  ebitda?: string;
  pat?: string;
  debt?: string;
  netWorth?: string;
  ratios?: { label: string; value: string }[];
  rating?: { agency: string; rating: string; outlook?: string };
  stockPrice?: string;
  news?: { title: string; source: string; date: string }[];
  updatedAt?: string;
};

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
  preDD?: PreDDData;
  liveData?: LiveFinancials;
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
    liveData: {
      revenue: "₹ 612 Cr",
      ebitda: "₹ 178 Cr",
      pat: "₹ 92 Cr",
      debt: "₹ 1,840 Cr",
      netWorth: "₹ 920 Cr",
      ratios: [
        { label: "D/E", value: "2.0x" },
        { label: "NIM", value: "11.8%" },
        { label: "GNPA", value: "2.1%" },
        { label: "ROA", value: "4.6%" },
      ],
      rating: { agency: "CRISIL", rating: "A-", outlook: "Stable" },
      updatedAt: new Date().toISOString(),
    },
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
    liveData: {
      revenue: "₹ 184 Cr",
      ebitda: "₹ 41 Cr",
      pat: "₹ 12 Cr",
      debt: "₹ 320 Cr",
      netWorth: "₹ 210 Cr",
      ratios: [
        { label: "DSCR", value: "1.18x" },
        { label: "D/E", value: "1.5x" },
        { label: "Plant CUF", value: "68%" },
      ],
      rating: { agency: "ICRA", rating: "BBB+", outlook: "Negative" },
      updatedAt: new Date().toISOString(),
    },
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
    liveData: {
      revenue: "₹ 1,348 Cr",
      ebitda: "₹ 412 Cr",
      pat: "₹ 218 Cr",
      debt: "₹ 4,200 Cr",
      netWorth: "₹ 1,650 Cr",
      ratios: [
        { label: "D/E", value: "2.5x" },
        { label: "NIM", value: "13.4%" },
        { label: "GNPA", value: "1.7%" },
        { label: "ROA", value: "5.2%" },
      ],
      rating: { agency: "CARE", rating: "A", outlook: "Stable" },
      updatedAt: new Date().toISOString(),
    },
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
    liveData: {
      revenue: "₹ 532 Cr",
      ebitda: "₹ 84 Cr",
      pat: "₹ 41 Cr",
      debt: "₹ 180 Cr",
      netWorth: "₹ 295 Cr",
      ratios: [
        { label: "Capacity Util.", value: "78%" },
        { label: "D/E", value: "0.6x" },
        { label: "EBITDA Margin", value: "15.8%" },
      ],
      rating: { agency: "CRISIL", rating: "A-", outlook: "Positive" },
      stockPrice: "₹ 1,842",
      updatedAt: new Date().toISOString(),
    },
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
    liveData: {
      revenue: "₹ 142 Cr",
      ebitda: "₹ 28 Cr",
      pat: "₹ 9 Cr",
      debt: "₹ 60 Cr",
      netWorth: "₹ 78 Cr",
      ratios: [
        { label: "Capacity Util.", value: "62%" },
        { label: "D/E", value: "0.8x" },
        { label: "EBITDA Margin", value: "19.7%" },
      ],
      updatedAt: new Date().toISOString(),
    },
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
    liveData: {
      revenue: "₹ 488 Cr",
      ebitda: "₹ 196 Cr",
      pat: "₹ 122 Cr",
      debt: "₹ 1,100 Cr",
      netWorth: "₹ 1,420 Cr",
      ratios: [
        { label: "AUM", value: "₹ 24,000 Cr" },
        { label: "D/E", value: "0.77x" },
        { label: "ROE", value: "8.6%" },
      ],
      rating: { agency: "ICRA", rating: "A+", outlook: "Stable" },
      updatedAt: new Date().toISOString(),
    },
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

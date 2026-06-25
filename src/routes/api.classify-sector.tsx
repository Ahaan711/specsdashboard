import { createFileRoute } from "@tanstack/react-router";

// Keep this list identical to the `Sector` union in src/lib/portfolio-data.ts.
// (The old version of this file had its own, completely different sector
// list that didn't match the app's actual data model — fixed here too.)
const SECTORS = [
  "NBFC",
  "Renewable Energy",
  "Solar PV Mfg",
  "rPET Recycling",
  "AIF",
  "Manufacturing",
  "Infrastructure",
  "Other",
] as const;

type Sector = (typeof SECTORS)[number];
type Confidence = "high" | "low";

// Deterministic keyword classifier — no external AI call.
//
// The previous version called Lovable's AI gateway (ai.gateway.lovable.dev)
// using process.env.LOVABLE_API_KEY. That key is auto-injected only inside
// Lovable's own hosting; it was never set anywhere on Netlify, so apiKey was
// always undefined and this route 500'd on every request. This has zero
// external dependency, so it works identically on Netlify, Lovable, or
// anywhere else. `confidence` is "low" for the fallback bucket so the UI can
// flag it for manual review.
//
// `whole` keywords match as a whole word only (avoids e.g. "aif" matching
// inside "Saify"). `stem` keywords match as a plain substring, intentionally,
// so "manufactur" also catches "Manufacturing" / "Manufacturers" / etc.
const RULES: Array<{ sector: Sector; whole?: string[]; stem?: string[] }> = [
  { sector: "Solar PV Mfg", whole: ["pv"], stem: ["solar", "photovoltaic", "module manufactur"] },
  { sector: "rPET Recycling", stem: ["rpet", "r-pet", "recycl"] },
  {
    sector: "Renewable Energy",
    stem: ["renewable", "wind energy", "wind power", "hydro power", "green energy", "clean energy"],
  },
  {
    sector: "NBFC",
    whole: ["nbfc"],
    stem: ["financ", "microfinance", "housing finance", "leasing", "lending", "credit"],
  },
  { sector: "AIF", whole: ["aif"], stem: ["alternative investment fund"] },
  {
    sector: "Infrastructure",
    whole: ["ports"],
    stem: ["infra", "logistics", "highway", "warehous", "transport", "supply chain", "roadways"],
  },
  {
    sector: "Manufacturing",
    stem: [
      "manufactur", "industries", "industrial", "engineering", "mills",
      "steel", "cement", "textile", "chemicals", "petroleum", "lubricant",
      "plastics", "auto components", "pharma", "fmcg", "foods", "agro",
    ],
  },
];

function matchesWhole(name: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(name);
}

function classify(company: string): { sector: Sector; confidence: Confidence } {
  const name = company.toLowerCase();
  for (const rule of RULES) {
    const wholeHit = rule.whole?.some((kw) => matchesWhole(name, kw));
    const stemHit = rule.stem?.some((kw) => name.includes(kw));
    if (wholeHit || stemHit) {
      return { sector: rule.sector, confidence: "high" };
    }
  }
  return { sector: "Other", confidence: "low" };
}

export const Route = createFileRoute("/api/classify-sector")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "content-type, authorization",
          "Content-Type": "application/json",
        };
        try {
          const { company } = (await request.json()) as { company?: string };
          if (!company || !company.trim()) {
            return new Response(JSON.stringify({ error: "company is required" }), {
              status: 400,
              headers: cors,
            });
          }
          if (company.length > 200) {
            return new Response(JSON.stringify({ error: "company name too long (max 200 chars)" }), {
              status: 400,
              headers: cors,
            });
          }

          const result = classify(company.trim());
          return new Response(JSON.stringify(result), { headers: cors });
        } catch (e) {
          console.error("classify-sector error:", e);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: cors },
          );
        }
      },
    },
  },
});

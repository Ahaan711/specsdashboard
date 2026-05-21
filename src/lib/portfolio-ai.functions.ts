// Server function: send extracted PDF text to Lovable AI Gateway and return structured JSON.
// Used for term-sheet parsing, pre-DD parsing, and risk flagging.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(20).max(120_000),
  mode: z.enum(["termsheet", "predd", "risks", "mis"]),
  context: z.string().max(40_000).optional(),
});

type Mode = z.infer<typeof InputSchema>["mode"];

const PROMPTS: Record<
  Mode,
  { system: string; user: (t: string, ctx?: string) => string }
> = {
  termsheet: {
    system:
      "You are a private-credit analyst assistant. Extract structured fields from term sheets. Always reply with ONLY valid JSON (no markdown fences, no commentary).",
    user: (t) => `Extract the following fields from this term sheet text.
Return JSON with this shape:
{
  "issuer": string,
  "instrument": string,
  "issueSize": string,
  "coupon": string,
  "tenor": string,
  "security": string,
  "repayment": string,
  "covenants": [{
    "id": string (e.g. "cov-1"),
    "text": string,
    "type": "financial" | "affirmative" | "negative",
    "threshold": string (numeric threshold or trigger, if any)
  }],
  "securityDetail": {
    "collateral": string,
    "charge": string (first/second/pari-passu/exclusive),
    "coverage": string (e.g. "2.0x asset cover"),
    "guarantors": string,
    "valuation": string,
    "perfectionStatus": string
  },
  "escrow": {
    "bank": string,
    "account": string,
    "triggerEvents": string,
    "waterfall": [{ "step": number, "label": string, "description": string }]
      (ordered cash-flow waterfall: typical order is Inflows > Reserve/DSRA > Interest > Principal > Surplus to borrower)
  },
  "putCall": string,
  "conditionsPrecedent": string,
  "closingDate": string,
  "risks": string[] (3-5 key credit risks you infer)
}
If a field is missing, return an empty string or empty array. Use INR/₹ formatting where applicable.

TERM SHEET:
${t.slice(0, 80000)}`,
  },
  predd: {
    system:
      "You are a private-credit analyst assistant. Extract structured sections from pre-DD memos. Always reply with ONLY valid JSON (no markdown fences, no commentary).",
    user: (t) => `Extract the following fields from this Pre-DD note text.
Return JSON with this shape:
{
  "snapshot": string,
  "thesis": string,
  "structure": string,
  "risks": string[],
  "redFlags": string[],
  "nextSteps": string[],
  "analyst": string,
  "date": string,
  "checklist": [{"item": string, "done": false}] (auto-generate 8-12 DD checklist items)
}
If a field is missing, return empty string or empty array.

PRE-DD NOTE:
${t.slice(0, 80000)}`,
  },
  risks: {
    system:
      "You are a private-credit analyst. Identify 3-5 key credit risks. Reply with ONLY valid JSON.",
    user: (t) => `Identify 3-5 key credit risks in this document.
Return JSON: { "risks": string[] }

DOCUMENT:
${t.slice(0, 60000)}`,
  },
  mis: {
    system:
      "You are a private-credit monitoring analyst. Compare the company's latest MIS (Management Information System) report against the agreed term-sheet covenants, security and escrow waterfall. Identify breaches. Always reply with ONLY valid JSON (no markdown fences, no commentary).",
    user: (t, ctx) => `You are given (A) the structured term-sheet obligations and (B) the latest MIS report text.
Check whether the company is complying with each covenant, the security/collateral arrangement, and the escrow waterfall. Identify any breach.

Return JSON with this exact shape:
{
  "period": string (reporting period inferred from MIS, e.g. "Q3 FY25" or "Sep-2025"),
  "breachDetected": boolean,
  "aiSummary": string (1-2 sentences plain-English summary of compliance status),
  "suggestedWatchReason": string (if breachDetected, a concise reason suitable for the watchlist; else ""),
  "findings": [
    {
      "key": string (use covenant.id for covenants like "cov-1"; use "security.<field>" for security; use "escrow.step.<n>" for waterfall steps),
      "label": string (human-readable label of what was checked),
      "status": "pass" | "breach" | "unknown",
      "note": string (1 line explaining why),
      "actualValue": string (observed value from MIS if applicable)
    }
  ]
}

(A) TERM-SHEET OBLIGATIONS (JSON):
${ctx ?? "{}"}

(B) MIS REPORT TEXT:
${t.slice(0, 70000)}`,
  },
};



export const parseDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "LOVABLE_API_KEY is not configured.",
      };
    }

    const prompt = PROMPTS[data.mode];

    try {
      const res = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              { role: "system", content: prompt.system },
              { role: "user", content: prompt.user(data.text) },
            ],
            response_format: { type: "json_object" },
          }),
        },
      );

      if (res.status === 429) {
        return { ok: false as const, error: "Rate limit exceeded. Try again in a moment." };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "AI credits exhausted. Add credits in Settings → Usage." };
      }
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false as const, error: `AI gateway error (${res.status}): ${txt.slice(0, 200)}` };
      }

      const json = await res.json();
      const content: string = json.choices?.[0]?.message?.content ?? "{}";
      // Strip accidental markdown fences if any
      const cleaned = content
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();
      let parsed: Record<string, never>;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return { ok: false as const, error: "Model returned non-JSON output." };
      }
      return { ok: true as const, data: parsed };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false as const, error: msg };
    }
  });

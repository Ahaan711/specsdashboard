// Summarize a credit rating rationale OR a Pre-DD note using Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, fileName, company, kind } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const snippet = text.slice(0, 18000);

    const isPreDD = kind === "pre-dd";
    const systemPrompt = isPreDD
      ? "You summarize Pre-Due-Diligence (Pre-DD) notes prepared by private credit fund analysts in India. Produce a tight, scannable summary for an investment committee. Use the exact section headers provided. Be specific with numbers, ratios, dates, deal terms. No fluff."
      : "You summarize Indian credit rating rationale documents (CRISIL, ICRA, CARE, India Ratings, Brickwork, Acuite). Produce a tight, scannable summary for a private credit fund manager. Use the exact section headers provided. Be specific with numbers, ratios, dates. No fluff.";

    const userPrompt = isPreDD
      ? `Company: ${company || "(unknown)"}\nFile: ${fileName || "pre-dd-note"}\n\nSummarize under these sections (markdown):\n**Deal Snapshot** — borrower, sector, ticket size, structure, tenor, indicative pricing.\n**Investment Thesis** — 3-5 bullets on why this deal is attractive.\n**Key Risks & Mitigants** — 3-5 bullets pairing each risk with the mitigant.\n**Financial Snapshot** — revenue, EBITDA margin, leverage (Debt/EBITDA), interest cover, cash flows, liquidity.\n**Security & Covenants** — collateral, cover, key covenants.\n**Open Items / Next Steps for Full DD** — what still needs to be validated.\n**Recommendation** — proceed to full DD / pass / conditional.\n\nDocument:\n${snippet}`
      : `Company: ${company || "(unknown)"}\nFile: ${fileName || "rationale"}\n\nSummarize under these sections (markdown):\n**Rating & Outlook** — agency, rating, outlook, prior action.\n**Key Strengths** — 3-5 bullets.\n**Key Weaknesses / Concerns** — 3-5 bullets.\n**Financial Snapshot** — revenue, EBITDA margin, leverage (Debt/EBITDA), interest cover, liquidity.\n**Rating Sensitivities** — what would trigger upgrade / downgrade.\n\nDocument:\n${snippet}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("summarize-rationale error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

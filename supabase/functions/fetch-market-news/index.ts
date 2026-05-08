// Fetch recent fundraising / investment news for a company using Lovable AI (Gemini)
// Returns JSON array of { headline, source, date, url }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { company } = await req.json();
    if (!company || typeof company !== "string") {
      return new Response(JSON.stringify({ error: "company required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    const systemPrompt = "You are a research assistant for a private credit fund tracking Indian companies. Return ONLY valid JSON, no prose. If you are not aware of any recent verifiable fundraising/investment news for the company within the requested window, return an empty array. Never invent URLs, headlines, dates, or co-investors.";

    const userPrompt = `Find recent fundraising, investment, capital raise, debt round, or backer news for the Indian company "${company}" published on or after ${cutoffStr}.

Prioritize coverage from: techcrunch.com, moneycontrol.com, economictimes.indiatimes.com, vccircle.com, dealstreetasia.com, livemint.com, business-standard.com, entrackr.com, inc42.com.

Return JSON in EXACTLY this shape:
{
  "news": [
    { "headline": "string", "source": "string (domain)", "date": "YYYY-MM-DD", "url": "string", "investors": ["investor name", ...] }
  ]
}

Rules:
- Only include items you are confident about. Empty array is acceptable and preferred over guessing.
- Date must be on or after ${cutoffStr}.
- "investors" lists any co-investors / lead investors named in that article (empty array if none).
- Maximum 8 items, most recent first.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
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
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: { news?: Array<{ headline: string; source: string; date: string; url: string; investors?: string[] }> } = {};
    try { parsed = JSON.parse(content); } catch { parsed = { news: [] }; }
    const news = Array.isArray(parsed.news) ? parsed.news.filter(n => n && n.headline && n.date >= cutoffStr) : [];
    return new Response(JSON.stringify({ news, fetchedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-market-news error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

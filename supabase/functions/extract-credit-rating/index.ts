// Extract credit rating from rationale document text using Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, fileName } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const snippet = text.slice(0, 12000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract credit ratings from rating rationale documents issued by Indian credit rating agencies (CRISIL, ICRA, CARE, India Ratings, Brickwork, Acuite, etc.). Return only the long-term issuer/instrument rating in standard notation (e.g. 'CRISIL AA-/Stable', 'ICRA A+ (Stable)', 'CARE BBB'). If outlook is mentioned, include it. If multiple ratings exist, prefer the long-term issuer rating." },
          { role: "user", content: `File: ${fileName || "rationale"}\n\nDocument text:\n${snippet}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_rating",
            description: "Report extracted credit rating",
            parameters: {
              type: "object",
              properties: {
                rating: { type: "string", description: "The credit rating in standard notation, e.g. 'CRISIL AA-/Stable'. Empty string if not found." },
                agency: { type: "string", description: "Rating agency name, e.g. CRISIL, ICRA, CARE. Empty if unknown." },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["rating", "agency", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_rating" } },
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
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try { parsed = JSON.parse(call?.function?.arguments || "{}"); } catch {}

    return new Response(JSON.stringify({
      rating: parsed.rating || "",
      agency: parsed.agency || "",
      confidence: parsed.confidence || "low",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("extract-credit-rating error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

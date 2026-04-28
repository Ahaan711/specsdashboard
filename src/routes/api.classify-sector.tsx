import { createFileRoute } from "@tanstack/react-router";

const SECTORS = [
  "Real Estate",
  "Infrastructure",
  "Corporate",
  "SME",
  "Specialty Finance",
  "NBFC / Lending",
  "Fintech",
  "Consumer",
  "Agritech",
  "Healthcare",
  "Logistics",
  "EdTech",
  "Manufacturing",
  "Technology / SaaS",
  "Renewable Energy",
  "Other",
];

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

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI service unavailable" }), {
              status: 500,
              headers: cors,
            });
          }

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a financial analyst classifying Indian companies into one industry sector. Respond ONLY by calling the classify_sector tool.",
                },
                {
                  role: "user",
                  content: `Classify this company into the most appropriate sector: "${company}"`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "classify_sector",
                    description: "Return the best-fit sector for the company.",
                    parameters: {
                      type: "object",
                      properties: {
                        sector: { type: "string", enum: SECTORS },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["sector", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "classify_sector" } },
            }),
          });

          if (!res.ok) {
            const t = await res.text();
            console.error(`AI gateway error ${res.status}:`, t);
            return new Response(
              JSON.stringify({ error: "Upstream AI service error" }),
              { status: res.status === 429 || res.status === 402 ? res.status : 502, headers: cors },
            );
          }

          const data = await res.json();
          const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          let parsed: { sector?: string; confidence?: string } = {};
          try {
            parsed = typeof args === "string" ? JSON.parse(args) : args || {};
          } catch {
            // ignore
          }
          const sector = SECTORS.includes(parsed.sector || "") ? parsed.sector : "Other";
          return new Response(
            JSON.stringify({ sector, confidence: parsed.confidence || "low" }),
            { headers: cors },
          );
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

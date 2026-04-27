import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spark Asia Impact — SpECS Fund Manager" },
      {
        name: "description",
        content:
          "Private credit fund management workspace: leads pipeline, portfolio dashboard, deal modeler with XIRR, and fund analytics for the Spark Equitized Credit Solutions Fund.",
      },
      { property: "og:title", content: "Spark Asia Impact — SpECS Fund Manager" },
      {
        property: "og:description",
        content:
          "Institutional-grade workspace for the SpECS Fund: pipeline, portfolio, XIRR modeling, and analytics.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1B2E] text-[#E6EDF6] px-6">
      <div className="max-w-2xl text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <span className="text-3xl font-bold tracking-tight">
            Spark Asia Impact
            <span className="text-[#FF7553] ml-1">✦</span>
          </span>
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-[#9FB1C7] mb-2">
          Alternative Asset Management
        </p>
        <h1 className="text-4xl font-bold mt-4 mb-4">
          <span className="text-[#FF7553]">Sp</span>ECS Fund Manager
        </h1>
        <p className="text-[#9FB1C7] mb-8">
          A complete private-credit workspace for the{" "}
          <span className="text-[#FF7553]">S</span>park{" "}
          <span className="text-[#FF7553]">E</span>quitized{" "}
          <span className="text-[#FF7553]">C</span>redit{" "}
          <span className="text-[#FF7553]">S</span>olutions Fund — leads pipeline,
          portfolio dashboard, XIRR modeling, fund analytics, and Excel import/export.
          Data is stored locally in your browser.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="/pcf-app.html"
            className="inline-flex items-center px-6 py-3 rounded-md bg-[#FF7553] text-white font-semibold hover:bg-[#ff8e72] transition-colors"
          >
            Launch Fund Manager →
          </a>
          <a
            href="/pcf-app.html"
            download="SpECS_Fund_Manager.html"
            className="inline-flex items-center px-6 py-3 rounded-md border border-[#284F70] text-[#E6EDF6] font-semibold hover:border-[#FF7553] transition-colors"
          >
            ⇩ Download HTML
          </a>
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { c: "#15253F", n: "Navy" },
            { c: "#FF7553", n: "Accent" },
            { c: "#284F70", n: "Teal" },
            { c: "#DAA06D", n: "Tan" },
            { c: "#C2B280", n: "Sand" },
            { c: "#7D8590", n: "Slate" },
          ].map((s) => (
            <div
              key={s.c}
              className="p-3 rounded border border-white/10"
              style={{ backgroundColor: s.c }}
            >
              <div className="font-semibold text-white drop-shadow">{s.c}</div>
              <div className="text-white/80">{s.n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    <div className="h-screen w-full overflow-hidden bg-background">
      <iframe
        src="/pcf-app.html"
        title="SpECS Fund Manager"
        className="block h-full w-full border-0"
      />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  component: AppPage,
});

function AppPage() {
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

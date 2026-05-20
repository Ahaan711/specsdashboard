import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { resetSeed, loadCompanies } from "@/lib/portfolio-data";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/portfolio/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [count, setCount] = useState(() => (typeof window !== "undefined" ? loadCompanies().length : 0));
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="mt-1 text-sm text-white/50">PortfolioOS — internal tool, single-user mode.</p>

      <div className="mt-6 max-w-2xl space-y-4">
        <Card title="Data">
          <div className="text-sm text-white/70">
            Currently storing <span className="font-mono text-[#FF7553]">{count}</span> companies in browser localStorage.
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="border-[#1A2B47] bg-transparent text-white hover:bg-[#1C3151]"
              onClick={() => {
                resetSeed();
                setCount(loadCompanies().length);
                toast.success("Seed data reset.");
              }}
            >
              Reset to Seed
            </Button>
          </div>
        </Card>

        <Card title="AI">
          <div className="text-sm text-white/70">
            Document parsing uses Lovable AI Gateway (Gemini 2.5 Pro). No API key required.
          </div>
        </Card>

        <Card title="About">
          <div className="space-y-1 text-sm text-white/60">
            <div>Build: PortfolioOS Phase 1</div>
            <div>Mode: Internal · No authentication</div>
            <div>Currency: ₹ Crore · Dates: DD-MMM-YYYY</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}>
      <div className="mb-3 text-[11px] uppercase tracking-wider text-white/40">{title}</div>
      {children}
    </div>
  );
}

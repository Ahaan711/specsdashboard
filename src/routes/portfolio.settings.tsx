import { createFileRoute } from "@tanstack/react-router";
import { loadCompanies } from "@/lib/portfolio-data";
import {
  listDocuments,
  getDocumentSignedUrl,
  type DocumentRow,
} from "@/lib/cloud-sync";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/portfolio/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" ? loadCompanies().length : 0,
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="mt-1 text-sm text-white/50">
        Monitoring Dashboard — internal tool, single-user mode.
      </p>

      <Tabs defaultValue="general" className="mt-6 max-w-4xl">
        <TabsList className="border bg-[#15253F]" style={{ borderColor: "#1A2B47" }}>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card title="Data">
            <div className="text-sm text-white/70">
              Currently storing{" "}
              <span className="font-mono text-[#FF7553]">{count}</span> companies in
              browser localStorage.
            </div>
          </Card>

          <Card title="About">
            <div className="space-y-1 text-sm text-white/60">
              <div>Build: Monitoring Dashboard Phase 1</div>
              <div>Mode: Internal · No authentication</div>
              <div>Currency: ₹ Crore · Dates: DD-MMM-YYYY</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentsTab() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const res = await listDocuments();
    setLoading(false);
    if (res.ok) {
      setDocs(res.data || []);
      setStatus(null);
    } else if (res.notProvisioned) {
      setStatus("Cloud sync not provisioned yet — press Sync after backend is ready.");
    } else {
      setStatus(res.error || "Failed to load documents.");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "#1A2B47", backgroundColor: "#15253F" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#FF7553]" />
            <h3 className="text-sm font-semibold text-white">Uploaded Documents</h3>
            <span className="text-xs text-white/40">({docs.length})</span>
          </div>
          <div className="mt-0.5 text-xs text-white/50">
            All term sheets and MIS files uploaded across Monitoring Dashboard.
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs text-white/80 hover:bg-[#1C3151] disabled:opacity-50"
          style={{ borderColor: "#1A2B47" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {status ? (
        <div className="rounded-md border border-dashed p-4 text-xs text-white/50" style={{ borderColor: "#1A2B47" }}>
          {status}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-md border border-dashed py-10 text-center text-xs text-white/40" style={{ borderColor: "#1A2B47" }}>
          No documents uploaded yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border" style={{ borderColor: "#1A2B47" }}>
          <table className="w-full text-sm">
            <thead className="bg-[#0F1B2E] text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">File</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Company</th>
                <th className="px-3 py-2 text-left font-medium">Uploaded</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t" style={{ borderColor: "#1A2B47" }}>
                  <td className="px-3 py-2 text-white/90">{d.filename}</td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
                      style={{
                        backgroundColor:
                          d.kind === "mis"
                            ? "rgba(255,117,83,0.15)"
                            : d.kind === "quarterly_review"
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(59,130,246,0.15)",
                        color:
                          d.kind === "mis"
                            ? "#FF7553"
                            : d.kind === "quarterly_review"
                            ? "#22C55E"
                            : "#3B82F6",
                      }}
                    >
                      {d.kind === "mis"
                        ? "MIS"
                        : d.kind === "termsheet"
                        ? "Term Sheet"
                        : d.kind === "quarterly_review"
                        ? "Review Notes"
                        : d.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/70">{d.company_name || "—"}</td>
                  <td className="px-3 py-2 text-white/50">
                    {new Date(d.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={async () => {
                        const url = await getDocumentSignedUrl(d.storage_path);
                        if (url) {
                          window.open(url, "_blank", "noopener,noreferrer");
                        } else {
                          toast.error("Couldn't generate a download link.");
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-white/80 hover:bg-[#1C3151]"
                      style={{ borderColor: "#1A2B47" }}
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

// Cloud sync helpers — manual push/pull for companies + deals,
// plus document upload to the portfolio-docs bucket.
//
// Designed to fail gracefully if the migration hasn't been applied yet:
// every helper returns { ok, error?, notProvisioned? } and never throws.

import { supabase as supabaseTyped } from "@/integrations/supabase/client";
import {
  loadCompanies,
  saveCompanies,
  type Company,
} from "./portfolio-data";

// Tables created in a not-yet-typed migration; cast away strict typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseTyped as any;

const BUCKET = "portfolio-docs";
const DEALS_KEY = "pipeline_deals_v1";

type Result<T = unknown> = {
  ok: boolean;
  error?: string;
  notProvisioned?: boolean;
  data?: T;
};

export type DocumentRow = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  kind: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
};

function isMissing(err: { code?: string; message?: string } | null | undefined) {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const m = (err.message || "").toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("not found") ||
    m.includes("could not find the table") ||
    m.includes("bucket not found")
  );
}

// ---------------- Companies ----------------
export async function pushCompanies(): Promise<Result> {
  const list = loadCompanies();
  if (list.length === 0) return { ok: true };
  const rows = list.map((c) => ({
    id: c.id,
    payload: c,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("portfolio_companies")
    .upsert(rows, { onConflict: "id" });
  if (error) {
    return { ok: false, error: error.message, notProvisioned: isMissing(error) };
  }
  return { ok: true };
}

export async function pullCompanies(): Promise<Result> {
  const { data, error } = await supabase
    .from("portfolio_companies")
    .select("payload");
  if (error) {
    return { ok: false, error: error.message, notProvisioned: isMissing(error) };
  }
  if (!data || data.length === 0) return { ok: true };
  const local = loadCompanies();
  const merged = new Map<string, Company>();
  local.forEach((c) => merged.set(c.id, c));
  data.forEach((row: { payload: Company }) => merged.set(row.payload.id, row.payload));
  saveCompanies(Array.from(merged.values()));
  return { ok: true };
}

// ---------------- Deals ----------------
type Deal = { id: string; [k: string]: unknown };

function loadDealsLocal(): Deal[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DEALS_KEY) || "[]") as Deal[];
  } catch {
    return [];
  }
}
function saveDealsLocal(deals: Deal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
}

export async function pushDeals(): Promise<Result> {
  const list = loadDealsLocal();
  if (list.length === 0) return { ok: true };
  const rows = list.map((d) => ({
    id: d.id,
    payload: d,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("pipeline_deals")
    .upsert(rows, { onConflict: "id" });
  if (error) {
    return { ok: false, error: error.message, notProvisioned: isMissing(error) };
  }
  return { ok: true };
}

export async function pullDeals(): Promise<Result> {
  const { data, error } = await supabase
    .from("pipeline_deals")
    .select("payload");
  if (error) {
    return { ok: false, error: error.message, notProvisioned: isMissing(error) };
  }
  if (!data) return { ok: true };
  const local = loadDealsLocal();
  const merged = new Map<string, Deal>();
  local.forEach((d) => merged.set(d.id, d));
  data.forEach((row: { payload: Deal }) => merged.set(row.payload.id, row.payload));
  saveDealsLocal(Array.from(merged.values()));
  return { ok: true };
}

// ---------------- Sync orchestration ----------------
export async function syncAll(): Promise<Result> {
  const results = await Promise.all([
    pushCompanies(),
    pushDeals(),
    pullCompanies(),
    pullDeals(),
  ]);
  const firstNotProv = results.find((r) => r.notProvisioned);
  if (firstNotProv) {
    return {
      ok: false,
      notProvisioned: true,
      error: "Cloud sync not provisioned yet — please retry later.",
    };
  }
  const firstErr = results.find((r) => !r.ok);
  if (firstErr) return { ok: false, error: firstErr.error };
  return { ok: true };
}

export async function syncPipelineOnly(): Promise<Result> {
  const results = await Promise.all([pushDeals(), pullDeals()]);
  const firstNotProv = results.find((r) => r.notProvisioned);
  if (firstNotProv) {
    return {
      ok: false,
      notProvisioned: true,
      error: "Cloud sync not provisioned yet — please retry later.",
    };
  }
  const firstErr = results.find((r) => !r.ok);
  if (firstErr) return { ok: false, error: firstErr.error };
  return { ok: true };
}

// ---------------- Documents ----------------
export async function uploadDocument(
  file: File,
  meta: { kind: "termsheet" | "mis" | "predd"; companyId?: string; companyName?: string },
): Promise<Result<DocumentRow>> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${meta.companyId || "_unknown"}/${meta.kind}/${Date.now()}-${safeName}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (up.error) {
    return { ok: false, error: up.error.message, notProvisioned: isMissing(up.error) };
  }
  const row = {
    company_id: meta.companyId ?? null,
    company_name: meta.companyName ?? null,
    kind: meta.kind,
    filename: file.name,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
  };
  const ins = await supabase
    .from("portfolio_documents")
    .insert(row)
    .select()
    .single();
  if (ins.error) {
    return { ok: false, error: ins.error.message, notProvisioned: isMissing(ins.error) };
  }
  return { ok: true, data: ins.data as DocumentRow };
}

export async function listDocuments(): Promise<Result<DocumentRow[]>> {
  const { data, error } = await supabase
    .from("portfolio_documents")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) {
    return { ok: false, error: error.message, notProvisioned: isMissing(error) };
  }
  return { ok: true, data: (data || []) as DocumentRow[] };
}

export function getDocumentPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

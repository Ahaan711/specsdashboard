// Dedicated Supabase client for cloud sync (companies, deals, documents).
// Points at the user-owned Supabase project, separate from Lovable Cloud.
// Publishable keys are safe to ship in client code.
import { createClient } from "@supabase/supabase-js";

const SYNC_SUPABASE_URL = "https://jszniaaiuagasiyewnyy.supabase.co";
const SYNC_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_BmWqTF3bwTqmuXBXnKdjew_kJYQp8k0";

export const syncSupabase = createClient(
  SYNC_SUPABASE_URL,
  SYNC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      storageKey: "sync-supabase-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

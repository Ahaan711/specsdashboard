-- Migration: create shared_state table used by legacy pcf-app and enable realtime
CREATE TABLE IF NOT EXISTS public.shared_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_state ENABLE ROW LEVEL SECURITY;

-- Recreate policies (DROP first to avoid "IF NOT EXISTS" syntax issues)
DROP POLICY IF EXISTS "Public read shared_state" ON public.shared_state;
CREATE POLICY "Public read shared_state"
  ON public.shared_state FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public insert shared_state" ON public.shared_state;
CREATE POLICY "Public insert shared_state"
  ON public.shared_state FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public update shared_state" ON public.shared_state;
CREATE POLICY "Public update shared_state"
  ON public.shared_state FOR UPDATE
  USING (true) WITH CHECK (true);

-- Ensure the table is part of the supabase_realtime publication (safe add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shared_state'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_state';
  END IF;
END$$;

ALTER TABLE public.shared_state REPLICA IDENTITY FULL;

-- Optional: seed a minimal app-state with an empty leads array
INSERT INTO public.shared_state (key, value, updated_at)
VALUES ('app-state', jsonb_build_object('leads', '[]'::jsonb), now())
ON CONFLICT (key) DO NOTHING;

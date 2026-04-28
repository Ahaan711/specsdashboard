
CREATE TABLE public.shared_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read shared_state"
  ON public.shared_state FOR SELECT
  USING (true);

CREATE POLICY "Public insert shared_state"
  ON public.shared_state FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update shared_state"
  ON public.shared_state FOR UPDATE
  USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_state;
ALTER TABLE public.shared_state REPLICA IDENTITY FULL;

BEGIN;
CREATE TABLE IF NOT EXISTS public.game_recap_articles (
 game_id text PRIMARY KEY CHECK(game_id ~ '^espn:[0-9]{9}$'),
 version integer NOT NULL CHECK(version > 0),
 title text NOT NULL,
 body text NOT NULL CHECK(length(body) > 0),
 article jsonb NOT NULL CHECK(jsonb_typeof(article) = 'object'),
 source_snapshot jsonb NOT NULL CHECK(jsonb_typeof(source_snapshot) = 'object'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.game_recap_articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_recap_articles FROM PUBLIC,anon,authenticated,service_role;
-- App workers can only create and read: an existing article stays unchanged.
GRANT SELECT,INSERT ON public.game_recap_articles TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

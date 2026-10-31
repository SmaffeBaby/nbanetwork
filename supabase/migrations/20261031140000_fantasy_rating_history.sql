BEGIN;
CREATE TABLE IF NOT EXISTS public.fantasy_rating_games (
 game_id text PRIMARY KEY CHECK(game_id ~ '^espn:[0-9]{9}$'),
 season integer NOT NULL CHECK(season BETWEEN 2000 AND 2200), starts_at timestamptz NOT NULL,
 players jsonb NOT NULL CHECK(jsonb_typeof(players)='array'),
 matchup text NOT NULL, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS fantasy_rating_games_season ON public.fantasy_rating_games(season,starts_at);
ALTER TABLE public.fantasy_rating_games ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fantasy_rating_games FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.fantasy_rating_games TO service_role;
CREATE OR REPLACE FUNCTION public.read_fantasy_profile(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH daily AS (SELECT read_daily_fantasy((clock_timestamp() AT TIME ZONE 'Europe/Moscow')::date,'unlimited',p_user) data),
 legacy AS (SELECT read_fantasy(date_trunc('week',clock_timestamp() AT TIME ZONE 'Europe/Moscow')::date,p_user) data),
 totals AS (SELECT user_id,mode,sum(points) points FROM fantasy_daily_results GROUP BY user_id,mode),
 ranked AS (SELECT *,rank() OVER(PARTITION BY mode ORDER BY points DESC) rank,count(*) OVER(PARTITION BY mode) participants FROM totals)
 SELECT jsonb_build_object('history',(SELECT data->'history' FROM daily),
 'legacy',(SELECT data->'history' FROM legacy),'playerXp',(SELECT data->'playerXp' FROM daily),
 'ranks',coalesce((SELECT jsonb_object_agg(mode,jsonb_build_object('rank',rank,'participants',participants)) FROM ranked WHERE user_id=p_user),'{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.read_fantasy_profile(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_fantasy_profile(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

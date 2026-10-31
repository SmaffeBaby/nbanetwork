BEGIN;
-- V1 tables remain untouched: weekly results and their original scoring are archived.
CREATE TABLE IF NOT EXISTS public.fantasy_days (
 day date PRIMARY KEY, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 locks_at timestamptz NOT NULL, season integer NOT NULL, rating_version integer NOT NULL DEFAULT 1,
 ratings jsonb NOT NULL, settled_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(ends_at>starts_at AND locks_at>=starts_at AND locks_at<ends_at)
);
CREATE TABLE IF NOT EXISTS public.fantasy_daily_entries (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 day date NOT NULL REFERENCES public.fantasy_days(day), mode text NOT NULL CHECK(mode IN ('unlimited','balanced')),
 confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lineup jsonb NOT NULL CHECK(jsonb_typeof(lineup)='array' AND jsonb_array_length(lineup)=5),
 player_bonuses jsonb NOT NULL DEFAULT '{}', PRIMARY KEY(user_id,day,mode)
);
CREATE TABLE IF NOT EXISTS public.fantasy_daily_scores (
 day date NOT NULL REFERENCES public.fantasy_days(day), game_id text NOT NULL, player_id text NOT NULL,
 starts_at timestamptz NOT NULL, observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 points numeric NOT NULL, stats jsonb NOT NULL, PRIMARY KEY(day,game_id,player_id)
);
ALTER TABLE public.fantasy_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_daily_scores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fantasy_days,public.fantasy_daily_entries,public.fantasy_daily_scores FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.fantasy_days,public.fantasy_daily_entries TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.fantasy_daily_scores TO service_role;
GRANT UPDATE(settled_at) ON public.fantasy_days TO service_role;

CREATE OR REPLACE VIEW public.fantasy_owned_daily_scores WITH (security_invoker=true) AS
 SELECT DISTINCT e.user_id,s.* FROM fantasy_daily_entries e JOIN fantasy_daily_scores s ON s.day=e.day
 AND s.starts_at>=e.confirmed_at AND EXISTS(SELECT 1 FROM jsonb_array_elements(e.lineup) p WHERE p->>'id'=s.player_id);
-- A real player/game earns XP once, including the transition from legacy lineups.
CREATE OR REPLACE VIEW public.fantasy_player_xp_awards WITH (security_invoker=true) AS
 WITH old AS (
  SELECT e.user_id,s.week period,s.player_id,greatest(0,sum(s.points)) xp FROM fantasy_entries e JOIN fantasy_scores s
  ON s.week=e.week AND s.starts_at>=e.confirmed_at AND s.starts_at<e.ends_at
  AND EXISTS(SELECT 1 FROM jsonb_array_elements(e.lineup) p WHERE p->>'id'=s.player_id)
  GROUP BY e.user_id,s.week,s.player_id
 ), daily AS (
  SELECT d.user_id,d.day period,d.player_id,greatest(0,sum(d.points)) xp FROM fantasy_owned_daily_scores d
  WHERE NOT EXISTS(SELECT 1 FROM fantasy_entries e JOIN fantasy_scores s ON s.week=e.week
   AND s.starts_at>=e.confirmed_at AND s.starts_at<e.ends_at
   WHERE e.user_id=d.user_id AND s.game_id=d.game_id AND s.player_id=d.player_id
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(e.lineup) p WHERE p->>'id'=s.player_id))
  GROUP BY d.user_id,d.day,d.player_id
 ) SELECT * FROM old UNION ALL SELECT * FROM daily;

CREATE OR REPLACE FUNCTION public.guard_daily_fantasy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d fantasy_days; p jsonb; r jsonb; total integer:=0; xp numeric; lvl integer; bonuses jsonb:='{}'; canonical jsonb:='[]';
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Fantasy lineup immutable'; END IF;
 SELECT * INTO STRICT d FROM fantasy_days WHERE day=NEW.day;
 IF clock_timestamp()>=d.locks_at OR clock_timestamp()<d.starts_at-interval '7 days' THEN RAISE EXCEPTION 'Fantasy day locked'; END IF;
 IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(NEW.lineup) x)<>5
 OR (SELECT count(DISTINCT x->>'slot') FROM jsonb_array_elements(NEW.lineup) x WHERE x->>'slot' IN ('PG','SG','SF','PF','C'))<>5 THEN RAISE EXCEPTION 'Invalid lineup'; END IF;
 FOR p IN SELECT * FROM jsonb_array_elements(NEW.lineup) LOOP
  r:=d.ratings->(p->>'id');
  IF r IS NULL OR NOT (r->'positions' ? (p->>'slot')) THEN RAISE EXCEPTION 'Invalid player'; END IF;
  total:=total+(r->>'ovr')::integer;
  canonical:=canonical||jsonb_build_array(jsonb_build_object('id',p->>'id','slot',p->>'slot','name',r->>'name','team',r->>'team','ovr',(r->>'ovr')::integer,'scoringPosition',r->>'scoringPosition'));
  SELECT coalesce(sum(a.xp),0) INTO xp FROM fantasy_player_xp_awards a WHERE a.user_id=NEW.user_id AND a.player_id=p->>'id' AND a.period<NEW.day;
  lvl:=floor((1+sqrt(1+xp/37.5))/2)::integer;
  bonuses:=bonuses||jsonb_build_object(p->>'id',jsonb_build_object('level',lvl,'rate',fantasy_bonus_rate(lvl)));
 END LOOP;
 IF NEW.mode='balanced' AND total>400 THEN RAISE EXCEPTION 'OVR cap exceeded'; END IF;
 NEW.lineup:=canonical; NEW.player_bonuses:=bonuses; NEW.confirmed_at:=clock_timestamp();
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS daily_fantasy_guard ON public.fantasy_daily_entries;
CREATE TRIGGER daily_fantasy_guard BEFORE INSERT OR UPDATE ON public.fantasy_daily_entries FOR EACH ROW EXECUTE FUNCTION public.guard_daily_fantasy();

CREATE OR REPLACE VIEW public.fantasy_daily_player_results WITH (security_invoker=true) AS
 WITH base AS (
 SELECT e.user_id,e.day,e.mode,p->>'id' player_id,coalesce(sum(s.points),0) base_points,
 count(s.game_id) player_games,max(s.observed_at) updated_at,
 coalesce((e.player_bonuses->(p->>'id')->>'level')::integer,1) bonus_level,
 coalesce((e.player_bonuses->(p->>'id')->>'rate')::numeric,0) bonus_rate
 FROM fantasy_daily_entries e CROSS JOIN LATERAL jsonb_array_elements(e.lineup) p
 LEFT JOIN fantasy_daily_scores s ON s.day=e.day AND s.player_id=p->>'id' AND s.starts_at>=e.confirmed_at
 GROUP BY e.user_id,e.day,e.mode,p->>'id'
 ) SELECT b.*,fantasy_player_bonus(base_points,bonus_rate) bonus_points,
 base_points+fantasy_player_bonus(base_points,bonus_rate) points FROM base b;
CREATE OR REPLACE VIEW public.fantasy_daily_results WITH (security_invoker=true) AS
 SELECT e.user_id,e.day AS week,e.mode,d.ends_at,e.confirmed_at,e.lineup,
 coalesce(sum(p.points),0) points,coalesce(sum(p.player_games),0)::bigint player_games,max(p.updated_at) updated_at,
 (SELECT jsonb_object_agg(x.player_id,x.points) FROM fantasy_daily_player_results x WHERE x.user_id=e.user_id AND x.day=e.day AND x.mode=e.mode) player_points,
 (SELECT jsonb_object_agg(x.player_id,x.base_points) FROM fantasy_daily_player_results x WHERE x.user_id=e.user_id AND x.day=e.day AND x.mode=e.mode) player_base_points,
 (SELECT jsonb_object_agg(x.player_id,x.bonus_points) FROM fantasy_daily_player_results x WHERE x.user_id=e.user_id AND x.day=e.day AND x.mode=e.mode) player_bonus_points, d.settled_at IS NOT NULL AS settled
 FROM fantasy_daily_entries e JOIN fantasy_days d ON d.day=e.day LEFT JOIN fantasy_daily_player_results p ON p.user_id=e.user_id AND p.day=e.day AND p.mode=e.mode
 GROUP BY e.user_id,e.day,e.mode,d.ends_at,d.settled_at;
REVOKE ALL ON public.fantasy_owned_daily_scores,public.fantasy_player_xp_awards,public.fantasy_daily_player_results,public.fantasy_daily_results FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.fantasy_owned_daily_scores,public.fantasy_player_xp_awards,public.fantasy_daily_player_results,public.fantasy_daily_results TO service_role;

CREATE OR REPLACE FUNCTION public.read_daily_fantasy(p_day date,p_mode text,p_user uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH ranked AS (
 SELECT r.*,rank() OVER(PARTITION BY week,mode ORDER BY points DESC) rank FROM fantasy_daily_results r
 ), leaders AS (
 SELECT r.user_id,r.points,r.rank,r.player_games,p.first_name,p.last_name FROM ranked r JOIN profiles p ON p.id=r.user_id
 WHERE r.week=p_day AND r.mode=p_mode ORDER BY r.points DESC,r.confirmed_at,r.user_id LIMIT 100
 ), overall AS (
 SELECT user_id,sum(points) points,count(*) weeks FROM fantasy_daily_results WHERE mode=p_mode GROUP BY user_id
 ), overall_top AS (
 SELECT o.*,rank() OVER(ORDER BY o.points DESC) rank,p.first_name,p.last_name FROM overall o JOIN profiles p ON p.id=o.user_id
 ORDER BY o.points DESC,o.user_id LIMIT 100
 ), history AS (
 SELECT * FROM ranked WHERE user_id=p_user ORDER BY week DESC,mode
 ), xp AS (SELECT player_id,sum(xp) xp FROM fantasy_player_xp_awards WHERE user_id=p_user GROUP BY player_id)
 SELECT jsonb_build_object('leaderboard',coalesce((SELECT jsonb_agg(l) FROM leaders l),'[]'::jsonb),
 'overall',coalesce((SELECT jsonb_agg(o) FROM overall_top o),'[]'::jsonb),
 'history',coalesce((SELECT jsonb_agg(h) FROM history h),'[]'::jsonb),
 'playerXp',coalesce((SELECT jsonb_object_agg(player_id,xp) FROM xp),'{}'::jsonb),
 'participants',(SELECT count(*) FROM ranked WHERE week=p_day AND mode=p_mode));
$$;

-- Replace the reconciler, retaining its legacy trigger and adding a daily one.
CREATE OR REPLACE FUNCTION public.sync_fantasy_experience() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH owned AS (
 SELECT e.user_id,s.game_id,s.player_id,s.points,s.stats FROM fantasy_entries e JOIN fantasy_scores s
 ON s.week=e.week AND s.starts_at>=e.confirmed_at AND s.starts_at<e.ends_at
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(e.lineup) p WHERE p->>'id'=s.player_id)
 UNION ALL SELECT user_id,game_id,player_id,points,stats FROM fantasy_owned_daily_scores
 ), unique_players AS (
 SELECT user_id,game_id,player_id,max(points) points,max(stats->>'homeAbbr') home,max(stats->>'awayAbbr') away
 FROM owned GROUP BY user_id,game_id,player_id
 ), awards AS (
 SELECT user_id,game_id,greatest(0,sum(points)) points,
 jsonb_build_object('fantasyPoints',sum(points),'homeAbbr',max(home),'awayAbbr',max(away),
 'players',jsonb_agg(jsonb_build_object('id',player_id,'points',points) ORDER BY player_id)) details
 FROM unique_players GROUP BY user_id,game_id
 ) INSERT INTO profile_experience_events(user_id,kind,game_id,points,details)
 SELECT user_id,'fantasy',game_id,points,details FROM awards a WHERE points>0 OR EXISTS(SELECT 1 FROM profile_experience_events x WHERE x.user_id=a.user_id AND x.kind='fantasy' AND x.game_id=a.game_id)
 ON CONFLICT(user_id,kind,game_id) DO UPDATE SET points=excluded.points,details=excluded.details
 WHERE profile_experience_events.points IS DISTINCT FROM excluded.points OR profile_experience_events.details IS DISTINCT FROM excluded.details;
$$;
DROP TRIGGER IF EXISTS daily_fantasy_experience ON public.fantasy_daily_scores;
CREATE TRIGGER daily_fantasy_experience AFTER INSERT OR UPDATE ON public.fantasy_daily_scores FOR EACH STATEMENT EXECUTE FUNCTION public.on_fantasy_experience();
REVOKE ALL ON FUNCTION public.guard_daily_fantasy(),public.read_daily_fantasy(date,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_daily_fantasy(date,text,uuid) TO service_role;
SELECT public.sync_fantasy_experience();
NOTIFY pgrst,'reload schema';
COMMIT;

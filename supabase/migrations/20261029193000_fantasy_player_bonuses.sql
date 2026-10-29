BEGIN;
ALTER TABLE public.fantasy_entries ADD COLUMN IF NOT EXISTS player_bonuses jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.fantasy_bonus_rate(p_level integer) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE WHEN p_level>=10 THEN 0.02 WHEN p_level>=8 THEN 0.015 WHEN p_level>=5 THEN 0.01 WHEN p_level>=3 THEN 0.005 ELSE 0 END::numeric;
$$;
CREATE OR REPLACE FUNCTION public.fantasy_player_bonus(p_base numeric,p_rate numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT round(least(3::numeric,greatest(0::numeric,p_base)*greatest(0::numeric,least(0.02::numeric,p_rate))),1);
$$;

-- Snapshot only previous weeks' base XP. Client values are always overwritten.
CREATE OR REPLACE FUNCTION public.snapshot_fantasy_player_bonuses() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 WITH weekly AS (
  SELECT s.player_id,e.week,greatest(0,sum(s.points)) xp
  FROM fantasy_entries e JOIN fantasy_scores s ON s.week=e.week AND s.starts_at>=e.confirmed_at AND s.starts_at<e.ends_at
  WHERE e.user_id=NEW.user_id AND e.week<NEW.week
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(e.lineup) p WHERE p->>'id'=s.player_id)
  GROUP BY s.player_id,e.week
 ), levels AS (
  SELECT p->>'id' id,floor((1+sqrt(1+coalesce((SELECT sum(xp) FROM weekly w WHERE w.player_id=p->>'id'),0)/37.5))/2)::integer level
  FROM jsonb_array_elements(NEW.lineup) p
 )
 SELECT coalesce(jsonb_object_agg(id,jsonb_build_object('level',level,'rate',fantasy_bonus_rate(level))),'{}'::jsonb)
 INTO NEW.player_bonuses FROM levels;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fantasy_player_bonus_snapshot ON public.fantasy_entries;
CREATE TRIGGER fantasy_player_bonus_snapshot BEFORE INSERT ON public.fantasy_entries FOR EACH ROW EXECUTE FUNCTION public.snapshot_fantasy_player_bonuses();

-- Legacy entries keep zero bonus; past standings do not change retroactively.
CREATE OR REPLACE VIEW public.fantasy_player_results WITH (security_invoker=true) AS
 WITH base AS (
  SELECT e.user_id,e.week,p->>'id' player_id,
   coalesce(sum(s.points),0) base_points,count(s.game_id) player_games,max(s.observed_at) updated_at,
   coalesce((e.player_bonuses->(p->>'id')->>'level')::integer,1) bonus_level,
   coalesce((e.player_bonuses->(p->>'id')->>'rate')::numeric,0) bonus_rate
  FROM fantasy_entries e CROSS JOIN LATERAL jsonb_array_elements(e.lineup) p
  LEFT JOIN fantasy_scores s ON s.week=e.week AND s.player_id=p->>'id' AND s.starts_at>=e.confirmed_at AND s.starts_at<e.ends_at
  GROUP BY e.user_id,e.week,p->>'id'
 )
 SELECT b.*,fantasy_player_bonus(base_points,bonus_rate) bonus_points,
  base_points+fantasy_player_bonus(base_points,bonus_rate) points FROM base b;
REVOKE ALL ON public.fantasy_player_results FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.fantasy_player_results TO service_role;

CREATE OR REPLACE VIEW public.fantasy_results WITH (security_invoker=true) AS
 SELECT e.user_id,e.week,e.ends_at,e.confirmed_at,e.lineup,
 coalesce(sum(p.points),0) points,coalesce(sum(p.player_games),0)::bigint player_games,max(p.updated_at) updated_at
 FROM fantasy_entries e LEFT JOIN fantasy_player_results p ON p.user_id=e.user_id AND p.week=e.week
 GROUP BY e.user_id,e.week;

CREATE OR REPLACE FUNCTION public.read_fantasy(p_week date,p_user uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH ranked AS (
  SELECT r.*,rank() OVER(PARTITION BY week ORDER BY points DESC) rank FROM fantasy_results r
 ), leaders AS (
  SELECT r.user_id,r.points,r.rank,r.player_games,p.first_name,p.last_name FROM ranked r JOIN profiles p ON p.id=r.user_id
  WHERE r.week=p_week ORDER BY r.points DESC,r.confirmed_at,r.user_id LIMIT 100
 ), history AS (
  SELECT r.*,
   (SELECT jsonb_object_agg(player_id,points) FROM fantasy_player_results p WHERE p.user_id=r.user_id AND p.week=r.week) player_points,
   (SELECT jsonb_object_agg(player_id,base_points) FROM fantasy_player_results p WHERE p.user_id=r.user_id AND p.week=r.week) player_base_points,
   (SELECT jsonb_object_agg(player_id,bonus_points) FROM fantasy_player_results p WHERE p.user_id=r.user_id AND p.week=r.week) player_bonus_points
  FROM ranked r WHERE user_id=p_user ORDER BY week DESC
 ), overall AS (
  SELECT user_id,sum(points) points,count(*) weeks FROM fantasy_results GROUP BY user_id
 ), overall_top AS (
  SELECT o.*,rank() OVER(ORDER BY o.points DESC) rank,p.first_name,p.last_name FROM overall o JOIN profiles p ON p.id=o.user_id
  ORDER BY o.points DESC,o.user_id LIMIT 100
 )
 SELECT jsonb_build_object('leaderboard',coalesce((SELECT jsonb_agg(l) FROM leaders l),'[]'::jsonb),
  'overall',coalesce((SELECT jsonb_agg(o) FROM overall_top o),'[]'::jsonb),
  'history',coalesce((SELECT jsonb_agg(h) FROM history h),'[]'::jsonb),
  'participants',(SELECT count(*) FROM ranked WHERE week=p_week));
$$;
REVOKE ALL ON FUNCTION public.fantasy_bonus_rate(integer),public.fantasy_player_bonus(numeric,numeric),public.snapshot_fantasy_player_bonuses() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fantasy_bonus_rate(integer),public.fantasy_player_bonus(numeric,numeric) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

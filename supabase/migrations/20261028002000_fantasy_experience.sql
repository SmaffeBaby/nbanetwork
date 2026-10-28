BEGIN;
ALTER TABLE public.profile_experience_events DROP CONSTRAINT IF EXISTS profile_experience_events_check;
ALTER TABLE public.profile_experience_events DROP CONSTRAINT IF EXISTS profile_experience_events_kind_check;
ALTER TABLE public.profile_experience_events DROP CONSTRAINT IF EXISTS profile_experience_events_points_check;
ALTER TABLE public.profile_experience_events ALTER COLUMN points TYPE numeric USING points::numeric;
ALTER TABLE public.profile_experience_events ADD CONSTRAINT profile_experience_events_kind_check CHECK(kind IN ('watched','prediction','fantasy'));
ALTER TABLE public.profile_experience_events ADD CONSTRAINT profile_experience_events_points_check CHECK((kind='watched' AND points=30) OR (kind='prediction' AND points=100) OR (kind='fantasy' AND points>=0));

-- One award per user and real game; all five players contribute to this award.
CREATE OR REPLACE FUNCTION public.sync_fantasy_experience() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH awards AS (
  SELECT e.user_id,s.game_id,greatest(0,sum(s.points)) AS points,
   jsonb_build_object('week',e.week,'fantasyPoints',sum(s.points),'homeAbbr',max(s.stats->>'homeAbbr'),'awayAbbr',max(s.stats->>'awayAbbr'),
   'players',jsonb_agg(jsonb_build_object('id',s.player_id,'points',s.points) ORDER BY s.player_id)) AS details
  FROM public.fantasy_entries e JOIN public.fantasy_scores s ON s.week=e.week AND s.starts_at>=e.confirmed_at AND s.starts_at<e.ends_at
  AND EXISTS(SELECT 1 FROM jsonb_array_elements(e.lineup) p WHERE p->>'id'=s.player_id)
  GROUP BY e.user_id,e.week,s.game_id
 )
 INSERT INTO public.profile_experience_events(user_id,kind,game_id,points,details)
 SELECT user_id,'fantasy',game_id,points,details FROM awards a WHERE points>0 OR EXISTS(SELECT 1 FROM public.profile_experience_events x WHERE x.user_id=a.user_id AND x.kind='fantasy' AND x.game_id=a.game_id)
 ON CONFLICT(user_id,kind,game_id) DO UPDATE SET points=excluded.points,details=excluded.details
 WHERE profile_experience_events.points IS DISTINCT FROM excluded.points OR profile_experience_events.details IS DISTINCT FROM excluded.details;
$$;
CREATE OR REPLACE FUNCTION public.on_fantasy_experience() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.sync_fantasy_experience(); RETURN NULL; END $$;
DROP TRIGGER IF EXISTS fantasy_experience_award ON public.fantasy_scores;
CREATE TRIGGER fantasy_experience_award AFTER INSERT OR UPDATE ON public.fantasy_scores FOR EACH STATEMENT EXECUTE FUNCTION public.on_fantasy_experience();

CREATE OR REPLACE FUNCTION public.read_profile_experience(p_user_id uuid,p_kind text DEFAULT NULL,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('totalXp',coalesce(sum(points),0),'watchedCount',count(*) FILTER(WHERE kind='watched'),'correctPredictions',count(*) FILTER(WHERE kind='prediction'),
 'fantasyXp',coalesce(sum(points) FILTER(WHERE kind='fantasy'),0),'fantasyGames',count(*) FILTER(WHERE kind='fantasy'),
 'historyTotal',count(*) FILTER(WHERE p_kind IS NULL OR kind=p_kind),
 'history',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC,e.id DESC) FROM
  (SELECT id,kind,game_id,points,details,created_at FROM public.profile_experience_events WHERE user_id=p_user_id AND (p_kind IS NULL OR kind=p_kind) ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET greatest(p_offset,0)) e),'[]'::jsonb))
 FROM public.profile_experience_events WHERE user_id=p_user_id;
$$;
REVOKE ALL ON FUNCTION public.sync_fantasy_experience(),public.on_fantasy_experience(),public.read_profile_experience(uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_profile_experience(uuid,text,integer) TO service_role;
SELECT public.sync_fantasy_experience();
NOTIFY pgrst,'reload schema';
COMMIT;

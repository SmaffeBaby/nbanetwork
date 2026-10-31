BEGIN;
CREATE INDEX IF NOT EXISTS fantasy_daily_entries_day_mode ON public.fantasy_daily_entries(day,mode);
CREATE OR REPLACE FUNCTION public.fantasy_popularity(p_day date,p_mode text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH scope AS (
 SELECT EXISTS(SELECT 1 FROM fantasy_daily_entries WHERE day=p_day AND mode=p_mode) current_day
 ), entries AS (
 SELECT e.lineup FROM fantasy_daily_entries e,scope s WHERE e.mode=p_mode AND
 ((s.current_day AND e.day=p_day) OR (NOT s.current_day AND e.day>=p_day-29 AND e.day<=p_day))
 ), counts AS (
 SELECT p->>'id' id,count(*) picks FROM entries e CROSS JOIN LATERAL jsonb_array_elements(e.lineup)p GROUP BY p->>'id'
 ) SELECT jsonb_build_object('period',CASE WHEN (SELECT current_day FROM scope) THEN 'day' ELSE '30days' END,
 'sampleSize',(SELECT count(*) FROM entries),'counts',coalesce((SELECT jsonb_object_agg(id,picks) FROM counts),'{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.fantasy_popularity(date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fantasy_popularity(date,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

BEGIN;
CREATE OR REPLACE FUNCTION public.upgrade_fantasy_ratings(p_day date,p_ratings jsonb,p_first_tipoff timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d fantasy_days;
BEGIN
 SELECT * INTO d FROM fantasy_days WHERE day=p_day FOR UPDATE;
 IF NOT FOUND OR d.rating_version NOT IN (1,2) OR d.settled_at IS NOT NULL
    OR p_first_tipoff IS NULL OR clock_timestamp()>=least(p_first_tipoff,d.locks_at)
    OR EXISTS(SELECT 1 FROM jsonb_each(p_ratings) r WHERE r.value->>'version' IS DISTINCT FROM '3')
    OR EXISTS(SELECT 1 FROM fantasy_daily_scores WHERE day=p_day) THEN
  RETURN false;
 END IF;

 WITH removed AS (
  DELETE FROM fantasy_daily_entries e WHERE e.day=p_day AND e.mode='balanced'
   AND (SELECT sum((p_ratings->(p->>'id')->>'ovr')::integer)
        FROM jsonb_array_elements(e.lineup) p)>public.fantasy_ovr_cap()
  RETURNING user_id,day,mode
 )
 INSERT INTO profile_notifications(recipient_id,kind,event_key,payload)
 SELECT user_id,'fantasy_balance_reset','fantasy_balance_reset:v3:'||day||':'||mode,
        jsonb_build_object('to','/fantasy?day='||day||'&mode='||mode,'day',day,'mode',mode)
 FROM removed ON CONFLICT(recipient_id,event_key) DO NOTHING;

 UPDATE fantasy_days SET ratings=p_ratings,rating_version=3 WHERE day=p_day;
 IF clock_timestamp()>=p_first_tipoff THEN
  RAISE EXCEPTION 'Fantasy rating update crossed first tip-off';
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.upgrade_fantasy_ratings(date,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_fantasy_ratings(date,jsonb,timestamptz) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

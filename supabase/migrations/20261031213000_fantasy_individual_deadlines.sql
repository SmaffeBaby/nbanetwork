BEGIN;
-- Keep each frozen OVR snapshot and confirmed lineup. Only entry windows change.
ALTER TABLE public.fantasy_days ADD COLUMN IF NOT EXISTS player_locks jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(player_locks)='object');
GRANT UPDATE(locks_at,player_locks) ON public.fantasy_days TO service_role;
CREATE OR REPLACE FUNCTION public.guard_daily_fantasy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d fantasy_days; p jsonb; r jsonb; total integer:=0; xp numeric; lvl integer; bonuses jsonb:='{}'; canonical jsonb:='[]';
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Fantasy lineup immutable'; END IF;
 SELECT * INTO STRICT d FROM fantasy_days WHERE day=NEW.day FOR SHARE;
 IF clock_timestamp()>=d.locks_at OR clock_timestamp()<d.starts_at-interval '7 days' THEN RAISE EXCEPTION 'Fantasy day locked'; END IF;
 IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(NEW.lineup) x)<>5
 OR (SELECT count(DISTINCT x->>'slot') FROM jsonb_array_elements(NEW.lineup) x WHERE x->>'slot' IN ('PG','SG','SF','PF','C'))<>5 THEN RAISE EXCEPTION 'Invalid lineup'; END IF;
 FOR p IN SELECT * FROM jsonb_array_elements(NEW.lineup) LOOP
  r:=d.ratings->(p->>'id');
  IF r IS NULL OR NOT (r->'positions' ? (p->>'slot')) THEN RAISE EXCEPTION 'Invalid player'; END IF;
  IF d.player_locks->>(p->>'id') IS NULL OR clock_timestamp()>=(d.player_locks->>(p->>'id'))::timestamptz THEN RAISE EXCEPTION 'Player game already started'; END IF;
  total:=total+(r->>'ovr')::integer;
  canonical:=canonical||jsonb_build_array(jsonb_build_object('id',p->>'id','slot',p->>'slot','name',r->>'name','team',r->>'team','ovr',(r->>'ovr')::integer,'scoringPosition',r->>'scoringPosition'));
  SELECT coalesce(sum(a.xp),0) INTO xp FROM fantasy_player_xp_awards a WHERE a.user_id=NEW.user_id AND a.player_id=p->>'id' AND a.period<NEW.day;
  lvl:=floor((1+sqrt(1+xp/37.5))/2)::integer;
  bonuses:=bonuses||jsonb_build_object(p->>'id',jsonb_build_object('level',lvl,'rate',fantasy_bonus_rate(lvl)));
 END LOOP;
 IF NEW.mode='balanced' AND total>public.fantasy_ovr_cap() THEN RAISE EXCEPTION 'OVR cap exceeded'; END IF;
 NEW.lineup:=canonical; NEW.player_bonuses:=bonuses; NEW.confirmed_at:=clock_timestamp();
 -- Recheck after XP queries so a tip-off crossed during validation cannot slip through.
 IF NEW.confirmed_at>=d.locks_at OR EXISTS(
  SELECT 1 FROM jsonb_array_elements(canonical) x
  WHERE d.player_locks->>(x->>'id') IS NULL OR NEW.confirmed_at>=(d.player_locks->>(x->>'id'))::timestamptz
 ) THEN RAISE EXCEPTION 'Player game already started'; END IF;
 RETURN NEW;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;

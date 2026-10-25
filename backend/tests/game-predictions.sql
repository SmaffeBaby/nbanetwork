BEGIN;
INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-00000000abce');
INSERT INTO public.profiles(id,email,first_name) VALUES('00000000-0000-4000-8000-00000000abce','prediction-test@example.invalid','Test');
DO $$
DECLARE result jsonb; owner uuid:='00000000-0000-4000-8000-00000000abce'; rejected boolean:=false;
BEGIN
 PERFORM public.set_game_prediction('espn:499999991',owner,'home',now()+interval '1 day','pre');
 PERFORM public.set_game_prediction('espn:499999991',owner,'away',now()+interval '1 day','pre');
 result:=public.read_game_predictions('espn:499999991',owner);
 IF (result->>'total')::int<>1 OR result->>'viewerVote'<>'away' THEN RAISE EXCEPTION 'Duplicate or lost vote'; END IF;
 IF result->'sides'->'away'->'voters'->0->>'id'<>owner::text THEN RAISE EXCEPTION 'Missing voter profile'; END IF;
 IF public.read_game_predictions('espn:499999991',NULL)->>'viewerVote' IS NOT NULL THEN RAISE EXCEPTION 'Anonymous viewer received a private selection'; END IF;
 BEGIN PERFORM public.set_game_prediction('espn:499999991',owner,'home',now()-interval '1 second','pre'); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Vote after tipoff was accepted'; END IF;
 PERFORM public.set_game_prediction('espn:499999991',owner,NULL,now()+interval '1 day','pre');
 IF (public.read_game_predictions('espn:499999991',owner)->>'total')::int<>0 THEN RAISE EXCEPTION 'Cancel failed'; END IF;
 PERFORM public.set_game_prediction('espn:499999991',owner,'home',now()+interval '1 day','pre');
 UPDATE public.game_prediction_polls SET completed_at=now()-interval '25 hours',state='post' WHERE game_id='espn:499999991';
 INSERT INTO public.game_prediction_polls(game_id,starts_at,completed_at,state) VALUES('espn:499999992',now()-interval '2 hours',now()-interval '1 hour','post');
 PERFORM public.cleanup_game_predictions();
 IF EXISTS(SELECT FROM public.game_predictions WHERE game_id='espn:499999991') OR EXISTS(SELECT FROM public.game_prediction_polls WHERE game_id='espn:499999991') THEN RAISE EXCEPTION 'Expired results not removed'; END IF;
 IF NOT EXISTS(SELECT FROM public.game_prediction_polls WHERE game_id='espn:499999992') THEN RAISE EXCEPTION 'Recent results removed too early'; END IF;
 IF has_function_privilege('authenticated','public.set_game_prediction(text,uuid,text,timestamptz,text)','EXECUTE') THEN RAISE EXCEPTION 'Untrusted role may change another user vote'; END IF;
END $$;
ROLLBACK;

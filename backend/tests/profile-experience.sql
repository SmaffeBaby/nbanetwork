BEGIN;
DO $$
DECLARE owner uuid:=gen_random_uuid(); loser uuid:=gen_random_uuid(); late uuid:=gen_random_uuid(); result jsonb;
        game jsonb:='{"id":"espn:499999981","date":"2026-10-25","awayAbbr":"UTA","homeAbbr":"LAL","awayName":"Jazz","homeName":"Lakers"}';
BEGIN
 INSERT INTO auth.users(id) VALUES(owner),(loser),(late);
 INSERT INTO public.profiles(id,email) VALUES(owner,'xp-owner@example.invalid'),(loser,'xp-loser@example.invalid'),(late,'xp-late@example.invalid');
 PERFORM public.set_profile_game(owner,'favorite',game,true,ARRAY['espn:499999981','499999981']);
 IF (public.read_profile_experience(owner)->>'totalXp')::int<>0 THEN RAISE EXCEPTION 'Favorite incorrectly earned points'; END IF;
 PERFORM public.set_profile_game(owner,'watched',game,true,ARRAY['espn:499999981','499999981']);
 PERFORM public.set_profile_game(owner,'watched',game,true,ARRAY['espn:499999981','499999981']);
 PERFORM public.set_profile_game(owner,'watched',game,false,ARRAY['espn:499999981','499999981']);
 PERFORM public.set_profile_game(owner,'watched',game,true,ARRAY['espn:499999981','499999981']);
 result:=public.read_profile_experience(owner);
 IF (result->>'totalXp')::int<>30 OR (result->>'watchedCount')::int<>1 THEN RAISE EXCEPTION 'Watch toggle farmed XP'; END IF;
 INSERT INTO public.profile_experience_backfill(user_id,original_id,snapshot) VALUES(owner,'0022600001',game);
 PERFORM public.complete_experience_backfill(owner,'0022600001','espn:499999981');
 IF (public.read_profile_experience(owner)->>'totalXp')::int<>30 THEN RAISE EXCEPTION 'Legacy alias earned duplicate XP'; END IF;

 PERFORM public.set_game_prediction('espn:499999982',owner,'home',now()+interval '1 day','pre');
 PERFORM public.set_game_prediction('espn:499999982',loser,'away',now()+interval '1 day','pre');
 PERFORM public.set_game_prediction('espn:499999982',late,'home',now()+interval '1 day','pre');
 UPDATE public.game_predictions SET updated_at=now()-interval '3 hours' WHERE game_id='espn:499999982' AND user_id<>late;
 UPDATE public.game_prediction_polls SET completed_at=now()-interval '2 days',state='post' WHERE game_id='espn:499999982';
 PERFORM public.cleanup_game_predictions();
 IF NOT EXISTS(SELECT 1 FROM public.game_predictions WHERE game_id='espn:499999982') THEN RAISE EXCEPTION 'Unsettled votes were lost'; END IF;
 PERFORM public.settle_game_prediction('espn:499999982',now()-interval '2 hours','home','{"winnerAbbr":"LAL"}');
 PERFORM public.settle_game_prediction('espn:499999982',now()-interval '2 hours','home','{"winnerAbbr":"LAL"}');
 IF (public.read_profile_experience(owner)->>'totalXp')::int<>130 THEN RAISE EXCEPTION 'Correct prediction award missing or duplicated'; END IF;
 IF (public.read_profile_experience(loser)->>'totalXp')::int<>0 OR (public.read_profile_experience(late)->>'totalXp')::int<>0 THEN RAISE EXCEPTION 'Wrong or late prediction earned XP'; END IF;
 PERFORM public.cleanup_game_predictions();
 IF EXISTS(SELECT 1 FROM public.game_predictions WHERE game_id='espn:499999982') THEN RAISE EXCEPTION 'Settled poll not cleaned'; END IF;
 IF (public.read_profile_experience(owner)->>'totalXp')::int<>130 THEN RAISE EXCEPTION 'Cleanup removed earned XP'; END IF;
 PERFORM public.set_game_prediction('espn:499999983',owner,'home',now()+interval '1 day','pre');
 PERFORM public.settle_game_prediction('espn:499999983',now()-interval '2 hours',NULL,'{}');
 IF (public.read_profile_experience(owner)->>'totalXp')::int<>130 THEN RAISE EXCEPTION 'Cancelled match earned XP'; END IF;

 INSERT INTO public.profile_experience_events(user_id,kind,game_id,points)
 SELECT owner,'watched','espn:'||(499900000+n)::text,30 FROM generate_series(1,22) n;
 result:=public.read_profile_experience(owner,'watched',20);
 IF (result->>'historyTotal')::int<>23 OR jsonb_array_length(result->'history')<>3 THEN RAISE EXCEPTION 'History pagination/filter broken'; END IF;
 IF (result->>'totalXp')::int<>790 THEN RAISE EXCEPTION 'History filter changed overall total'; END IF;
 IF has_function_privilege('authenticated','public.settle_game_prediction(text,timestamptz,text,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.set_profile_game(uuid,text,jsonb,boolean,text[])','EXECUTE') THEN RAISE EXCEPTION 'Users can forge points'; END IF;
 UPDATE public.profiles SET telegram_url='https://t.me/example',instagram_url='https://www.instagram.com/example/' WHERE id=owner;
 BEGIN
  UPDATE public.profiles SET telegram_url='javascript:alert(1)' WHERE id=owner;
  RAISE EXCEPTION 'Unsafe social URL accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.profile_experience_events(user_id,kind,game_id,points) VALUES(gen_random_uuid(),'watched','espn:499999999',30);
  RAISE EXCEPTION 'Untrusted XP insert succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
ROLLBACK;

BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-00000000abcd');
INSERT INTO public.profiles(id,email,favorites_games,watched_games) VALUES (
 '00000000-0000-4000-8000-00000000abcd','game-marks-test@example.invalid',
 '[{"id":"0022600001"},{"id":"401810001"},{"id":"espn:401810002"}]',
 '[{"id":"0022600001"}]');
DO $$
DECLARE result jsonb; aliases text[] := ARRAY['0022600001','401810001','espn:401810001']; game jsonb := '{"id":"espn:401810001","source":"espn"}';
BEGIN
 result:=public.set_profile_game('00000000-0000-4000-8000-00000000abcd','favorite',game,true,aliases);
 IF jsonb_array_length(result->'favoriteGames')<>2 OR result->'watchedGames'->0->>'id'<>'espn:401810001' THEN RAISE EXCEPTION 'Legacy duplicates were not canonicalized'; END IF;
 result:=public.set_profile_game('00000000-0000-4000-8000-00000000abcd','favorite',game,true,aliases);
 IF jsonb_array_length(result->'favoriteGames')<>2 THEN RAISE EXCEPTION 'Retry duplicated mark'; END IF;
 result:=public.set_profile_game('00000000-0000-4000-8000-00000000abcd','watched',game,false,aliases);
 IF jsonb_array_length(result->'watchedGames')<>0 OR jsonb_array_length(result->'favoriteGames')<>2 THEN RAISE EXCEPTION 'Watched removal changed favorites'; END IF;
 result:=public.set_profile_game('00000000-0000-4000-8000-00000000abcd','watched','{"id":"espn:401810003"}',true,ARRAY['espn:401810003']);
 IF jsonb_array_length(result->'watchedGames')<>1 OR jsonb_array_length(result->'favoriteGames')<>2 THEN RAISE EXCEPTION 'Independent updates were lost'; END IF;
 IF has_function_privilege('authenticated','public.set_profile_game(uuid,text,jsonb,boolean,text[])','EXECUTE') THEN RAISE EXCEPTION 'Untrusted client may call privileged function'; END IF;
END $$;
ROLLBACK;

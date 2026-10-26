BEGIN;
SELECT set_config('basketsfera.experience_initial', (to_regclass('public.profile_experience_events') IS NULL)::text, true);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url text;
DO $$ BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_telegram_url_check CHECK (telegram_url IS NULL OR telegram_url ~ '^https://t[.]me/[A-Za-z0-9_]{1,64}$'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_instagram_url_check CHECK (instagram_url IS NULL OR instagram_url ~ '^https://www[.]instagram[.]com/[A-Za-z0-9_.]{1,30}/$'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profile_experience_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('watched','prediction')),
 game_id text NOT NULL CHECK (game_id ~ '^espn:[0-9]{9}$'),
 points integer NOT NULL CHECK ((kind='watched' AND points=30) OR (kind='prediction' AND points=100)),
 details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,kind,game_id)
);
CREATE INDEX IF NOT EXISTS profile_experience_history_idx ON public.profile_experience_events(user_id,created_at DESC,id DESC);
ALTER TABLE public.profile_experience_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_experience_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.profile_experience_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.profile_experience_events_id_seq TO service_role;

-- Capture only the watched list that existed at migration time. Legacy IDs are resolved by the worker.
CREATE TABLE IF NOT EXISTS public.profile_experience_backfill (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 original_id text NOT NULL,
 snapshot jsonb NOT NULL,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,original_id)
);
ALTER TABLE public.profile_experience_backfill ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_experience_backfill FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.profile_experience_backfill TO service_role;
DO $$ BEGIN IF current_setting('basketsfera.experience_initial')='true' THEN
INSERT INTO public.profile_experience_events(user_id,kind,game_id,points,details)
 SELECT p.id,'watched','espn:'||regexp_replace(g->>'id','^espn:',''),30,g||'{"backfilled":true}'::jsonb
 FROM public.profiles p CROSS JOIN LATERAL jsonb_array_elements(p.watched_games) g
 WHERE g->>'id' ~ '^(espn:)?[0-9]{9}$'
 ON CONFLICT(user_id,kind,game_id) DO NOTHING;
INSERT INTO public.profile_experience_backfill(user_id,original_id,snapshot)
 SELECT p.id,g->>'id',g FROM public.profiles p CROSS JOIN LATERAL jsonb_array_elements(p.watched_games) g
 WHERE g->>'id' ~ '^(nba:)?[0-9]{8,10}$' AND g->>'id' !~ '^[0-9]{9}$'
 ON CONFLICT DO NOTHING;
END IF; END $$;

CREATE OR REPLACE FUNCTION public.set_profile_game(p_user_id uuid,p_kind text,p_game jsonb,p_active boolean,p_aliases text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.profiles%ROWTYPE; fav jsonb; watched jsonb; was_fav boolean; was_watched boolean;
BEGIN
 IF p_kind NOT IN ('favorite','watched') OR coalesce(p_game->>'id','') !~ '^espn:[0-9]{9}$' THEN RAISE EXCEPTION 'Invalid game mark'; END IF;
 SELECT * INTO STRICT p FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(p.favorites_games) x WHERE x->>'id'=ANY(p_aliases)) INTO was_fav;
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(p.watched_games) x WHERE x->>'id'=ANY(p_aliases)) INTO was_watched;
 SELECT coalesce(jsonb_agg(x),'[]'::jsonb) INTO fav FROM jsonb_array_elements(p.favorites_games) x WHERE NOT coalesce(x->>'id'=ANY(p_aliases),false);
 SELECT coalesce(jsonb_agg(x),'[]'::jsonb) INTO watched FROM jsonb_array_elements(p.watched_games) x WHERE NOT coalesce(x->>'id'=ANY(p_aliases),false);
 IF (p_kind='favorite' AND p_active) OR (p_kind<>'favorite' AND was_fav) THEN fav:=fav||jsonb_build_array(p_game); END IF;
 IF (p_kind='watched' AND p_active) OR (p_kind<>'watched' AND was_watched) THEN watched:=watched||jsonb_build_array(p_game); END IF;
 UPDATE public.profiles SET favorites_games=fav,watched_games=watched WHERE id=p_user_id;
 IF p_kind='watched' AND p_active THEN
  INSERT INTO public.profile_experience_events(user_id,kind,game_id,points,details) VALUES(p_user_id,'watched',p_game->>'id',30,p_game) ON CONFLICT(user_id,kind,game_id) DO NOTHING;
 END IF;
 RETURN jsonb_build_object('favoriteGames',fav,'watchedGames',watched);
END $$;

ALTER FUNCTION public.set_profile_game(uuid,text,jsonb,boolean,text[]) OWNER TO supabase_admin;

CREATE OR REPLACE FUNCTION public.complete_experience_backfill(p_user_id uuid,p_original_id text,p_game_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profile_experience_events(user_id,kind,game_id,points,details)
 SELECT user_id,'watched',p_game_id,30,snapshot||'{"backfilled":true}'::jsonb FROM public.profile_experience_backfill
 WHERE user_id=p_user_id AND original_id=p_original_id
 ON CONFLICT(user_id,kind,game_id) DO NOTHING;
 DELETE FROM public.profile_experience_backfill WHERE user_id=p_user_id AND original_id=p_original_id;
END $$;

ALTER TABLE public.game_prediction_polls ADD COLUMN IF NOT EXISTS result_settled_at timestamptz;
ALTER TABLE public.game_prediction_polls ADD COLUMN IF NOT EXISTS winner_side text CHECK (winner_side IN ('home','away'));
CREATE OR REPLACE FUNCTION public.settle_game_prediction(p_game_id text,p_starts_at timestamptz,p_winner_side text,p_details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE poll public.game_prediction_polls%ROWTYPE;
BEGIN
 IF p_winner_side IS NOT NULL AND p_winner_side NOT IN ('home','away') THEN RAISE EXCEPTION 'Invalid winner'; END IF;
 SELECT * INTO poll FROM public.game_prediction_polls WHERE game_id=p_game_id FOR UPDATE;
 IF NOT FOUND OR poll.result_settled_at IS NOT NULL THEN RETURN; END IF;
 UPDATE public.game_prediction_polls SET starts_at=p_starts_at,state='post',completed_at=coalesce(completed_at,now()),checked_at=now(),winner_side=p_winner_side,result_settled_at=now() WHERE game_id=p_game_id;
 IF p_winner_side IS NOT NULL THEN
  INSERT INTO public.profile_experience_events(user_id,kind,game_id,points,details)
  SELECT user_id,'prediction',p_game_id,100,p_details FROM public.game_predictions WHERE game_id=p_game_id AND side=p_winner_side AND updated_at<p_starts_at
  ON CONFLICT(user_id,kind,game_id) DO NOTHING;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.cleanup_game_predictions() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 DELETE FROM public.game_prediction_polls WHERE completed_at<now()-interval '1 day' AND result_settled_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.read_profile_experience(p_user_id uuid,p_kind text DEFAULT NULL,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('totalXp',coalesce(sum(points),0),'watchedCount',count(*) FILTER(WHERE kind='watched'),'correctPredictions',count(*) FILTER(WHERE kind='prediction'),
 'historyTotal',count(*) FILTER(WHERE p_kind IS NULL OR kind=p_kind),
 'history',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC,e.id DESC) FROM
  (SELECT id,kind,game_id,points,details,created_at FROM public.profile_experience_events WHERE user_id=p_user_id AND (p_kind IS NULL OR kind=p_kind) ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET greatest(p_offset,0)) e),'[]'::jsonb))
 FROM public.profile_experience_events WHERE user_id=p_user_id;
$$;
REVOKE ALL ON FUNCTION public.complete_experience_backfill(uuid,text,text),public.settle_game_prediction(text,timestamptz,text,jsonb),public.read_profile_experience(uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_experience_backfill(uuid,text,text),public.settle_game_prediction(text,timestamptz,text,jsonb),public.read_profile_experience(uuid,text,integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS public.game_prediction_polls (
 game_id text PRIMARY KEY CHECK(game_id ~ '^espn:[0-9]{9}$'),
 starts_at timestamptz NOT NULL,
 state text NOT NULL DEFAULT 'pre',
 completed_at timestamptz,
 checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.game_predictions (
 game_id text NOT NULL REFERENCES public.game_prediction_polls(game_id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 side text NOT NULL CHECK(side IN ('home','away')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(game_id,user_id)
);
CREATE INDEX IF NOT EXISTS game_predictions_side_idx ON public.game_predictions(game_id,side,updated_at DESC);
ALTER TABLE public.game_prediction_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_predictions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.game_prediction_polls,public.game_predictions TO service_role;
CREATE OR REPLACE FUNCTION public.set_game_prediction(p_game_id text,p_user_id uuid,p_side text,p_starts_at timestamptz,p_state text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE poll public.game_prediction_polls%ROWTYPE;
BEGIN
 IF p_state<>'pre' OR p_starts_at<=clock_timestamp() OR (p_side IS NOT NULL AND p_side NOT IN ('home','away')) THEN RAISE EXCEPTION 'Голосование завершено'; END IF;
 INSERT INTO public.game_prediction_polls(game_id,starts_at,state) VALUES(p_game_id,p_starts_at,p_state)
 ON CONFLICT(game_id) DO UPDATE SET starts_at=excluded.starts_at,checked_at=now() WHERE game_prediction_polls.state='pre';
 SELECT * INTO STRICT poll FROM public.game_prediction_polls WHERE game_id=p_game_id FOR UPDATE;
 IF poll.state<>'pre' OR poll.completed_at IS NOT NULL OR poll.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'Голосование завершено'; END IF;
 IF p_side IS NULL THEN DELETE FROM public.game_predictions WHERE game_id=p_game_id AND user_id=p_user_id;
 ELSE INSERT INTO public.game_predictions(game_id,user_id,side) VALUES(p_game_id,p_user_id,p_side)
 ON CONFLICT(game_id,user_id) DO UPDATE SET side=excluded.side,updated_at=now(); END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.read_game_predictions(p_game_id text,p_user_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
 'total',(SELECT count(*) FROM public.game_predictions WHERE game_id=p_game_id),
 'viewerVote',(SELECT side FROM public.game_predictions WHERE game_id=p_game_id AND user_id=p_user_id),
 'sides',coalesce((SELECT jsonb_object_agg(s.side,jsonb_build_object('count',(SELECT count(*) FROM public.game_predictions v WHERE v.game_id=p_game_id AND v.side=s.side),
 'voters',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.user_id,'name',trim(p.first_name||' '||p.last_name),'avatar',p.avatar_img))
 FROM (SELECT user_id FROM public.game_predictions WHERE game_id=p_game_id AND side=s.side ORDER BY updated_at DESC LIMIT 24) v
 JOIN public.profiles p ON p.id=v.user_id),'[]'::jsonb))) FROM (VALUES('away'),('home')) s(side)),'{}'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.set_game_prediction(text,uuid,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.read_game_predictions(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_game_prediction(text,uuid,text,timestamptz,text),public.read_game_predictions(text,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.cleanup_game_predictions() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 DELETE FROM public.game_prediction_polls WHERE completed_at < now()-interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.cleanup_game_predictions() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_game_predictions() TO service_role;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='cleanup-game-predictions';
SELECT cron.schedule('cleanup-game-predictions','*/15 * * * *',$$SELECT public.cleanup_game_predictions();$$);
NOTIFY pgrst,'reload schema';
COMMIT;

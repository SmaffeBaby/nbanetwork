BEGIN;
-- A row lock makes independent tab/device updates atomic. Only the trusted API may call it.
CREATE OR REPLACE FUNCTION public.set_profile_game(
 p_user_id uuid, p_kind text, p_game jsonb, p_active boolean, p_aliases text[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE; fav jsonb; watched jsonb; was_fav boolean; was_watched boolean;
BEGIN
 IF p_kind NOT IN ('favorite','watched') OR p_game->>'id' !~ '^espn:[0-9]{9}$' THEN
   RAISE EXCEPTION 'Invalid game mark';
 END IF;
 SELECT * INTO STRICT p FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(p.favorites_games) x WHERE x->>'id'=ANY(p_aliases)) INTO was_fav;
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(p.watched_games) x WHERE x->>'id'=ANY(p_aliases)) INTO was_watched;
 SELECT coalesce(jsonb_agg(x),'[]'::jsonb) INTO fav FROM jsonb_array_elements(p.favorites_games) x WHERE NOT coalesce(x->>'id'=ANY(p_aliases),false);
 SELECT coalesce(jsonb_agg(x),'[]'::jsonb) INTO watched FROM jsonb_array_elements(p.watched_games) x WHERE NOT coalesce(x->>'id'=ANY(p_aliases),false);
 IF (p_kind='favorite' AND p_active) OR (p_kind<>'favorite' AND was_fav) THEN fav := fav || jsonb_build_array(p_game); END IF;
 IF (p_kind='watched' AND p_active) OR (p_kind<>'watched' AND was_watched) THEN watched := watched || jsonb_build_array(p_game); END IF;
 UPDATE public.profiles SET favorites_games=fav,watched_games=watched WHERE id=p_user_id;
 RETURN jsonb_build_object('favoriteGames',fav,'watchedGames',watched);
END; $$;
REVOKE ALL ON FUNCTION public.set_profile_game(uuid,text,jsonb,boolean,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_game(uuid,text,jsonb,boolean,text[]) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

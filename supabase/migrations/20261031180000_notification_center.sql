BEGIN;
CREATE TABLE IF NOT EXISTS public.notification_preferences (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 game_comments boolean NOT NULL DEFAULT true, articles boolean NOT NULL DEFAULT true, article_comments boolean NOT NULL DEFAULT true,
 actor_mode text NOT NULL DEFAULT 'all' CHECK(actor_mode IN ('all','selected')), actor_ids uuid[] NOT NULL DEFAULT '{}',
 fantasy boolean NOT NULL DEFAULT false, fantasy_since timestamptz,
 game_results boolean NOT NULL DEFAULT false, results_since timestamptz,
 result_favorites boolean NOT NULL DEFAULT true, result_teams boolean NOT NULL DEFAULT false, result_predictions boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.profile_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 kind text NOT NULL CHECK(kind IN ('game_comment','article_published','article_comment','fantasy_lineup','fantasy_game','fantasy_final','game_result')),
 event_key text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 read_at timestamptz, dismissed_at timestamptz, UNIQUE(recipient_id,event_key)
);
CREATE INDEX IF NOT EXISTS profile_notifications_inbox ON public.profile_notifications(recipient_id,created_at DESC) WHERE dismissed_at IS NULL;
CREATE TABLE IF NOT EXISTS public.notification_game_watches (
 game_id text PRIMARY KEY CHECK(game_id ~ '^espn:[0-9]{9}$'), starts_at timestamptz NOT NULL,
 checked_at timestamptz, finished_at timestamptz
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_game_watches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences,public.profile_notifications,public.notification_game_watches FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.notification_preferences,public.profile_notifications,public.notification_game_watches TO service_role;

CREATE OR REPLACE FUNCTION public.read_notification_preferences(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('activity',p.notify_followed_comments,'game_comments',coalesce(n.game_comments,true),'articles',coalesce(n.articles,true),
 'article_comments',coalesce(n.article_comments,true),'actor_mode',coalesce(n.actor_mode,'all'),'actor_ids',coalesce(to_jsonb(n.actor_ids),'[]'::jsonb),
 'fantasy',coalesce(n.fantasy,false),'game_results',coalesce(n.game_results,false),
 'result_favorites',coalesce(n.result_favorites,true),'result_teams',coalesce(n.result_teams,false),'result_predictions',coalesce(n.result_predictions,true))
 FROM profiles p LEFT JOIN notification_preferences n ON n.user_id=p.id WHERE p.id=p_user;
$$;
CREATE OR REPLACE FUNCTION public.save_notification_preferences(p_user uuid,p_settings jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous notification_preferences; ids uuid[];
BEGIN
 PERFORM 1 FROM profiles WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
 SELECT * INTO previous FROM notification_preferences WHERE user_id=p_user;
 SELECT coalesce(array_agg(DISTINCT x.value::uuid),'{}') INTO ids FROM jsonb_array_elements_text(p_settings->'actor_ids') x
 WHERE EXISTS(SELECT 1 FROM profile_follows f WHERE f.follower_id=p_user AND f.following_id=x.value::uuid);
 INSERT INTO notification_preferences(user_id,game_comments,articles,article_comments,actor_mode,actor_ids,fantasy,fantasy_since,game_results,results_since,result_favorites,result_teams,result_predictions)
 VALUES(p_user,(p_settings->>'game_comments')::boolean,(p_settings->>'articles')::boolean,(p_settings->>'article_comments')::boolean,p_settings->>'actor_mode',ids,
 (p_settings->>'fantasy')::boolean,CASE WHEN (p_settings->>'fantasy')::boolean THEN CASE WHEN previous.fantasy THEN previous.fantasy_since ELSE clock_timestamp() END END,
 (p_settings->>'game_results')::boolean,CASE WHEN (p_settings->>'game_results')::boolean THEN CASE WHEN previous.game_results THEN previous.results_since ELSE clock_timestamp() END END,
 (p_settings->>'result_favorites')::boolean,(p_settings->>'result_teams')::boolean,(p_settings->>'result_predictions')::boolean)
 ON CONFLICT(user_id) DO UPDATE SET game_comments=excluded.game_comments,articles=excluded.articles,article_comments=excluded.article_comments,actor_mode=excluded.actor_mode,actor_ids=excluded.actor_ids,
 fantasy=excluded.fantasy,fantasy_since=excluded.fantasy_since,game_results=excluded.game_results,results_since=excluded.results_since,result_favorites=excluded.result_favorites,result_teams=excluded.result_teams,result_predictions=excluded.result_predictions;
 UPDATE profiles SET notify_followed_comments=(p_settings->>'activity')::boolean WHERE id=p_user;
 RETURN read_notification_preferences(p_user);
END $$;
CREATE OR REPLACE FUNCTION public.notification_activity_allowed(p_user uuid,p_actor uuid,p_kind text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM profiles p LEFT JOIN notification_preferences n ON n.user_id=p.id
 JOIN profile_follows f ON f.follower_id=p.id AND f.following_id=p_actor
 WHERE p.id=p_user AND p.id<>p_actor AND p.notify_followed_comments
 AND (coalesce(n.actor_mode,'all')='all' OR p_actor=ANY(n.actor_ids))
 AND CASE p_kind WHEN 'game_comment' THEN coalesce(n.game_comments,true) WHEN 'article_published' THEN coalesce(n.articles,true) WHEN 'article_comment' THEN coalesce(n.article_comments,true) ELSE false END);
$$;
CREATE OR REPLACE FUNCTION public.notify_social_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid; kind_value text; key_value text; body jsonb; slug_value text;
BEGIN
 IF TG_TABLE_NAME='game_comments' THEN
  actor:=NEW.user_id;kind_value:='game_comment';key_value:='game_comment:'||NEW.id;
  body:=jsonb_build_object('to','/game/'||replace(NEW.game_id,'espn:',''),'gameId',NEW.game_id);
 ELSIF TG_TABLE_NAME='news_articles' THEN
  IF NOT NEW.published OR (TG_OP='UPDATE' AND OLD.published) THEN RETURN NEW; END IF;
  actor:=NEW.author_id;kind_value:='article_published';key_value:='article_published:'||NEW.id;
  body:=jsonb_build_object('to','/news/'||NEW.slug,'articleId',NEW.id);
 ELSE
  SELECT a.slug INTO slug_value FROM news_articles a WHERE a.id=NEW.article_id AND a.published;
  IF NOT FOUND THEN RETURN NEW; END IF;
  actor:=NEW.user_id;kind_value:='article_comment';key_value:='article_comment:'||NEW.id;
  body:=jsonb_build_object('to','/news/'||slug_value,'articleId',NEW.article_id);
 END IF;
 INSERT INTO profile_notifications(recipient_id,actor_id,kind,event_key,payload)
 SELECT f.follower_id,actor,kind_value,key_value,body FROM profile_follows f WHERE f.following_id=actor AND notification_activity_allowed(f.follower_id,actor,kind_value)
 ON CONFLICT(recipient_id,event_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notification_social_comment ON public.game_comments;
CREATE TRIGGER notification_social_comment AFTER INSERT ON public.game_comments FOR EACH ROW EXECUTE FUNCTION public.notify_social_activity();
DROP TRIGGER IF EXISTS notification_social_article ON public.news_articles;
CREATE TRIGGER notification_social_article AFTER INSERT OR UPDATE OF published ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.notify_social_activity();
DROP TRIGGER IF EXISTS notification_social_article_comment ON public.news_article_comments;
CREATE TRIGGER notification_social_article_comment AFTER INSERT ON public.news_article_comments FOR EACH ROW EXECUTE FUNCTION public.notify_social_activity();

-- A durable cutoff makes repeated deployments import the same legacy set only.
CREATE TABLE IF NOT EXISTS public.notification_center_bootstrap (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), legacy_cutoff timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.notification_center_bootstrap ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_center_bootstrap FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO public.notification_center_bootstrap(singleton) VALUES(true) ON CONFLICT DO NOTHING;
-- Preserve the existing inbox and read state. Do not replay historical activity.
INSERT INTO profile_notifications(recipient_id,actor_id,kind,event_key,payload,created_at,read_at)
 SELECT recipient_id,actor_id,'game_comment','game_comment:'||comment_id,jsonb_build_object('to','/game/'||replace(game_id,'espn:',''),'gameId',game_id),created_at,read_at
 FROM profile_comment_notifications WHERE created_at<=(SELECT legacy_cutoff FROM notification_center_bootstrap) ON CONFLICT(recipient_id,event_key) DO NOTHING;
INSERT INTO profile_notifications(recipient_id,actor_id,kind,event_key,payload,created_at,read_at)
 SELECT n.recipient_id,n.actor_id,n.kind,n.kind||':'||CASE WHEN n.kind='article_comment' THEN n.comment_id::text ELSE n.article_id::text END,
 jsonb_build_object('to','/news/'||a.slug,'articleId',n.article_id),n.created_at,n.read_at FROM profile_news_notifications n JOIN news_articles a ON a.id=n.article_id
 WHERE n.created_at<=(SELECT legacy_cutoff FROM notification_center_bootstrap) AND (n.kind<>'article_comment' OR n.comment_id IS NOT NULL)
 ON CONFLICT(recipient_id,event_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_fantasy_entry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO profile_notifications(recipient_id,kind,event_key,payload)
 SELECT NEW.user_id,'fantasy_lineup','fantasy_lineup:'||NEW.day||':'||NEW.mode,
 jsonb_build_object('to','/fantasy?day='||NEW.day||'&mode='||NEW.mode,'day',NEW.day,'mode',NEW.mode)
 FROM notification_preferences n WHERE n.user_id=NEW.user_id AND n.fantasy AND NEW.confirmed_at>=n.fantasy_since
 ON CONFLICT(recipient_id,event_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notification_fantasy_entry ON public.fantasy_daily_entries;
CREATE TRIGGER notification_fantasy_entry AFTER INSERT ON public.fantasy_daily_entries FOR EACH ROW EXECUTE FUNCTION public.notify_fantasy_entry();
CREATE OR REPLACE FUNCTION public.notify_fantasy_games() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO profile_notifications(recipient_id,kind,event_key,payload)
 SELECT e.user_id,'fantasy_game','fantasy_game:'||e.day||':'||e.mode||':'||s.game_id,
 jsonb_build_object('to','/fantasy?day='||e.day||'&mode='||e.mode,'day',e.day,'mode',e.mode,'gameId',s.game_id,'points',sum(s.points),'matchup',max(s.stats->>'awayAbbr')||' — '||max(s.stats->>'homeAbbr'))
 FROM fantasy_daily_entries e JOIN notification_preferences n ON n.user_id=e.user_id AND n.fantasy
 JOIN fantasy_daily_scores s ON s.day=e.day AND s.starts_at>=e.confirmed_at AND s.starts_at>=n.fantasy_since
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(e.lineup)p WHERE p->>'id'=s.player_id)
 WHERE (s.day,s.game_id) IN(SELECT DISTINCT day,game_id FROM notification_changed_scores)
 GROUP BY e.user_id,e.day,e.mode,s.game_id
 ON CONFLICT(recipient_id,event_key) DO NOTHING;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS notification_fantasy_games ON public.fantasy_daily_scores;
DROP TRIGGER IF EXISTS notification_fantasy_games_insert ON public.fantasy_daily_scores;
DROP TRIGGER IF EXISTS notification_fantasy_games_update ON public.fantasy_daily_scores;
CREATE TRIGGER notification_fantasy_games_insert AFTER INSERT ON public.fantasy_daily_scores REFERENCING NEW TABLE AS notification_changed_scores FOR EACH STATEMENT EXECUTE FUNCTION public.notify_fantasy_games();
CREATE TRIGGER notification_fantasy_games_update AFTER UPDATE ON public.fantasy_daily_scores REFERENCING NEW TABLE AS notification_changed_scores FOR EACH STATEMENT EXECUTE FUNCTION public.notify_fantasy_games();
CREATE OR REPLACE FUNCTION public.notify_fantasy_final() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.settled_at IS NULL OR OLD.settled_at IS NOT NULL THEN RETURN NEW; END IF;
 INSERT INTO profile_notifications(recipient_id,kind,event_key,payload)
 SELECT r.user_id,'fantasy_final','fantasy_final:'||NEW.day||':'||r.mode,
 jsonb_build_object('to','/fantasy?day='||NEW.day||'&mode='||r.mode,'day',NEW.day,'mode',r.mode,'points',r.points,'rank',r.rank)
 FROM (SELECT f.*,rank() OVER(PARTITION BY mode ORDER BY points DESC) rank FROM fantasy_daily_results f WHERE week=NEW.day) r
 JOIN notification_preferences n ON n.user_id=r.user_id AND n.fantasy AND NEW.locks_at>=n.fantasy_since
 ON CONFLICT(recipient_id,event_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notification_fantasy_final ON public.fantasy_days;
CREATE TRIGGER notification_fantasy_final AFTER UPDATE OF settled_at ON public.fantasy_days FOR EACH ROW EXECUTE FUNCTION public.notify_fantasy_final();

CREATE OR REPLACE FUNCTION public.publish_notification_result(p_game text,p_start timestamptz,p_payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO profile_notifications(recipient_id,kind,event_key,payload)
 SELECT p.id,'game_result','game_result:'||p_game,p_payload||jsonb_build_object('gameId',p_game,'to','/game/'||replace(p_game,'espn:',''))
 FROM profiles p JOIN notification_preferences n ON n.user_id=p.id AND n.game_results AND p_start>=n.results_since
 WHERE (n.result_favorites AND EXISTS(SELECT 1 FROM jsonb_array_elements(p.favorites_games)g WHERE g->>'id' IN(p_game,replace(p_game,'espn:',''))))
 OR (n.result_teams AND p.favorites_teams && ARRAY[p_payload->>'homeAbbr',p_payload->>'awayAbbr'])
 OR (n.result_predictions AND EXISTS(SELECT 1 FROM game_predictions v WHERE v.user_id=p.id AND v.game_id=p_game))
 ON CONFLICT(recipient_id,event_key) DO NOTHING;
 UPDATE notification_game_watches SET finished_at=clock_timestamp(),checked_at=clock_timestamp() WHERE game_id=p_game;
END $$;
CREATE OR REPLACE FUNCTION public.read_profile_inbox(p_user uuid,p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('asOf',clock_timestamp(),'unreadCount',(SELECT count(*) FROM profile_notifications WHERE recipient_id=p_user AND read_at IS NULL AND dismissed_at IS NULL),
 'notifications',coalesce((SELECT jsonb_agg(r ORDER BY r.created_at DESC,r.id DESC) FROM (
 SELECT n.id,n.kind,n.created_at,n.read_at,
 CASE WHEN coalesce((SELECT hide_scores FROM profiles WHERE id=p_user),true) THEN n.payload-ARRAY['homeScore','awayScore','winnerName','winnerAbbr','winner','points','rank'] ELSE n.payload END payload,
 CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('id',p.id,'first_name',p.first_name,'last_name',p.last_name,'avatar_img',p.avatar_img) END actor
 FROM profile_notifications n LEFT JOIN profiles p ON p.id=n.actor_id WHERE n.recipient_id=p_user AND n.dismissed_at IS NULL
 ORDER BY n.created_at DESC,n.id DESC LIMIT greatest(1,least(p_limit,500)))r),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.read_notification_preferences(uuid),public.save_notification_preferences(uuid,jsonb),public.notification_activity_allowed(uuid,uuid,text),public.notify_social_activity(),public.notify_fantasy_entry(),public.notify_fantasy_games(),public.notify_fantasy_final(),public.publish_notification_result(text,timestamptz,jsonb),public.read_profile_inbox(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_notification_preferences(uuid),public.save_notification_preferences(uuid,jsonb),public.publish_notification_result(text,timestamptz,jsonb),public.read_profile_inbox(uuid,integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;

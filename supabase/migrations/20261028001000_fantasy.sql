BEGIN;
-- Fantasy v1: server-owned lineups and immutable, idempotent game snapshots.
create table if not exists public.fantasy_entries (
 user_id uuid not null references public.profiles(id) on delete cascade,
 week date not null,
 ends_at timestamptz not null,
 confirmed_at timestamptz not null default clock_timestamp(),
 lineup jsonb not null check (jsonb_typeof(lineup) = 'array' and jsonb_array_length(lineup) = 5),
 primary key (user_id, week)
);
create table if not exists public.fantasy_scores (
 week date not null,
 game_id text not null,
 player_id text not null,
 starts_at timestamptz not null,
 observed_at timestamptz not null,
 points numeric not null,
 stats jsonb not null,
 primary key (week, game_id, player_id)
);
create index if not exists fantasy_entries_ends on public.fantasy_entries(ends_at);
alter table public.fantasy_entries enable row level security;
alter table public.fantasy_scores enable row level security;
revoke all on public.fantasy_entries, public.fantasy_scores from public, anon, authenticated;
grant all on public.fantasy_entries, public.fantasy_scores to service_role;

-- The DB clock enforces the deadline even if an upstream request runs late.
create or replace function public.guard_fantasy_write() returns trigger language plpgsql set search_path = public as $$
begin
 if TG_TABLE_NAME = 'fantasy_entries' then
  if TG_OP <> 'INSERT' or new.ends_at <= clock_timestamp() then raise exception 'Fantasy lineup locked'; end if;
  new.confirmed_at := clock_timestamp();
 else
  if clock_timestamp() >= (new.week::timestamp at time zone 'Europe/Moscow') + interval '6 days 20 hours' then raise exception 'Fantasy week closed'; end if;
  new.observed_at := clock_timestamp();
 end if;
 return new;
end $$;
drop trigger if exists fantasy_entry_guard on public.fantasy_entries;
create trigger fantasy_entry_guard before insert or update on public.fantasy_entries for each row execute function public.guard_fantasy_write();
drop trigger if exists fantasy_score_guard on public.fantasy_scores;
create trigger fantasy_score_guard before insert or update on public.fantasy_scores for each row execute function public.guard_fantasy_write();

create or replace view public.fantasy_results with (security_invoker=true) as
 select e.user_id,e.week,e.ends_at,e.confirmed_at,e.lineup,
 coalesce(sum(s.points),0) as points, count(s.game_id) as player_games, max(s.observed_at) as updated_at
 from public.fantasy_entries e
 left join public.fantasy_scores s on s.week=e.week and s.starts_at>=e.confirmed_at and s.starts_at<e.ends_at
 and exists(select 1 from jsonb_array_elements(e.lineup) p where p->>'id'=s.player_id)
 group by e.user_id,e.week;
revoke all on public.fantasy_results from public, anon, authenticated;
grant select on public.fantasy_results to service_role;

create or replace function public.read_fantasy(p_week date, p_user uuid default null) returns jsonb
language sql stable security definer set search_path=public as $$
 with ranked as (
  select r.*, rank() over (partition by week order by points desc) as rank from fantasy_results r
 ), leaders as (
  select r.user_id,r.points,r.rank,r.player_games,p.first_name,p.last_name from ranked r join profiles p on p.id=r.user_id
  where r.week=p_week order by r.points desc,r.confirmed_at,r.user_id limit 100
 ), history as (
  select r.*, (select jsonb_object_agg(p->>'id',coalesce((select sum(s.points) from fantasy_scores s where s.week=r.week and s.player_id=p->>'id' and s.starts_at>=r.confirmed_at and s.starts_at<r.ends_at),0)) from jsonb_array_elements(r.lineup) p) as player_points
  from ranked r where user_id=p_user order by week desc
 ), overall as (
  select r.user_id,sum(r.points) as points,count(*) as weeks from fantasy_results r group by r.user_id
 ), overall_top as (
  select o.*,rank() over(order by o.points desc) as rank,p.first_name,p.last_name from overall o join profiles p on p.id=o.user_id
  order by o.points desc,o.user_id limit 100
 )
 select jsonb_build_object(
  'leaderboard',coalesce((select jsonb_agg(l) from leaders l),'[]'::jsonb),
  'overall',coalesce((select jsonb_agg(o) from overall_top o),'[]'::jsonb),
  'history',coalesce((select jsonb_agg(h) from history h),'[]'::jsonb),
  'participants',(select count(*) from ranked where week=p_week)
 );
$$;
revoke all on function public.read_fantasy(date,uuid) from public,anon,authenticated;
grant execute on function public.read_fantasy(date,uuid) to service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

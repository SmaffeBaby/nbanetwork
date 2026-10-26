begin;
create table if not exists public.auth_email_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('welcome', 'registration_admin')),
  email text not null,
  first_name text not null default '',
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  unique (user_id, kind)
);
alter table public.auth_email_outbox enable row level security;
revoke all on public.auth_email_outbox from public, anon, authenticated;
grant all on public.auth_email_outbox to service_role;
grant usage, select on sequence public.auth_email_outbox_id_seq to service_role;

create or replace function public.complete_verified_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m jsonb := new.raw_user_meta_data;
begin
  -- Existing users are unaffected; new signups carry this explicit version.
  if m->>'registration_version' is distinct from '1' then return new; end if;
  if not coalesce(m->'consents' @> '{"terms":true,"privacy":true,"cookies":true,"trademark":true,"copyright":true,"community":true}'::jsonb, false)
     or coalesce(length(trim(m->>'first_name')), 0) = 0
     or coalesce(length(trim(m->>'last_name')), 0) = 0 then
    raise exception 'Registration requires a name and all policy consents';
  end if;
  if new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;

  insert into public.profiles (id, email, first_name, last_name,
    accepted_terms, accepted_privacy, accepted_cookies, accepted_trademark,
    accepted_copyright, accepted_community_policy, policy_acceptance_version, policy_accepted_at)
  values (new.id, new.email, left(trim(m->>'first_name'),100), left(trim(m->>'last_name'),100),
    true,true,true,true,true,true,1,now()) on conflict (id) do nothing;

  insert into public.auth_email_outbox(user_id,kind,email,first_name)
  values (new.id,'welcome',new.email,left(trim(m->>'first_name'),100)),
         (new.id,'registration_admin',new.email,left(trim(m->>'first_name'),100))
  on conflict (user_id,kind) do nothing;
  return new;
end $$;
revoke all on function public.complete_verified_registration() from public, anon, authenticated;
drop trigger if exists complete_verified_registration on auth.users;
create trigger complete_verified_registration after insert or update of email_confirmed_at on auth.users
for each row execute function public.complete_verified_registration();
notify pgrst, 'reload schema';
commit;

alter table public.profiles
add column if not exists accepted_terms boolean not null default false;

alter table public.profiles
add column if not exists accepted_privacy boolean not null default false;

alter table public.profiles
add column if not exists accepted_cookies boolean not null default false;

alter table public.profiles
add column if not exists accepted_trademark boolean not null default false;

alter table public.profiles
add column if not exists accepted_copyright boolean not null default false;

alter table public.profiles
add column if not exists accepted_community_policy boolean not null default false;

alter table public.profiles
add column if not exists policy_acceptance_version integer not null default 1;

alter table public.profiles
add column if not exists policy_accepted_at timestamptz;

create table if not exists public.patch_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null default '',
  body text not null default '',
  links jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patch_notes_title_not_empty check (length(trim(title)) > 0),
  constraint patch_notes_body_not_empty check (length(trim(body)) > 0),
  constraint patch_notes_links_is_array check (jsonb_typeof(links) = 'array')
);

create index if not exists patch_notes_created_at_idx
on public.patch_notes (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists patch_notes_set_updated_at on public.patch_notes;
create trigger patch_notes_set_updated_at
before update on public.patch_notes
for each row execute function public.set_updated_at();

alter table public.patch_notes enable row level security;

drop policy if exists "Published patch notes are public" on public.patch_notes;
create policy "Published patch notes are public"
on public.patch_notes for select
to anon, authenticated
using (
  published = true
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.admin = true
  )
);

drop policy if exists "Admins can insert patch notes" on public.patch_notes;
create policy "Admins can insert patch notes"
on public.patch_notes for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.admin = true
  )
);

drop policy if exists "Admins can update patch notes" on public.patch_notes;
create policy "Admins can update patch notes"
on public.patch_notes for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.admin = true
  )
);

drop policy if exists "Admins can delete patch notes" on public.patch_notes;
create policy "Admins can delete patch notes"
on public.patch_notes for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.admin = true
  )
);

create table profiles (
  id uuid references auth.users not null,
  updated_at timestamp with time zone,
  username text unique,
  avatar_url text,
  website text,
  favorites_teams text[] not null default '{}',
  favorites_players jsonb not null default '[]'::jsonb,
  favorites_games jsonb not null default '[]'::jsonb,
  watched_games jsonb not null default '[]'::jsonb,
  following_profiles text[] not null default '{}',
  notify_followed_comments boolean not null default false,
  notifications jsonb not null default '[]'::jsonb,
  admin boolean not null default false,

  primary key (id),
  unique(username),
  constraint username_length check (char_length(username) >= 3)
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by the owner."
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Set up Realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table profiles;

create table if not exists profile_comment_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid not null references profiles(id) on delete cascade,
  game_id text not null,
  comment_id uuid not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_id, comment_id)
);

create table if not exists profile_follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_no_self_follow check (follower_id <> following_id)
);

create table if not exists profile_progress_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('watched_games', 'top_team')),
  max_games integer not null check (max_games > 0),
  title text not null default '',
  description text not null default '',
  svg text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, max_games)
);

alter table profile_progress_rules enable row level security;

create policy "Profile progress rules are public"
  on profile_progress_rules for select
  using (true);

create policy "Admins can insert profile progress rules"
  on profile_progress_rules for insert
  with check (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.admin = true
    )
  );

create policy "Admins can update profile progress rules"
  on profile_progress_rules for update
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.admin = true
    )
  )
  with check (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.admin = true
    )
  );

create policy "Admins can delete profile progress rules"
  on profile_progress_rules for delete
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
        and profiles.admin = true
    )
  );

-- Set up Storage
insert into storage.buckets (id, name)
values ('avatars', 'avatars');

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

create policy "Anyone can update an avatar."
  on storage.objects for update
  with check ( bucket_id = 'avatars' );

-- ============================================================
-- Ughelli Vibes TV — Supabase Schema
-- Run this in your Supabase SQL editor or via direct connection
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────
-- One row per auth.users entry. Auto-created by trigger below.
create table if not exists "Profiles" (
  "Id"                              uuid primary key references auth.users(id) on delete cascade,
  name                              text,
  username                          text unique,
  email                             text,
  profile_image                     text,
  verification_token                text,
  verification_token_expires_at     timestamptz,
  reset_token                       text,
  reset_token_expires_at            timestamptz,
  profile_updated_at                timestamptz,
  created_at                        timestamptz not null default now()
);

-- Trigger: auto-insert a Profiles row when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into "Profiles" ("Id", email, name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'username', '')
  )
  on conflict ("Id") do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Post ────────────────────────────────────────────────────
create table if not exists "Post" (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null default 'update',
  category      text,
  headline      text not null,
  text          text,
  image_url     text,
  is_emergency  boolean not null default false,
  shares_count  integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists post_created_at_idx on "Post" (created_at desc, id desc);
create index if not exists post_user_id_idx on "Post" (user_id);

-- ─── Likes ───────────────────────────────────────────────────
create table if not exists "Likes" (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references "Post"(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists likes_post_id_idx on "Likes" (post_id);
create index if not exists likes_user_id_idx on "Likes" (user_id);

-- ─── Comments ────────────────────────────────────────────────
create table if not exists "Comments" (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references "Post"(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  text             text not null,
  reply_to_handle  text,
  created_at       timestamptz not null default now()
);

create index if not exists comments_post_id_idx on "Comments" (post_id);

-- ─── Bookmarks ───────────────────────────────────────────────
create table if not exists "Bookmarks" (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references "Post"(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists bookmarks_user_id_idx on "Bookmarks" (user_id);

-- ─── Follows ─────────────────────────────────────────────────
create table if not exists "Follows" (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null references auth.users(id) on delete cascade,
  following_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (follower_id, following_id)
);

create index if not exists follows_follower_idx on "Follows" (follower_id);
create index if not exists follows_following_idx on "Follows" (following_id);

-- ─── Notifications ───────────────────────────────────────────
create table if not exists "Notifications" (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  actor_id      uuid not null references auth.users(id) on delete cascade,
  type          text not null,
  post_id       uuid references "Post"(id) on delete set null,
  message       text not null,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on "Notifications" (recipient_id, created_at desc);

-- ─── Row Level Security ──────────────────────────────────────
-- Enable RLS on all tables (service role bypasses these automatically)
alter table "Profiles"      enable row level security;
alter table "Post"          enable row level security;
alter table "Likes"         enable row level security;
alter table "Comments"      enable row level security;
alter table "Bookmarks"     enable row level security;
alter table "Follows"       enable row level security;
alter table "Notifications" enable row level security;

-- Service role has full access (used by the API server).
-- These policies are permissive to allow the API to manage data.

-- Profiles: public read, owner write
create policy if not exists "Profiles: public read"
  on "Profiles" for select using (true);
create policy if not exists "Profiles: service role all"
  on "Profiles" for all using (auth.role() = 'service_role');

-- Post: public read, author write
create policy if not exists "Post: public read"
  on "Post" for select using (true);
create policy if not exists "Post: service role all"
  on "Post" for all using (auth.role() = 'service_role');

-- Likes: public read, service write
create policy if not exists "Likes: public read"
  on "Likes" for select using (true);
create policy if not exists "Likes: service role all"
  on "Likes" for all using (auth.role() = 'service_role');

-- Comments: public read, service write
create policy if not exists "Comments: public read"
  on "Comments" for select using (true);
create policy if not exists "Comments: service role all"
  on "Comments" for all using (auth.role() = 'service_role');

-- Bookmarks: owner read, service write
create policy if not exists "Bookmarks: service role all"
  on "Bookmarks" for all using (auth.role() = 'service_role');

-- Follows: public read, service write
create policy if not exists "Follows: public read"
  on "Follows" for select using (true);
create policy if not exists "Follows: service role all"
  on "Follows" for all using (auth.role() = 'service_role');

-- Notifications: owner read, service write
create policy if not exists "Notifications: service role all"
  on "Notifications" for all using (auth.role() = 'service_role');

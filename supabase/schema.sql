-- Atlas backend on Supabase (free plan). Run once in Supabase → SQL Editor.
-- Safe to re-run: everything is "create or replace" / "if not exists".
--
-- What lives here:
--   profiles     one row per signed-up user: language, recommendation prefs,
--                newsletter flag, plan (free / pro, set only by the payment webhook)
--   collections  user-made lists of sites that can be shared by link
--   public_stats()            → { members } for the footer counter
--   newsletter_unsubscribe()  → one-click unsubscribe from the email link
-- "Online now" uses Supabase Realtime Presence and needs no table.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  lang        text not null default 'en' check (lang in ('en', 'ru')),
  prefs       jsonb not null default '{}'::jsonb,
  newsletter  boolean not null default false,
  unsub_token uuid not null default gen_random_uuid(),
  plan        text not null default 'free' check (plan in ('free', 'pro')),
  plan_until  timestamptz,
  customer_id text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- users may change only these columns; plan / plan_until / customer_id are
-- written by the payment webhook with the service-role key
revoke update on public.profiles from authenticated, anon;
grant update (lang, prefs, newsletter) on public.profiles to authenticated;

-- a profile is created with the account. Sign-up metadata (from the
-- newsletter form or the account page) sets the language and the newsletter flag.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, lang, newsletter)
  values (
    new.id,
    new.email,
    case when new.raw_user_meta_data->>'lang' = 'ru' then 'ru' else 'en' end,
    coalesce((new.raw_user_meta_data->>'newsletter')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep the email copy in sync when a user changes it
create or replace function public.handle_user_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email on auth.users;
create trigger on_auth_user_email
  after update of email on auth.users
  for each row execute function public.handle_user_email();

-- true while a Pro subscription is paid up
create or replace function public.is_pro(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = uid and plan = 'pro' and (plan_until is null or plan_until > now())
  );
$$;

-- ------------------------------------------------------------- collections
create table if not exists public.collections (
  id         text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  owner      uuid not null default auth.uid() references auth.users on delete cascade,
  title      text not null check (char_length(title) between 1 and 80),
  note       text check (note is null or char_length(note) <= 500),
  tool_ids   text[] not null check (cardinality(tool_ids) between 1 and 50),
  is_public  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collections_owner on public.collections (owner);

alter table public.collections enable row level security;

-- anyone with the link can open a public collection; private ones (Pro) only the owner
drop policy if exists "read collections" on public.collections;
create policy "read collections" on public.collections
  for select using (is_public or owner = auth.uid());

drop policy if exists "insert own collections" on public.collections;
create policy "insert own collections" on public.collections
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "update own collections" on public.collections;
create policy "update own collections" on public.collections
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "delete own collections" on public.collections;
create policy "delete own collections" on public.collections
  for delete to authenticated using (owner = auth.uid());

-- Free accounts keep up to 3 collections in the cloud and only public ones.
-- Pro: unlimited and private. (Link-only collections need no account at all.)
create or replace function public.collections_limits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_pro(new.owner) then return new; end if;
  if not new.is_public then
    raise exception 'private collections need Pro' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and (select count(*) from collections where owner = new.owner) >= 3 then
    raise exception 'free accounts keep up to 3 collections' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists collections_limits on public.collections;
create trigger collections_limits
  before insert or update on public.collections
  for each row execute function public.collections_limits();

-- ------------------------------------------------------------------ RPCs
-- footer counter: how many people have an account (no personal data leaves)
create or replace function public.public_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('members', (select count(*) from profiles));
$$;
grant execute on function public.public_stats() to anon, authenticated;

-- unsubscribe link in every newsletter: /newsletter/?unsubscribe=<token>
create or replace function public.newsletter_unsubscribe(token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update profiles set newsletter = false where unsub_token = token;
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.newsletter_unsubscribe(uuid) to anon, authenticated;

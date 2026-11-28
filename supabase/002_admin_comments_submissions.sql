-- Atlas: admin role, site submissions, comments with silent moderation.
-- Run once in Supabase → SQL Editor, after schema.sql. Safe to re-run.

-- ------------------------------------------------------------- admin role
alter table public.profiles add column if not exists is_admin boolean not null default false;
-- name shown under comments; users may change it on /account/
alter table public.profiles add column if not exists display_name text
  check (display_name is null or char_length(display_name) between 1 and 40);
grant update (display_name) on public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admin reads profiles" on public.profiles;
create policy "admin reads profiles" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "admin reads collections" on public.collections;
create policy "admin reads collections" on public.collections
  for select to authenticated using (public.is_admin());

-- admin: change a user's plan by hand (gift Pro, take it back)
create or replace function public.admin_set_plan(uid uuid, new_plan text, until timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update profiles set plan = new_plan, plan_until = until where id = uid;
end $$;
grant execute on function public.admin_set_plan(uuid, text, timestamptz) to authenticated;

-- admin: turn the newsletter off for someone (e.g. on request)
create or replace function public.admin_set_newsletter(uid uuid, on_ boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update profiles set newsletter = on_ where id = uid;
end $$;
grant execute on function public.admin_set_newsletter(uuid, boolean) to authenticated;

-- ---------------------------------------------- simple per-IP rate limit
-- PostgREST passes request headers; the first X-Forwarded-For hop is the visitor.
create or replace function public.client_ip()
returns text language sql stable as $$
  select split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1);
$$;

-- ------------------------------------------------------------ submissions
create table if not exists public.submissions (
  id         uuid primary key default gen_random_uuid(),
  url        text not null check (char_length(url) between 8 and 500 and url ~* '^https?://'),
  name       text not null check (char_length(name) between 1 and 120),
  category   text,
  why        text not null check (char_length(why) between 1 and 2000),
  email      text check (email is null or char_length(email) <= 200),
  maker      boolean not null default false,
  lang       text,
  user_id    uuid references auth.users on delete set null default auth.uid(),
  ip         text default public.client_ip(),
  status     text not null default 'new' check (status in ('new', 'added', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);
create index if not exists submissions_status on public.submissions (status, created_at desc);
alter table public.submissions enable row level security;

-- anyone may send; nobody but the admin can read them back
drop policy if exists "anyone submits" on public.submissions;
create policy "anyone submits" on public.submissions
  for insert to anon, authenticated with check (status = 'new' and admin_note is null);
drop policy if exists "admin reads submissions" on public.submissions;
create policy "admin reads submissions" on public.submissions
  for select to authenticated using (public.is_admin());
drop policy if exists "admin updates submissions" on public.submissions;
create policy "admin updates submissions" on public.submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes submissions" on public.submissions;
create policy "admin deletes submissions" on public.submissions
  for delete to authenticated using (public.is_admin());

create or replace function public.submissions_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.ip := public.client_ip();
  if (select count(*) from submissions where ip = new.ip and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many submissions' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists submissions_guard on public.submissions;
create trigger submissions_guard before insert on public.submissions
  for each row execute function public.submissions_guard();

-- removed: submissions no longer take attached photos. If this script ran
-- before that change, this cleans up the old column, policies and bucket.
alter table public.submissions drop column if exists photos;
drop policy if exists "anyone uploads submission photos" on storage.objects;
drop policy if exists "admin reads submission photos" on storage.objects;
drop policy if exists "admin deletes submission photos" on storage.objects;
delete from storage.objects where bucket_id = 'submissions';
delete from storage.buckets where id = 'submissions';

-- --------------------------------------------------------------- comments
-- Silent moderation: a new comment is "pending". Everyone sees approved
-- comments; the author also sees their own, whatever the status, so for
-- them it looks published straight away.
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  tool_id     text not null check (tool_id ~ '^[a-z0-9-]{1,80}$'),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  author_name text not null default 'Atlas',
  body        text not null check (char_length(body) between 1 and 2000),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists comments_tool on public.comments (tool_id, created_at);
create index if not exists comments_status on public.comments (status, created_at desc);
alter table public.comments enable row level security;

drop policy if exists "read comments" on public.comments;
create policy "read comments" on public.comments
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "write own comments" on public.comments;
create policy "write own comments" on public.comments
  for insert to authenticated with check (user_id = auth.uid() and (status = 'pending' or public.is_admin()));
drop policy if exists "delete own comments" on public.comments;
create policy "delete own comments" on public.comments
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin moderates comments" on public.comments;
create policy "admin moderates comments" on public.comments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- the name comes from the profile, not from the browser; the admin's own comments skip the queue
create or replace function public.comments_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare p profiles;
begin
  select * into p from profiles where id = new.user_id;
  new.author_name := coalesce(p.display_name, split_part(p.email, '@', 1), 'Atlas');
  new.ip := public.client_ip();
  if p.is_admin then new.status := 'approved'; else new.status := 'pending'; end if;
  if (select count(*) from comments where user_id = new.user_id and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'too many comments' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists comments_guard on public.comments;
create trigger comments_guard before insert on public.comments
  for each row execute function public.comments_guard();

-- ------------------------------------------------------------ admin stats
create or replace function public.admin_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return json_build_object(
    'members',      (select count(*) from profiles),
    'members_7d',   (select count(*) from profiles where created_at > now() - interval '7 days'),
    'newsletter',   (select count(*) from profiles where newsletter),
    'pro',          (select count(*) from profiles where plan = 'pro' and (plan_until is null or plan_until > now())),
    'collections',  (select count(*) from collections),
    'submissions_new', (select count(*) from submissions where status = 'new'),
    'comments_pending', (select count(*) from comments where status = 'pending'),
    'comments_approved', (select count(*) from comments where status = 'approved')
  );
end $$;
grant execute on function public.admin_stats() to authenticated;

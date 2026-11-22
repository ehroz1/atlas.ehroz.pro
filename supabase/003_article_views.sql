-- Atlas: view counts for articles (/blog/<slug>/).
-- Run once in Supabase → SQL Editor, after schema.sql. Safe to re-run.
--
-- The page calls hit_article(slug) once per browser per day (the browser
-- remembers that it already counted), the list calls article_views(slugs).
-- Nobody can write the table directly: only through the function, which
-- adds exactly one.

create table if not exists public.article_views (
  slug       text primary key check (slug ~ '^[a-z0-9-]{1,100}$'),
  views      bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.article_views enable row level security;

drop policy if exists "read article views" on public.article_views;
create policy "read article views" on public.article_views for select using (true);
grant select on public.article_views to anon, authenticated;

create or replace function public.hit_article(p_slug text)
returns bigint language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if p_slug !~ '^[a-z0-9-]{1,100}$' then raise exception 'bad slug'; end if;
  insert into article_views (slug, views) values (p_slug, 1)
  on conflict (slug) do update set views = article_views.views + 1, updated_at = now()
  returning views into n;
  return n;
end $$;
grant execute on function public.hit_article(text) to anon, authenticated;

create or replace function public.article_views_get(p_slugs text[])
returns table (slug text, views bigint) language sql stable security definer set search_path = public as $$
  select slug, views from article_views where slug = any(p_slugs);
$$;
grant execute on function public.article_views_get(text[]) to anon, authenticated;

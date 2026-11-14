-- Applied to the UBG45 Supabase project on 2026-11-14 (migration "ubg45_report_reasons_and_submissions").
-- Kept here so the setup can be repeated. Nothing in here can be read by visitors: the tables have RLS on and no policies,
-- visitors can only call the two capped functions below.

-- 1) "Report a broken game" now says what is wrong (counts per reason, per game, per day)
alter table public.ubg45_reports add column if not exists reasons jsonb not null default '{}'::jsonb;
drop function if exists public.ubg45_report(text);
create or replace function public.ubg45_report(p_game text, p_reason text default null)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_known boolean;
  v_r text := case when p_reason in ('load','crash','controls','ads','unsuitable','other') then p_reason else 'other' end;
begin
  if p_game is null or p_game !~ '^[a-z0-9-]{1,80}$' then return; end if;
  select exists (select 1 from public.ubg45_reports where day = v_day and game_id = p_game) into v_known;
  if not v_known and (select count(*) from public.ubg45_reports where day = v_day) >= 700 then return; end if;
  insert into public.ubg45_reports as t (day, game_id, n, reasons) values (v_day, p_game, 1, jsonb_build_object(v_r, 1))
  on conflict (day, game_id) do update set
    n = least(t.n + 1, 500),
    reasons = jsonb_set(t.reasons, array[v_r], to_jsonb(least(coalesce((t.reasons ->> v_r)::int, 0) + 1, 500))),
    updated_at = now();
end;
$function$;
revoke all on function public.ubg45_report(text, text) from public;
grant execute on function public.ubg45_report(text, text) to anon, authenticated, service_role;

-- 2) Developer submissions (the Developers page). Read them in the Supabase dashboard: Table editor > ubg45_submissions.
--    Contains the developer's email address (so we can reply). status starts as 'new'; change it to 'added' / 'declined' by hand.
create table if not exists public.ubg45_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  title text not null, game_url text not null, dev_name text not null, email text not null,
  category text, description text not null, controls text,
  platforms text[] not null default '{}', thumb_url text, site_url text, notes text
);
alter table public.ubg45_submissions enable row level security;
revoke all on table public.ubg45_submissions from anon, authenticated;
create index if not exists ubg45_submissions_created_idx on public.ubg45_submissions (created_at desc);
-- ubg45_submit_game(...) validates every field, rejects duplicate links, drops bot submissions (hidden field) and is capped:
-- 100 a day overall, 3 an hour per email, 3000 in total. It returns 'ok:<REF>', 'dup', 'full' or 'invalid:<field>'.
-- (Full function body: see the migration in the Supabase project.)

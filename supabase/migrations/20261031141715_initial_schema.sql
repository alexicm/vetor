create extension if not exists pgcrypto;
create extension if not exists pgmq;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  original_name text not null,
  mime_type text not null,
  detected_format text not null,
  storage_path text not null unique,
  sha256 text not null,
  file_size bigint not null check (file_size >= 0),
  width integer,
  height integer,
  page_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.conversion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete restrict,
  operation text not null,
  options jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  attempts integer not null default 0 check (attempts >= 0),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.job_outputs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.conversion_jobs (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size >= 0),
  width integer,
  height integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.conversion_jobs (id) on delete cascade,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.conversion_jobs (id) on delete set null,
  operation text not null,
  status text not null,
  duration_ms integer,
  input_bytes bigint,
  output_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists assets_user_id_created_at_idx on public.assets (user_id, created_at desc);
create index if not exists conversion_jobs_user_id_created_at_idx on public.conversion_jobs (user_id, created_at desc);
create index if not exists conversion_jobs_status_idx on public.conversion_jobs (status);
create unique index if not exists job_outputs_job_storage_idx on public.job_outputs (job_id, storage_path);
create index if not exists job_events_job_id_idx on public.job_events (job_id, created_at);
create index if not exists usage_events_user_id_idx on public.usage_events (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.conversion_jobs enable row level security;
alter table public.job_outputs enable row level security;
alter table public.job_events enable row level security;
alter table public.usage_events enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy assets_all_own on public.assets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy jobs_all_own on public.conversion_jobs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy outputs_select_own on public.job_outputs
  for select to authenticated
  using (
    exists (
      select 1
      from public.conversion_jobs jobs
      where jobs.id = job_outputs.job_id
        and jobs.user_id = (select auth.uid())
    )
  );

create policy events_select_own on public.job_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.conversion_jobs jobs
      where jobs.id = job_events.job_id
        and jobs.user_id = (select auth.uid())
    )
  );

create policy usage_select_own on public.usage_events
  for select to authenticated
  using (user_id = (select auth.uid()));

create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

select pgmq.create('conversion_jobs');

create or replace function public.enqueue_conversion_job(payload jsonb)
returns bigint
language sql
security definer
set search_path = pgmq, public
as $$
  select pgmq.send('conversion_jobs', payload);
$$;

revoke all on function public.enqueue_conversion_job(jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_conversion_job(jsonb) to service_role;

create or replace function public.read_conversion_jobs(visibility_timeout integer, quantity integer)
returns setof pgmq.message_record
language sql
security definer
set search_path = pgmq, public
as $$
  select * from pgmq.read('conversion_jobs', visibility_timeout, quantity);
$$;

revoke all on function public.read_conversion_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.read_conversion_jobs(integer, integer) to service_role;

create or replace function public.archive_conversion_job(message_id bigint)
returns boolean
language sql
security definer
set search_path = pgmq, public
as $$
  select pgmq.archive('conversion_jobs', message_id);
$$;

revoke all on function public.archive_conversion_job(bigint) from public, anon, authenticated;
grant execute on function public.archive_conversion_job(bigint) to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('originals', 'originals', false, 52428800),
  ('outputs', 'outputs', false, 52428800)
on conflict (id) do nothing;

create policy originals_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'originals' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy originals_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'originals' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy originals_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'originals' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'originals' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy outputs_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'outputs' and split_part(name, '/', 1) = (select auth.uid())::text);

-- StudyNest V1.1 database
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  school text,
  avatar_url text,
  plan text not null default 'starter'
    check (plan in ('starter','pro','group')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  icon text,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  due_text text,
  due_at timestamptz,
  priority text not null default 'normal'
    check (priority in ('low','normal','high')),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  minutes integer not null check (minutes > 0 and minutes <= 1440),
  studied_on date not null default current_date,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
on public.profiles for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users manage own courses" on public.courses;
create policy "Users manage own courses"
on public.courses for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks"
on public.tasks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own notes" on public.notes;
create policy "Users manage own notes"
on public.notes for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own study sessions" on public.study_sessions;
create policy "Users manage own study sessions"
on public.study_sessions for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.courses,
  public.tasks,
  public.notes,
  public.study_sessions
to authenticated;

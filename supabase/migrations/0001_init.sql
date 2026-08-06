-- learnhowtocode — progress sync schema
--
-- Run this once against your Supabase project:
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- or, with the CLI:  supabase db push
--
-- Everything here is per-user and protected by row level security, so one
-- account can never read or write another's rows.

-- ---------------------------------------------------------------------------
-- Lesson progress
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  track       text        not null,
  slug        text        not null,
  completed   boolean     not null default false,
  -- Seconds spent on the lesson, accumulated client-side.
  seconds     integer     not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, track, slug)
);

alter table public.lesson_progress enable row level security;

drop policy if exists "own lesson progress" on public.lesson_progress;
create policy "own lesson progress"
  on public.lesson_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Saved editor buffers, so an unfinished exercise survives a device switch
-- ---------------------------------------------------------------------------
create table if not exists public.saved_code (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  -- "<track>/<slug>#<index>" or "problem:<problem-id>"
  key         text        not null,
  language    text        not null,
  source      text        not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.saved_code enable row level security;

drop policy if exists "own saved code" on public.saved_code;
create policy "own saved code"
  on public.saved_code
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Problem set submissions
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  problem_id   text        not null,
  language     text        not null,
  source       text        not null,
  -- 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'timeout'
  verdict      text        not null,
  passed       integer     not null default 0,
  total        integer     not null default 0,
  runtime_ms   integer,
  created_at   timestamptz not null default now()
);

alter table public.submissions enable row level security;

drop policy if exists "own submissions" on public.submissions;
create policy "own submissions"
  on public.submissions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists submissions_user_problem_idx
  on public.submissions (user_id, problem_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Daily activity, used for the streak counter
-- ---------------------------------------------------------------------------
create table if not exists public.activity_days (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  lessons  integer not null default 0,
  minutes  integer not null default 0,
  primary key (user_id, day)
);

alter table public.activity_days enable row level security;

drop policy if exists "own activity" on public.activity_days;
create policy "own activity"
  on public.activity_days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

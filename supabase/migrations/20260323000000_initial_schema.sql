-- Quizzes created by teachers
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  questions jsonb not null,
  access_code text not null unique,
  created_at timestamptz not null default now()
);

create index idx_quizzes_access_code on quizzes (access_code);

-- Student quiz sessions
create table quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_name text not null,
  score integer not null default 0,
  total integer not null default 0,
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);

create index idx_quiz_sessions_quiz_id on quiz_sessions (quiz_id);

-- RLS policies
alter table quizzes enable row level security;
alter table quiz_sessions enable row level security;

-- Allow anonymous read access to quizzes by access code
create policy "Anyone can read quizzes" on quizzes
  for select using (true);

-- Allow anonymous insert of quizzes (teacher creates)
create policy "Anyone can create quizzes" on quizzes
  for insert with check (true);

-- Allow anonymous read of sessions (teacher views results)
create policy "Anyone can read sessions" on quiz_sessions
  for select using (true);

-- Allow anonymous insert of sessions (student submits)
create policy "Anyone can create sessions" on quiz_sessions
  for insert with check (true);

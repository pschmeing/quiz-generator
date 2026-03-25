-- Migration: Add subjects and classes tables, link to quizzes

-- 1. Subjects table
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (name, created_by)
);

alter table public.subjects enable row level security;

create policy "Teachers can view own subjects"
  on public.subjects for select
  using (auth.uid() = created_by);

create policy "Teachers can insert own subjects"
  on public.subjects for insert
  with check (auth.uid() = created_by);

create policy "Teachers can update own subjects"
  on public.subjects for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Teachers can delete own subjects"
  on public.subjects for delete
  using (auth.uid() = created_by);

-- 2. Classes table
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (name, created_by)
);

alter table public.classes enable row level security;

create policy "Teachers can view own classes"
  on public.classes for select
  using (auth.uid() = created_by);

create policy "Teachers can insert own classes"
  on public.classes for insert
  with check (auth.uid() = created_by);

create policy "Teachers can update own classes"
  on public.classes for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Teachers can delete own classes"
  on public.classes for delete
  using (auth.uid() = created_by);

-- 3. Add subject_id and class_id to quizzes
alter table public.quizzes
  add column subject_id uuid references public.subjects(id) on delete set null,
  add column class_id uuid references public.classes(id) on delete set null;

create index idx_quizzes_subject_id on public.quizzes(subject_id);
create index idx_quizzes_class_id on public.quizzes(class_id);

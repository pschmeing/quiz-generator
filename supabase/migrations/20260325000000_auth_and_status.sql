-- Teachers table (linked to Supabase Auth)
create table teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'teacher' check (role in ('admin', 'teacher')),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_teachers_email on teachers (email);

alter table teachers enable row level security;

-- Teachers can read their own record
create policy "Teachers can read own record" on teachers
  for select using (auth.uid() = id);

-- SECURITY DEFINER helper to avoid recursive RLS on admin check
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.teachers where id = user_id and role = 'admin'
  );
$$ language sql security definer stable;

-- Admin can read all teachers
create policy "Admin can read all teachers" on teachers
  for select using (public.is_admin(auth.uid()));

-- Admin can update teachers (approve/role)
create policy "Admin can update teachers" on teachers
  for update using (public.is_admin(auth.uid()));

-- Auth trigger: auto-insert teacher row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.teachers (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add status and created_by to quizzes
alter table quizzes add column if not exists status text not null default 'published' check (status in ('draft', 'published', 'closed', 'archived'));
alter table quizzes add column if not exists created_by uuid references auth.users(id);

create index idx_quizzes_status on quizzes (status);
create index idx_quizzes_created_by on quizzes (created_by);

-- Update quizzes RLS: teachers see own quizzes, students see published
drop policy if exists "Anyone can read quizzes" on quizzes;
drop policy if exists "Anyone can create quizzes" on quizzes;

-- Anyone can read published quizzes (students need this)
create policy "Anyone can read published quizzes" on quizzes
  for select using (status = 'published' or status = 'closed');

-- Authenticated teachers can read own quizzes (any status)
create policy "Teachers can read own quizzes" on quizzes
  for select using (auth.uid() = created_by);

-- Authenticated teachers can create quizzes
create policy "Teachers can create quizzes" on quizzes
  for insert with check (auth.uid() = created_by);

-- Teachers can update own quizzes
create policy "Teachers can update own quizzes" on quizzes
  for update using (auth.uid() = created_by);

-- Teachers can delete own quizzes
create policy "Teachers can delete own quizzes" on quizzes
  for delete using (auth.uid() = created_by);

-- Add student_email to quiz_sessions (optional, for logged-in students)
alter table quiz_sessions add column if not exists student_email text;

-- Students table for tracking student accounts
create table if not exists students (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

alter table students enable row level security;

create policy "Students can read own record" on students
  for select using (auth.uid() = id);

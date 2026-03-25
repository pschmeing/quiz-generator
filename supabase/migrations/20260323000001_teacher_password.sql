-- Add teacher password hash to quizzes
alter table quizzes add column teacher_password_hash text not null default '';

-- Enable pgcrypto for password hashing
create extension if not exists pgcrypto;

-- Function to hash a password (called from client during publish)
create or replace function hash_password(password text)
returns text as $$
  select crypt(password, gen_salt('bf'));
$$ language sql security definer;

-- Function to verify teacher password
create or replace function verify_teacher_password(quiz_access_code text, password text)
returns boolean as $$
  select exists(
    select 1 from quizzes
    where access_code = quiz_access_code
    and teacher_password_hash = crypt(password, teacher_password_hash)
  );
$$ language sql security definer;

-- Replace the open session read policy with a restricted one
drop policy if exists "Anyone can read sessions" on quiz_sessions;

-- Sessions can only be inserted (students submitting), not read via anon
-- Reading happens through an RPC function that checks the teacher password
create policy "Students can insert sessions" on quiz_sessions
  for insert with check (true);

-- Create a secure function for teachers to fetch results
create or replace function get_quiz_results(p_access_code text, p_password text)
returns table (
  id uuid,
  quiz_id uuid,
  student_name text,
  score integer,
  total integer,
  answers jsonb,
  completed_at timestamptz
) as $$
begin
  -- Verify password first
  if not verify_teacher_password(p_access_code, p_password) then
    raise exception 'Falsches Passwort';
  end if;

  return query
    select qs.id, qs.quiz_id, qs.student_name, qs.score, qs.total, qs.answers, qs.completed_at
    from quiz_sessions qs
    join quizzes q on q.id = qs.quiz_id
    where q.access_code = p_access_code
    order by qs.completed_at desc;
end;
$$ language plpgsql security definer;

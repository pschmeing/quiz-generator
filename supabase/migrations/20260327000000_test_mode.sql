-- Add test mode (exam mode) support
ALTER TABLE quizzes ADD COLUMN test_mode boolean DEFAULT false;
ALTER TABLE quiz_sessions ADD COLUMN violations jsonb DEFAULT '[]';

ALTER TABLE public.lessons
ADD COLUMN lesson_type TEXT NOT NULL DEFAULT 'recorded';

ALTER TABLE public.lessons
ADD CONSTRAINT lessons_lesson_type_check
CHECK (lesson_type IN ('recorded', 'live'));

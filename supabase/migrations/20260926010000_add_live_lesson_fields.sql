ALTER TABLE public.lessons
ADD COLUMN live_platform TEXT,
ADD COLUMN live_start_time TIMESTAMPTZ,
ADD COLUMN live_duration INT;

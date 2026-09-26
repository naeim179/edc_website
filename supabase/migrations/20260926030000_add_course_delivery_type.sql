ALTER TABLE public.courses
ADD COLUMN delivery_type TEXT NOT NULL DEFAULT 'recorded';

ALTER TABLE public.courses
ADD CONSTRAINT courses_delivery_type_check
CHECK (delivery_type IN ('recorded', 'live'));

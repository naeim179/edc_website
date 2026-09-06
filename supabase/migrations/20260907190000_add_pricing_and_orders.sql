-- Add pricing fields to courses
ALTER TABLE public.courses
ADD COLUMN price NUMERIC(10,2) DEFAULT 0,
ADD COLUMN currency TEXT DEFAULT 'JOD';


-- Orders table
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,

  course_id UUID REFERENCES public.courses(id)
    ON DELETE CASCADE NOT NULL,

  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'JOD',

  status TEXT NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT now()
);


-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;


-- User can read own orders
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


-- Backend/admin access
GRANT ALL ON TABLE public.orders TO service_role;

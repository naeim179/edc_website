-- Allow admins to create enrollments after payment approval

CREATE POLICY "Admins can insert enrollments"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

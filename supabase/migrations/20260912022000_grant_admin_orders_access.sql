-- Allow authenticated users to access orders table actions
GRANT SELECT, UPDATE ON TABLE public.orders TO authenticated;

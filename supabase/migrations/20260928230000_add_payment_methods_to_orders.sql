-- Add payment details support

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'paytabs',
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_proof TEXT;


-- Optional validation for supported methods
ALTER TABLE public.orders
ADD CONSTRAINT orders_payment_method_check
CHECK (
  payment_method IN (
    'paytabs',
    'paypal',
    'cliq'
  )
);

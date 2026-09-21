-- Convert existing course values that were previously stored in JOD
-- to the new USD base-price model.
--
-- 1 USD = 0.709 JOD
-- USD amount = JOD amount / 0.709

update public.courses
set
  price =
    case
      when coalesce(is_free, false) = true
        then 0
      else round((coalesce(price, 0) / 0.709)::numeric, 2)
    end,

  discount_value =
    case
      when discount_type = 'fixed'
        then round((coalesce(discount_value, 0) / 0.709)::numeric, 2)
      else discount_value
    end,

  currency = 'USD';

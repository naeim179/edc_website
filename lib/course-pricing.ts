export type PricingInput = {
  price?: number | null;
  currency?: string | null;
  isFree?: boolean | null;
  discountType?: "percentage" | "fixed" | null;
  discountValue?: number | null;
};

export type PriceInfo = {
  isFree: boolean;
  original: number;
  final: number;
  hasDiscount: boolean;
  /** نسبة الخصم الفعلية (للعرض فقط) */
  discountPercent: number;
  currency: string;
};

export function computePrice(input: PricingInput): PriceInfo {
  const currency = input.currency ?? "JOD";
  const original = input.price ?? 0;
  const discountValue = input.discountValue ?? 0;

  let final = original;

  if (input.discountType === "percentage") {
    final = original - original * (discountValue / 100);
  } else if (input.discountType === "fixed") {
    final = original - discountValue;
  }

  final = Math.max(0, final);

  const isFree = Boolean(input.isFree);

  const hasDiscount =
    !isFree &&
    original > 0 &&
    discountValue > 0 &&
    final < original;

  const discountPercent = hasDiscount
    ? Math.round((1 - final / original) * 100)
    : 0;

  return {
    isFree,
    original,
    final,
    hasDiscount,
    discountPercent,
    currency,
  };
}

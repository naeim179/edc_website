export type PaymentCurrency = "USD" | "JOD";

// سعر التحويل المعتمد داخل المنصة.
// لاحقًا نقدر ننقله لإعدادات الأدمن بدون تغيير نظام الدفع.
export const USD_TO_JOD_RATE = 0.709;

export function convertFromUsd(
  amountUsd: number,
  currency: PaymentCurrency
) {
  if (currency === "USD") {
    return Number(amountUsd.toFixed(2));
  }

  return Number(
    (amountUsd * USD_TO_JOD_RATE).toFixed(2)
  );
}

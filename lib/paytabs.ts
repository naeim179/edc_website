const PAYTABS_BASE_URL =
  process.env.PAYTABS_BASE_URL ?? "https://secure-jordan.paytabs.com";

const PROFILE_ID = process.env.PAYTABS_PROFILE_ID!;
const SERVER_KEY = process.env.PAYTABS_SERVER_KEY!;

type CreatePaymentParams = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  siteUrl: string;
};

export async function createPaymentPage(params: CreatePaymentParams) {
  const res = await fetch(`${PAYTABS_BASE_URL}/payment/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: SERVER_KEY,
    },
    body: JSON.stringify({
      profile_id: Number(PROFILE_ID),
      tran_type: "sale",
      tran_class: "ecom",
      cart_id: params.orderId,
      cart_currency: params.currency,
      cart_amount: params.amount,
      cart_description: params.description,
      paypage_lang: "ar",
      customer_details: {
        name: params.customerName,
        email: params.customerEmail,
        street1: "N/A",
        city: "Amman",
        state: "Amman",
        country: "JO",
        zip: "00000",
      },
      callback: `${params.siteUrl}/api/payments/webhook`,
      return: `${params.siteUrl}/checkout/success`,
    }),
  });

  const data = await res.json();

  console.error("PAYTABS_RESPONSE", JSON.stringify(data));

  if (!res.ok || !data.redirect_url) {
    throw new Error(
      data.message || "تعذر إنشاء صفحة الدفع، حاول مرة أخرى"
    );
  }

  return data.redirect_url as string;
}

export async function queryTransaction(tranRef: string) {
  const res = await fetch(`${PAYTABS_BASE_URL}/payment/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: SERVER_KEY,
    },
    body: JSON.stringify({
      profile_id: Number(PROFILE_ID),
      tran_ref: tranRef,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "تعذر التحقق من حالة العملية");
  }

  return data;
}

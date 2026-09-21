const PAYTABS_BASE_URL =
  process.env.PAYTABS_BASE_URL ??
  "https://secure-jordan.paytabs.com";

const PROFILE_ID =
  process.env.PAYTABS_PROFILE_ID!;

const SERVER_KEY =
  process.env.PAYTABS_SERVER_KEY!;

type CreatePaymentParams = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  customerName: string;
  siteUrl: string;
  tokenize?: boolean;
};

type RecurringPaymentParams = {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  token: string;
  tokenTranRef: string;
};

export async function verifyPayTabsCallbackSignature(
  payload: string,
  signature: string | null
) {
  if (
    !signature ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const encoder =
    new TextEncoder();

  const key =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(SERVER_KEY),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

  const signed =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

  const expected =
    new Uint8Array(signed);

  const received =
    new Uint8Array(
      signature
        .match(/.{2}/g)!
        .map((value) =>
          parseInt(value, 16)
        )
    );

  if (
    expected.length !==
    received.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < expected.length;
    index++
  ) {
    difference |=
      expected[index] ^
      received[index];
  }

  return difference === 0;
}

export async function createPaymentPage(
  params: CreatePaymentParams
) {
  const res = await fetch(
    `${PAYTABS_BASE_URL}/payment/request`,
    {
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

        ...(params.tokenize
          ? {
              tokenise: 2,
            }
          : {}),

        customer_details: {
          name: params.customerName,
          email: params.customerEmail,
          street1: "N/A",
          city: "Amman",
          state: "Amman",
          country: "JO",
          zip: "00000",
        },

        callback:
          `${params.siteUrl}/api/payments/webhook`,

        return:
          `${params.siteUrl}/api/payments/return`,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok || !data.redirect_url) {
    throw new Error(
      data.message ||
        "تعذر إنشاء صفحة الدفع، حاول مرة أخرى"
    );
  }

  return data.redirect_url as string;
}

export async function queryTransaction(
  tranRef: string
) {
  const res = await fetch(
    `${PAYTABS_BASE_URL}/payment/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: SERVER_KEY,
      },
      body: JSON.stringify({
        profile_id: Number(PROFILE_ID),
        tran_ref: tranRef,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message ||
        "تعذر التحقق من حالة العملية"
    );
  }

  return data;
}

export async function createRecurringPayment(
  params: RecurringPaymentParams
) {
  const res = await fetch(
    `${PAYTABS_BASE_URL}/payment/request`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: SERVER_KEY,
      },
      body: JSON.stringify({
        profile_id: Number(PROFILE_ID),
        tran_type: "sale",
        tran_class: "recurring",

        cart_id: params.orderId,
        cart_currency: params.currency,
        cart_amount: params.amount,
        cart_description: params.description,

        token: params.token,
        tran_ref: params.tokenTranRef,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message ||
        "تعذر تنفيذ التجديد التلقائي"
    );
  }

  return data;
}

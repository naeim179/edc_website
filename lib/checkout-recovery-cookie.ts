import { cookies } from "next/headers";

export const checkoutCookieName = (courseId: string) => `checkout-return-${courseId}`;

export async function rememberHostedCheckout(courseId: string, orderId: string) {
  (await cookies()).set(checkoutCookieName(courseId), orderId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/checkout",
    maxAge: 24 * 60 * 60,
  });
}

export async function clearHostedCheckout(courseId: string) {
  (await cookies()).set(checkoutCookieName(courseId), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/checkout",
    maxAge: 0,
  });
}

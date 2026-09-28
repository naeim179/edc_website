"use server";

import { createClient } from "@/lib/supabase/server";

export async function uploadPaymentProof(
  orderId: string,
  proofPath: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("orders")
    .update({
      payment_proof: proofPath,
      status: "pending",
    })
    .eq("id", orderId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
  };
}

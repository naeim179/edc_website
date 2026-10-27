"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadPaymentProof(
  orderId: string,
  proofPath: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Only a file in the authenticated student's own folder.
  const prefix = user.id + "/";
  const fileName = proofPath.startsWith(prefix)
    ? proofPath.slice(prefix.length)
    : "";

  if (
    !fileName ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..")
  ) {
    throw new Error("Invalid proof path");
  }

  const admin = createAdminClient();

  // Verify the uploaded file actually exists.
  const { data: storedFile, error: fileError } =
    await admin.storage
      .from("payment-proofs")
      .info(proofPath);

  if (fileError || !storedFile) {
    throw new Error("Payment proof file not found");
  }

  // Service role is used only after authenticating the student.
  // Every update is restricted by owner, payment method and status.
  const { data: updated, error } = await admin
    .from("orders")
    .update({ payment_proof: proofPath })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("payment_method", "cliq")
    .eq("status", "pending")
    .is("payment_proof", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!updated) {
    throw new Error(
      "Order unavailable or payment proof already submitted"
    );
  }

  return { success: true };
}

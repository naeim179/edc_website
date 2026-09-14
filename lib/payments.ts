import { createAdminClient } from "@/lib/supabase/admin";
import { queryTransaction } from "@/lib/paytabs";

export async function fulfillPaymentByTranRef(tranRef: string) {
  const result = await queryTransaction(tranRef);

  const isPaid = result?.payment_result?.response_status === "A";
  const orderId = result?.cart_id as string | undefined;

  if (!isPaid || !orderId) {
    return { paid: false as const, courseId: null as string | null };
  }

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, course_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { paid: false as const, courseId: null as string | null };
  }

  if (order.status !== "paid") {
    await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id);
  }

  const { error: enrollError } = await supabase
    .from("enrollments")
    .insert({
      student_id: order.user_id,
      course_id: order.course_id,
    });

  if (enrollError && !enrollError.message.includes("duplicate")) {
    throw new Error(enrollError.message);
  }

  return { paid: true as const, courseId: order.course_id as string };
}

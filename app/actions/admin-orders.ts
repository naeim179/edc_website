"use server";

import { requirePermission, requireSuperAdmin } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminOrders() {
  await requirePermission("view_orders");

  const supabase = await createClient();

  // الأدمن يرى النتائج النهائية فقط:
  // Paid أو Failed.
  // Pending لا يظهر لأنه مجرد محاولة دفع غير مكتملة.
  const { data: orders, error } =
    await supabase
      .from("orders")
      .select(`
        id,
        amount,
        currency,
        status,
        created_at,
        user_id,
        course_id,
        payment_method,
        payment_proof
      `)
      .in("status", ["paid", "failed", "pending"])
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    throw new Error(error.message);
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  const courseIds = [
    ...new Set(
      orders.map((order) => order.course_id)
    ),
  ];

  const userIds = [
    ...new Set(
      orders.map((order) => order.user_id)
    ),
  ];

  const [{ data: courses }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id,title")
        .in("id", courseIds),

      supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", userIds),
    ]);

  const proofStorage = createAdminClient().storage;

  const ordersWithProof = await Promise.all(
    orders.map(async (order) => {
      if (!order.payment_proof) {
        return order;
      }

      const { data } =
        await proofStorage
          .from("payment-proofs")
          .createSignedUrl(
            order.payment_proof,
            60 * 60
          );

      return {
        ...order,
        payment_proof:
          data?.signedUrl ?? null,
      };
    })
  );

  return ordersWithProof.map((order) => ({
    ...order,

    studentName:
      profiles?.find(
        (profile) =>
          profile.id === order.user_id
      )?.full_name ?? "Unknown",

    courses: [
      {
        title:
          courses?.find(
            (course) =>
              course.id === order.course_id
          )?.title ?? "Course not found",
      },
    ],
  }));
}


export async function updateOrderStatus(
  orderId: string,
  status:
    | "paid"
    | "failed"
) {
  await requirePermission(
    "view_orders"
  );
  await requireSuperAdmin();

  const admin =
    createAdminClient();

  if (
    status ===
    "paid"
  ) {
    const {
      data: order,
      error:
        orderError,
    } =
      await admin
        .from("orders")
        .select(`
          id,
          payment_method,
          status,
          payment_proof
        `)
        .eq(
          "id",
          orderId
        )
        .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      throw new Error(
        orderError?.message ??
          "Order not found"
      );
    }

    if (
      order.payment_method !==
      "cliq"
    ) {
      throw new Error(
        "Only CliQ orders can be manually approved."
      );
    }

    if (order.status !== "pending" || !order.payment_proof) {
      throw new Error("لا يمكن تأكيد الطلب قبل رفع الإثبات أو بعد حسم حالة الدفع.");
    }

    const { data: proofLink, error: proofError } =
      await admin.storage
        .from("payment-proofs")
        .createSignedUrl(order.payment_proof, 60);

    if (proofError || !proofLink?.signedUrl) {
      throw new Error("تعذّر الوصول إلى إثبات الدفع، تم منع الموافقة.");
    }

    const {
      error:
        fulfillmentError,
    } =
      await admin.rpc("fulfill_verified_cliq_order", { p_order_id: order.id })

    if (
      fulfillmentError
    ) {
      throw new Error(
        fulfillmentError.message
      );
    }

    return {
      success: true,
    };
  }

  const {
    data: updatedOrder,
    error,
  } =
    await admin
      .from("orders")
      .update({
        status:
          "failed",
      })
      .eq("id", orderId)
      .eq("payment_method", "cliq")
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!updatedOrder) {
    throw new Error("Only pending CliQ orders can be marked failed.");
  }

  return { success: true };
}

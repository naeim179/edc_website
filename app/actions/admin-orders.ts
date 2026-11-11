"use server";

import { requirePermission, requireSuperAdmin } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListFilters, OrdersPage } from "@/lib/list-pages";

export async function getAdminOrdersPage(filters: ListFilters) {
  const access = await requirePermission("view_orders");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_orders_page", {
    p_query: filters.q, p_status: filters.status, p_page: filters.page, p_page_size: 20,
  });
  if (error || !data) throw new Error("Could not load orders");
  const result = data as unknown as OrdersPage;
  let storage: ReturnType<typeof createAdminClient>["storage"] | undefined;
  const items = await Promise.all(result.items.map(async order => {
    if (!order.payment_proof) return order;
    storage ??= createAdminClient().storage;
    const { data: link } = await storage.from("payment-proofs").createSignedUrl(order.payment_proof, 60 * 60);
    return { ...order, payment_proof: link?.signedUrl ?? null };
  }));
  return { ...result, items, canReview: Boolean(access?.isSuper) };
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

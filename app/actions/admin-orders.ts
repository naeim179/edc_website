"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export async function getAdminOrders() {
  await requireAdmin();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      amount,
      currency,
      status,
      created_at,
      user_id,
      course_id,
      courses (
        title
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

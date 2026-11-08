"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";


export async function disableAutoRenew(
  courseId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولاً"
    );
  }

  const { data, error } = await supabase.rpc("disable_subscription_auto_renew", { p_course_id: courseId });
  if (error) throw new Error(error.message);

  revalidatePath(
    `/courses/${courseId}`
  );
  revalidatePath("/my-courses");

  return {
    success: true,
    inFlight: Boolean(data?.in_flight),
  };
}

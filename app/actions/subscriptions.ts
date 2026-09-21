"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const admin =
    createAdminClient();

  const {
    data: subscription,
    error,
  } = await admin
    .from("subscriptions")
    .select("id")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!subscription) {
    throw new Error(
      "الاشتراك غير موجود"
    );
  }

  const {
    error: updateError,
  } = await admin
    .from("subscriptions")
    .update({
      auto_renew: false,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", subscription.id);

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  // حذف رمز البطاقة عند إلغاء التجديد التلقائي.
  const {
    error: tokenError,
  } = await admin
    .from(
      "subscription_payment_tokens"
    )
    .delete()
    .eq(
      "subscription_id",
      subscription.id
    );

  if (tokenError) {
    throw new Error(
      tokenError.message
    );
  }

  revalidatePath(
    `/courses/${courseId}`
  );
  revalidatePath("/my-courses");

  return {
    success: true,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/auth/admin-access";


async function checkCouponAccess() {
  const access = await getAdminAccess();

  if (
    !access ||
    (
      !access.isSuper &&
      !access.permissions.includes("manage_coupons")
    )
  ) {
    throw new Error("Unauthorized");
  }
}


export async function createCoupon(formData: FormData) {

  await checkCouponAccess();

  const code =
    String(formData.get("code") ?? "")
      .trim()
      .toUpperCase();

  const courseId =
    String(formData.get("course_id") ?? "");


  if (!code || !courseId) {
    throw new Error("Missing data");
  }


  const supabase = await createClient();

  const { error } =
    await supabase
      .from("course_coupons")
      .insert({
        code,
        course_id: courseId,
      });


  if (error) {
    throw new Error(error.message);
  }


  revalidatePath("/admin/coupons");
}



export async function toggleCoupon(
  id: string,
  active: boolean
) {

  await checkCouponAccess();

  const supabase = await createClient();

  const { error } =
    await supabase
      .from("course_coupons")
      .update({
        is_active: !active,
      })
      .eq("id", id);


  if (error) {
    throw new Error(error.message);
  }


  revalidatePath("/admin/coupons");
}


export async function deleteCoupon(id: string) {
  await checkCouponAccess();

  if (!id) {
    throw new Error("Missing coupon id");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("course_coupons")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

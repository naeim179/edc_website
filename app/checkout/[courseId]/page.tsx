import { notFound } from "next/navigation";

import AppShell from "@/components/AppShell";
import SubscriptionCheckout from "@/components/SubscriptionCheckout";

import { createClient } from "@/lib/supabase/server";

import {
  calculateFinalPrice,
} from "@/lib/free-enrollment";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{
    courseId: string;
  }>;
}) {
  const {
    courseId,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: course,
    error,
  } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      price,
      currency,
      is_free,
      discount_type,
      discount_value
    `)
    .eq("id", courseId)
    .eq("is_published", true)
    .maybeSingle();

  if (
    error ||
    !course
  ) {
    return notFound();
  }

  const monthlyPrice =
    calculateFinalPrice(
      course.price ?? 0,
      course.discount_type,
      course.discount_value ?? 0
    );

  return (
    <AppShell>
      <SubscriptionCheckout
        courseId={course.id}
        title={course.title}
        monthlyPrice={monthlyPrice}
        currency={
          course.currency ??
          "JOD"
        }
      />
    </AppShell>
  );
}

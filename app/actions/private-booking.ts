"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reservePrivateSchedule(
  courseId: string,
  slotIds: string[]
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولاً"
    );
  }

  if (
    !Array.isArray(slotIds) ||
    slotIds.length !== 2
  ) {
    throw new Error(
      "يجب اختيار موعدين بالضبط"
    );
  }

  const unique =
    [...new Set(slotIds)];

  if (
    unique.length !==
    slotIds.length
  ) {
    throw new Error(
      "لا يمكن اختيار نفس الموعد مرتين"
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "reserve_private_course",
    {
      p_course_id:
        courseId,
      p_slot_ids:
        unique,
    }
  );

  if (error) {
    const message =
      error.message ?? "";

    if (
      message.includes(
        "already booked"
      )
    ) {
      throw new Error(
        "هذه الدورة محجوزة بالفعل"
      );
    }

    if (
      message.includes(
        "temporarily held"
      )
    ) {
      throw new Error(
        "هذه الدورة قيد الحجز حالياً من طالب آخر"
      );
    }

    if (
      message.includes(
        "Registration is currently closed"
      )
    ) {
      throw new Error(
        "التسجيل في هذه الدورة مغلق حالياً"
      );
    }

    if (
      message.includes(
        "Exactly two appointments are required"
      ) ||
      message.includes(
        "Two different appointments are required"
      )
    ) {
      throw new Error(
        "يجب اختيار موعدين مختلفين بالضبط"
      );
    }

    console.error(
      "reserve_private_course failed:",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }
    );

    throw new Error(
      error.message ||
        "تعذر حجز المواعيد، حاول مرة أخرى"
    );
  }

  if (!data) {
    throw new Error(
      "تعذر إنشاء الحجز"
    );
  }

  return {
    bookingId:
      String(data),
  };
}

export async function releasePrivateSchedule(
  bookingId: string
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولاً"
    );
  }

  const {
    error,
  } = await supabase.rpc(
    "release_private_course_hold",
    {
      p_booking_id:
        bookingId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const admin =
    createAdminClient();

  const {
    data: booking,
  } = await admin
    .from(
      "private_course_bookings"
    )
    .select("course_id")
    .eq(
      "id",
      bookingId
    )
    .maybeSingle();

  if (booking?.course_id) {
    revalidatePath(
      `/courses/${booking.course_id}`
    );

    revalidatePath(
      `/courses/${booking.course_id}/schedule`
    );

    revalidatePath(
      `/checkout/${booking.course_id}`
    );
  }

  revalidatePath(
    "/courses"
  );

  return {
    success: true,
  };
}

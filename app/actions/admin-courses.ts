"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type CourseType =
  | "group"
  | "private";

type PrivateSlotInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function getDiscount(
  formData: FormData
) {
  const discountTypeRaw = String(
    formData.get("discount_type") ??
      "percentage"
  );

  const discountType =
    discountTypeRaw === "fixed"
      ? "fixed"
      : "percentage";

  const discountValue = Number(
    formData.get("discount_value") ?? 0
  );

  if (
    !Number.isFinite(discountValue) ||
    discountValue < 0
  ) {
    throw new Error(
      "قيمة الخصم غير صحيحة"
    );
  }

  if (
    discountType === "percentage" &&
    discountValue > 100
  ) {
    throw new Error(
      "نسبة الخصم لا يمكن أن تتجاوز 100%"
    );
  }

  return {
    discountType,
    discountValue,
  };
}

function validTime(
  value: string
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function parsePrivateSlots(
  formData: FormData
): PrivateSlotInput[] {
  const raw = String(
    formData.get(
      "private_slots_json"
    ) ?? "[]"
  );

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "قائمة مواعيد الـ Private غير صحيحة"
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      "قائمة مواعيد الـ Private غير صحيحة"
    );
  }

  const unique =
    new Map<
      string,
      PrivateSlotInput
    >();

  for (const value of parsed) {
    if (
      !value ||
      typeof value !== "object"
    ) {
      throw new Error(
        "أحد مواعيد الـ Private غير صحيح"
      );
    }

    const item =
      value as Record<
        string,
        unknown
      >;

    const day =
      Number(item.day_of_week);

    const startTime =
      String(
        item.start_time ?? ""
      ).slice(0, 5);

    const endTime =
      String(
        item.end_time ?? ""
      ).slice(0, 5);

    if (
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6 ||
      !validTime(startTime) ||
      !validTime(endTime) ||
      endTime <= startTime
    ) {
      throw new Error(
        "أحد مواعيد الـ Private غير صحيح"
      );
    }

    unique.set(
      `${day}-${startTime}-${endTime}`,
      {
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
      }
    );
  }

  if (unique.size > 100) {
    throw new Error(
      "عدد المواعيد كبير جداً"
    );
  }

  return Array.from(
    unique.values()
  );
}

function getSchedule(
  formData: FormData,
  courseType: CourseType,
  isPublished: boolean
) {
  const registrationOpen =
    formData.get(
      "registration_open"
    ) === "on";

  if (courseType === "group") {
    const dayRaw = String(
      formData.get(
        "group_day_of_week"
      ) ?? ""
    );

    const startTime = String(
      formData.get(
        "group_start_time"
      ) ?? ""
    ).slice(0, 5);

    const endTime = String(
      formData.get(
        "group_end_time"
      ) ?? ""
    ).slice(0, 5);

    const day =
      dayRaw === ""
        ? null
        : Number(dayRaw);

    const validDay =
      day !== null &&
      Number.isInteger(day) &&
      day >= 0 &&
      day <= 6;

    const validGroupTime =
      validTime(startTime) &&
      validTime(endTime) &&
      endTime > startTime;

    if (
      registrationOpen &&
      isPublished &&
      (
        !validDay ||
        !validGroupTime
      )
    ) {
      throw new Error(
        "حدد يوم ووقت البداية والنهاية لدورة القروب قبل فتح التسجيل"
      );
    }

    return {
      registrationOpen,
      groupDay:
        validDay
          ? day
          : null,
      groupTime:
        validGroupTime
          ? startTime
          : null,
      groupEndTime:
        validGroupTime
          ? endTime
          : null,
      privateSlots:
        [] as PrivateSlotInput[],
    };
  }

  const privateSlots =
    parsePrivateSlots(
      formData
    );

  if (
    registrationOpen &&
    isPublished &&
    privateSlots.length === 0
  ) {
    throw new Error(
      "أضف موعداً واحداً على الأقل للـ Private قبل فتح التسجيل"
    );
  }

  return {
    registrationOpen,
    groupDay: null,
    groupTime: null,
    groupEndTime: null,
    privateSlots,
  };
}

async function savePrivateSlots(
  courseId: string,
  slots: PrivateSlotInput[]
) {
  const db =
    createAdminClient();

  const {
    error: deleteError,
  } = await db
    .from(
      "private_course_availability"
    )
    .delete()
    .eq(
      "course_id",
      courseId
    );

  if (deleteError) {
    throw new Error(
      deleteError.message
    );
  }

  if (slots.length === 0) {
    return;
  }

  const {
    error: insertError,
  } = await db
    .from(
      "private_course_availability"
    )
    .insert(
      slots.map((slot) => ({
        course_id:
          courseId,
        day_of_week:
          slot.day_of_week,
        start_time:
          slot.start_time,
        end_time:
          slot.end_time,
        is_active: true,
      }))
    );

  if (insertError) {
    throw new Error(
      insertError.message
    );
  }
}

export async function createCourse(
  formData: FormData
) {
  await requirePermission(
    "manage_courses"
  );

  const db =
    createAdminClient();

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const description = String(
    formData.get(
      "description"
    ) ?? ""
  );

  const category = String(
    formData.get(
      "category"
    ) ?? ""
  );

  const imageUrl = String(
    formData.get(
      "image_url"
    ) ?? ""
  ).trim();

  const courseTypeRaw = String(
    formData.get(
      "course_type"
    ) ?? ""
  );

  if (
    courseTypeRaw !== "group" &&
    courseTypeRaw !== "private"
  ) {
    throw new Error(
      "اختر نوع الدورة"
    );
  }

  const courseType:
    CourseType =
      courseTypeRaw;

  const deliveryType = String(
    formData.get(
      "delivery_type"
    ) ?? "recorded"
  );

  const isFree =
    formData.get(
      "is_free"
    ) === "on";

  const coursePrice =
    isFree
      ? 0
      : Number(
          formData.get(
            "course_price"
          ) ?? 0
        );

  const isPublished =
    formData.get(
      "is_published"
    ) === "on";

  if (!title) {
    throw new Error(
      "اسم الدورة مطلوب"
    );
  }

  if (
    ![
      "recorded",
      "live",
    ].includes(
      deliveryType
    )
  ) {
    throw new Error(
      "اختر نوع المحتوى"
    );
  }

  if (
    !Number.isFinite(
      coursePrice
    ) ||
    coursePrice < 0
  ) {
    throw new Error(
      "السعر غير صحيح"
    );
  }

  const {
    discountType,
    discountValue,
  } = getDiscount(
    formData
  );

  if (
    discountType ===
      "fixed" &&
    discountValue >
      coursePrice
  ) {
    throw new Error(
      "الخصم لا يمكن أن يكون أكبر من سعر الدورة"
    );
  }

  const schedule =
    getSchedule(
      formData,
      courseType,
      isPublished
    );

  const {
    data: createdCourse,
    error,
  } = await db
    .from("courses")
    .insert({
      title,
      description,
      category,
      image_url:
        imageUrl || null,
      course_type:
        courseType,
      delivery_type:
        deliveryType,
      price:
        coursePrice,
      currency:
        "USD",
      is_free:
        isFree,
      discount_type:
        discountType,
      discount_value:
        discountValue,
      is_published:
        isPublished,

      registration_open:
        schedule.registrationOpen,

      group_day_of_week:
        schedule.groupDay,

      group_start_time:
        schedule.groupTime,

      group_end_time:
        schedule.groupEndTime,
    })
    .select("id")
    .single();

  if (
    error ||
    !createdCourse
  ) {
    throw new Error(
      error?.message ??
        "تعذر إنشاء الدورة"
    );
  }

  try {
    if (
      courseType ===
      "private"
    ) {
      await savePrivateSlots(
        createdCourse.id,
        schedule.privateSlots
      );
    }
  } catch (scheduleError) {
    await db
      .from("courses")
      .delete()
      .eq(
        "id",
        createdCourse.id
      );

    throw scheduleError;
  }

  revalidatePath(
    "/admin/courses"
  );
  revalidatePath(
    "/courses"
  );

  redirect(
    "/admin/courses"
  );
}

export async function deleteCourse(
  courseId: string
) {
  await requirePermission(
    "manage_courses"
  );

  const db =
    createAdminClient();

  const { error } =
    await db
      .from("courses")
      .delete()
      .eq(
        "id",
        courseId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/admin/courses"
  );
  revalidatePath(
    "/courses"
  );
}

export async function updateCourse(
  courseId: string,
  formData: FormData
) {
  await requirePermission(
    "manage_courses"
  );

  const db =
    createAdminClient();

  const {
    data: existing,
    error:
      existingError,
  } = await db
    .from("courses")
    .select(
      "id, course_type"
    )
    .eq(
      "id",
      courseId
    )
    .maybeSingle();

  if (
    existingError ||
    !existing
  ) {
    throw new Error(
      existingError?.message ??
        "الدورة غير موجودة"
    );
  }

  const courseType =
    existing.course_type as
      CourseType;

  const title = String(
    formData.get(
      "title"
    ) ?? ""
  ).trim();

  const description =
    String(
      formData.get(
        "description"
      ) ?? ""
    );

  const category = String(
    formData.get(
      "category"
    ) ?? ""
  );

  const imageUrl = String(
    formData.get(
      "image_url"
    ) ?? ""
  ).trim();

  const deliveryType =
    String(
      formData.get(
        "delivery_type"
      ) ?? "recorded"
    );

  const isFree =
    formData.get(
      "is_free"
    ) === "on";

  const coursePrice =
    isFree
      ? 0
      : Number(
          formData.get(
            "course_price"
          ) ?? 0
        );

  const isPublished =
    formData.get(
      "is_published"
    ) === "on";

  if (!title) {
    throw new Error(
      "اسم الدورة مطلوب"
    );
  }

  if (
    ![
      "recorded",
      "live",
    ].includes(
      deliveryType
    )
  ) {
    throw new Error(
      "اختر نوع المحتوى"
    );
  }

  if (
    !Number.isFinite(
      coursePrice
    ) ||
    coursePrice < 0
  ) {
    throw new Error(
      "السعر غير صحيح"
    );
  }

  const {
    discountType,
    discountValue,
  } = getDiscount(
    formData
  );

  if (
    discountType ===
      "fixed" &&
    discountValue >
      coursePrice
  ) {
    throw new Error(
      "الخصم لا يمكن أن يكون أكبر من سعر الدورة"
    );
  }

  const schedule =
    getSchedule(
      formData,
      courseType,
      isPublished
    );

  const {
    error:
      updateError,
  } = await db
    .from("courses")
    .update({
      title,
      description,
      category,
      image_url:
        imageUrl || null,
      delivery_type:
        deliveryType,
      price:
        coursePrice,
      currency:
        "USD",
      is_free:
        isFree,
      discount_type:
        discountType,
      discount_value:
        discountValue,
      is_published:
        isPublished,

      registration_open:
        schedule.registrationOpen,

      group_day_of_week:
        schedule.groupDay,

      group_start_time:
        schedule.groupTime,

      group_end_time:
        schedule.groupEndTime,
    })
    .eq(
      "id",
      courseId
    );

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  if (
    courseType ===
    "private"
  ) {
    await savePrivateSlots(
      courseId,
      schedule.privateSlots
    );
  } else {
    await savePrivateSlots(
      courseId,
      []
    );
  }

  revalidatePath(
    "/admin/courses"
  );
  revalidatePath(
    `/admin/courses/${courseId}/edit`
  );
  revalidatePath(
    `/courses/${courseId}`
  );
  revalidatePath(
    "/courses"
  );

  redirect(
    "/admin/courses"
  );
}

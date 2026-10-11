"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requirePermission,
} from "@/lib/auth/admin-access";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type Audience =
  | "student"
  | "teacher";

function refreshAnnouncements() {
  revalidatePath(
    "/admin/announcements"
  );

  revalidatePath(
    "/",
    "layout"
  );
}

export async function createAnnouncement(
  formData: FormData
) {
  const access =
    await requirePermission(
      "manage_announcements"
    );

  const title =
    String(
      formData.get("title") ??
        ""
    ).trim();

  const message =
    String(
      formData.get("message") ??
        ""
    ).trim();

  const audience =
    String(
      formData.get("audience") ??
        ""
    ) as Audience;

  if (!title) {
    throw new Error(
      "عنوان الإعلان مطلوب"
    );
  }

  if (!message) {
    throw new Error(
      "نص الإعلان مطلوب"
    );
  }

  if (
    title.length > 120
  ) {
    throw new Error(
      "عنوان الإعلان طويل جداً"
    );
  }

  if (
    message.length > 1500
  ) {
    throw new Error(
      "نص الإعلان طويل جداً"
    );
  }

  if (
    audience !== "student" &&
    audience !== "teacher"
  ) {
    throw new Error(
      "اختر جمهور الإعلان"
    );
  }

  const db =
    createAdminClient();

  const {
    error,
  } = await db
    .from("announcements")
    .insert({
      title,
      message,
      audience,
      is_active: true,
      created_by:
        access.userId,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  refreshAnnouncements();

  return {
    success: true,
  };
}

export async function setAnnouncementActive(
  announcementId: string,
  isActive: boolean
) {
  await requirePermission(
    "manage_announcements"
  );

  const db =
    createAdminClient();

  const {
    error,
  } = await db
    .from("announcements")
    .update({
      is_active:
        isActive,
      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "id",
      announcementId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  refreshAnnouncements();

  return {
    success: true,
  };
}

export async function deleteAnnouncement(
  announcementId: string
) {
  await requirePermission(
    "manage_announcements"
  );

  const db =
    createAdminClient();

  const {
    error,
  } = await db
    .from("announcements")
    .delete()
    .eq(
      "id",
      announcementId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  refreshAnnouncements();

  return {
    success: true,
  };
}

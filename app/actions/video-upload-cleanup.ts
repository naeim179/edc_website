"use server";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanupStaleVideoUpload } from "@/lib/video-uploads";
import { UUID, type VideoUpload } from "@/lib/video-upload-policy";
import { revalidatePath } from "next/cache";

export async function getStaleVideoUploads() {
  await requireSuperAdmin();
  const admin = createAdminClient();
  // Filter eligibility and links before the page limit in one database round trip.
  const { data, error } = await admin.rpc("list_stale_video_uploads");
  if (error) throw new Error("Could not load abandoned video uploads");
  return (data ?? []) as Pick<
    VideoUpload,
    | "id"
    | "course_id"
    | "provider"
    | "expected_bytes"
    | "state"
    | "created_at"
    | "error_code"
  >[];
}
export async function removeStaleVideoUpload(id: string) {
  await requireSuperAdmin();
  if (!UUID.test(id)) throw new Error("Invalid upload");
  await cleanupStaleVideoUpload(id);
  revalidatePath("/admin/video-uploads");
}

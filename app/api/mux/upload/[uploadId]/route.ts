import { canManageCourse } from "@/lib/auth/can-manage-course";
export async function GET(request: Request) {
  const courseId = new URL(request.url).searchParams.get("courseId") ?? "";
  const allowed = courseId && (await canManageCourse(courseId));
  return Response.json(
    { code: allowed ? "UPLOAD_RELOAD_REQUIRED" : "UPLOAD_UNAUTHORIZED" },
    { status: allowed ? 410 : 403, headers: { "Cache-Control": "no-store" } },
  );
}

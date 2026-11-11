import { canManageCourse } from "@/lib/auth/can-manage-course";
// An old target without a size reservation cannot bypass the new limits.
export async function PUT(request: Request) {
  const courseId = request.headers.get("x-course-id") ?? "";
  const allowed = courseId && (await canManageCourse(courseId));
  return Response.json(
    { code: allowed ? "UPLOAD_RELOAD_REQUIRED" : "UPLOAD_UNAUTHORIZED" },
    { status: allowed ? 410 : 403, headers: { "Cache-Control": "no-store" } },
  );
}

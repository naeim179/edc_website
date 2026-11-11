import { createClient } from "@/lib/supabase/server";
import type { CourseListPage, ListFilters } from "@/lib/list-pages";
import type { CatalogCourse } from "@/lib/course-catalog";
import type { StudentCourse } from "@/lib/student-courses";

export async function loadCoursePage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: ListFilters,
  admin = false,
) {
  const { data, error } = await supabase.rpc("list_course_catalog_page", {
    p_query: filters.q,
    p_category: filters.category,
    p_price: filters.price,
    p_sort: filters.sort,
    p_page: filters.page,
    p_page_size: 12,
    p_admin: admin,
    p_status: filters.status,
    p_type: filters.type,
  });
  if (error || !data) throw new Error("Could not load courses");
  return data as unknown as CourseListPage;
}

export function catalogItems(
  data: CourseListPage,
  studentCourses: StudentCourse[],
): CatalogCourse[] {
  const mine = new Map(studentCourses.map((course) => [course.id, course]));
  return data.items.map((course) => ({
    id: course.id,
    title: course.title,
    category: course.category,
    image: course.image_url,
    instructor: course.instructor,
    lessons: course.lesson_count,
    progress: mine.get(course.id)?.progress ?? 0,
    enrolled: mine.has(course.id),
    price: course.price,
    currency: course.currency,
    isFree: course.is_free,
    discountType: course.discount_type,
    discountValue: course.discount_value,
    deliveryType: course.delivery_type,
  }));
}

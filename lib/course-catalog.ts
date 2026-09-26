import type { createClient } from "@/lib/supabase/server";
import type { StudentCourse } from "@/lib/student-courses";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CatalogCourse = {
  id: string;
  title: string;
  category: string | null;
  image: string | null;
  instructor: string | null;
  lessons: number;
  /** تقدم الطالب إذا كان مسجلاً */
  progress: number;
  enrolled: boolean;
  price: number | null;
  currency: string | null;
  isFree: boolean;
  discountType: "percentage" | "fixed" | null;
  discountValue: number | null;
  deliveryType: "recorded" | "live";
};

type RawTeacher = { full_name: string | null };

type RawCatalogCourse = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  is_free: boolean | null;
  discount_type: "percentage" | "fixed" | null;
  discount_value: number | null;
  delivery_type: "recorded" | "live";
  course_instructors?:
    | { teacher?: RawTeacher | RawTeacher[] | null }[]
    | null;
  sections?: { lessons?: { id: string }[] | null }[] | null;
};

const BASE_COLUMNS = `
  id,
  title,
  category,
  image_url,
  price,
  currency,
  is_free,
  discount_type,
  discount_value,
  delivery_type,
  sections (
    lessons (
      id
    )
  )
`;

const INSTRUCTOR_COLUMNS = `
  course_instructors (
    teacher:profiles (
      full_name
    )
  )
`;

/** الدورات المنشورة مع السعر والمدرب وحالة تسجيل الطالب */
export async function fetchCatalogCourses(
  supabase: SupabaseServerClient,
  studentCourses: StudentCourse[],
  options: { limit?: number } = {}
): Promise<CatalogCourse[]> {
  const load = (columns: string) =>
    supabase
      .from("courses")
      .select(columns)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(options.limit ?? 100);

  let { data, error } = await load(
    `${BASE_COLUMNS}, ${INSTRUCTOR_COLUMNS}`
  );

  if (error) {
    // اسم المدرب اختياري: إذا الصلاحيات ما سمحت بقراءته (مثلاً للزائر)
    // نعرض الدورات بدونه بدل ما تنكسر الصفحة كلها.
    console.error(
      `Catalog: loading instructors failed, retrying without them: ${error.message}`
    );

    ({ data, error } = await load(BASE_COLUMNS));
  }

  if (error) {
    throw new Error(`Failed to load courses: ${error.message}`);
  }

  const mine = new Map(
    studentCourses.map((course) => [course.id, course])
  );

  const rows = (data ?? []) as unknown as RawCatalogCourse[];

  return rows.map((course) => {
    const lessons =
      course.sections?.reduce(
        (total, section) => total + (section.lessons?.length ?? 0),
        0
      ) ?? 0;

    const teacherData = course.course_instructors?.[0]?.teacher ?? null;

    const teacher = Array.isArray(teacherData)
      ? teacherData[0] ?? null
      : teacherData;

    const enrolledCourse = mine.get(course.id);

    return {
      id: course.id,
      title: course.title,
      category: course.category,
      image: course.image_url,
      instructor: teacher?.full_name ?? null,
      lessons,
      progress: enrolledCourse?.progress ?? 0,
      enrolled: Boolean(enrolledCourse),
      price: course.price,
      currency: course.currency,
      isFree: Boolean(course.is_free),
      discountType: course.discount_type,
      discountValue: course.discount_value,
      deliveryType: course.delivery_type,
    };
  });
}

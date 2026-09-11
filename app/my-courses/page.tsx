import AppShell from "@/components/AppShell";
import MyCoursesContent from "@/components/MyCoursesContent";
import { createClient } from "@/lib/supabase/server";

export default async function MyCoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user) {
    return (
      <AppShell>
        <MyCoursesContent
          courses={[]}
          isAuthenticated={false}
        />
      </AppShell>
    );
  }


  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      course:courses (
        id,
        title,
        category,
        image_url,
        sections (
          lessons (
            id
          )
        )
      ),
      lesson_progress (
        lesson_id,
        is_completed
      )
    `)
    .eq("student_id", user.id)
    .order("enrolled_at", {
      ascending: false,
    });


  if (error) {
    throw new Error(
      `Failed to load enrolled courses: ${error.message}`
    );
  }


  const courses =
    enrollments?.flatMap((enrollment) => {

      const course = Array.isArray(enrollment.course)
        ? enrollment.course[0]
        : enrollment.course;


      if (!course) {
        return [];
      }


      const totalLessons =
        course.sections?.reduce(
          (
            total: number,
            section: {
              lessons?: {
                id: string;
              }[] | null;
            }
          ) =>
            total +
            (section.lessons?.length ?? 0),
          0
        ) ?? 0;


      const completedLessons =
        enrollment.lesson_progress?.filter(
          (lesson) => lesson.is_completed
        ).length ?? 0;


      const progress =
        totalLessons > 0
          ? Math.round(
              (completedLessons / totalLessons) * 100
            )
          : 0;


      return [
        {
          id: course.id,
          title: course.title,
          category: course.category,
          image: course.image_url,
          totalLessons,
          completedLessons,
          progress,
        },
      ];

    }) ?? [];


  return (
    <AppShell>
      <MyCoursesContent
        courses={courses}
        isAuthenticated={true}
      />
    </AppShell>
  );
}

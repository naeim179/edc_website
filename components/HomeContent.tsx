"use client";

import Link from "next/link";
import CourseCatalogCard from "@/components/CourseCatalogCard";
import CourseCover from "@/components/CourseCover";
import ProgressBar from "@/components/ui/ProgressBar";
import { useLanguage } from "@/components/LanguageProvider";
import { ArrowIcon, BookIcon, CheckCircleIcon, MessageIcon, PlayIcon } from "@/components/icons";
import type { CatalogCourse } from "@/lib/course-catalog";
import type { StudentCourse } from "@/lib/student-courses";

type Props = {
  isAuthenticated: boolean;
  displayName: string;
  stats: { enrolled: number; completedLessons: number; completedCourses: number };
  continueCourse: StudentCourse | null;
  studentCourses: StudentCourse[];
  courses: CatalogCourse[];
};

function courseHref(course: StudentCourse) {
  return course.accessActive && course.nextLessonId
    ? `/courses/${course.id}/lessons/${course.nextLessonId}`
    : `/courses/${course.id}`;
}

export default function HomeContent({ isAuthenticated, displayName, stats, continueCourse, studentCourses, courses }: Props) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const learning = studentCourses.slice(0, 4);
  const totalLessons = studentCourses.reduce((total, course) => total + course.totalLessons, 0);
  const progress = totalLessons ? Math.round(stats.completedLessons / totalLessons * 100) : 0;
  const statItems = [
    { value: stats.enrolled, label: ar ? "دورات مسجّلة" : "Enrolled courses", icon: <BookIcon width={18} height={18} /> },
    { value: stats.completedLessons, label: ar ? "دروس مكتملة" : "Completed lessons", icon: <CheckCircleIcon width={18} height={18} /> },
    { value: stats.completedCourses, label: ar ? "دورات مكتملة" : "Completed courses", icon: <CheckCircleIcon width={18} height={18} /> },
  ];

  return (
    <div className="yw-home" dir={ar ? "rtl" : "ltr"}>
      <header className="yw-page-heading">
        <div>
          <p className="yw-eyebrow">{isAuthenticated ? (ar ? `أهلًا ${displayName}` : `Welcome, ${displayName}`) : (ar ? "YOUR WAY · منصتك للتعلّم" : "YOUR WAY · Your learning space")}</p>
          <h1>{isAuthenticated ? (ar ? "خطوة جديدة، أقرب لهدفك." : "One step closer to your goal.") : (ar ? "معرفة تبني بها خطوتك القادمة." : "Learn for your next step.")}</h1>
          <p className="yw-muted">{isAuthenticated ? (ar ? "مساحتك للتعلّم، والمتابعة، وصناعة التقدّم." : "Your space to learn, keep going, and make progress.") : (ar ? "دورات متخصصة، وتجربة تعلّم واضحة من أول درس." : "Specialist courses and a clear learning experience from your first lesson.")}</p>
        </div>
        <Link href={isAuthenticated ? "/my-courses" : "/courses"} className="yw-text-link">{ar ? (isAuthenticated ? "دوراتي" : "تصفّح الدورات") : (isAuthenticated ? "My courses" : "Browse courses")}<ArrowIcon width={17} height={17} className="rtl:rotate-180" /></Link>
      </header>

      <div className={`yw-dashboard-grid ${isAuthenticated ? "" : "yw-guest-grid"}`}>
        <div className="yw-dashboard-main">
          {isAuthenticated && continueCourse ? (
            <section className="yw-continue">
              <h2 className="yw-continue-heading"><span className="yw-live-dot" />{ar ? "أكمل من حيث توقفت" : "Pick up where you left off"}</h2>
              <div className="yw-continue-body">
                <div className="yw-continue-cover"><CourseCover image={continueCourse.image} title={continueCourse.title} showTitle={false} /></div>
                <div className="yw-continue-copy">
                  <h2>{continueCourse.title}</h2>
                  <p className="yw-muted">{continueCourse.accessActive ? (ar ? "كل درس خطوة. خذ خطوتك التالية اليوم." : "Every lesson is a step. Take your next one today.") : (ar ? "اشتراك هذه الدورة غير نشط. افتح الدورة للاطلاع على خيارات التجديد." : "Your access is inactive. Open the course to see renewal options.")}</p>
                  <div className="yw-continue-progress"><span>{ar ? "تقدّمك في الدورة" : "Course progress"}</span><strong>{continueCourse.progress}%</strong></div>
                  <ProgressBar value={continueCourse.progress} />
                  <Link href={courseHref(continueCourse)} className="yw-primary-link"><PlayIcon width={17} height={17} />{continueCourse.accessActive ? (ar ? "متابعة التعلّم" : "Continue learning") : (ar ? "عرض الدورة" : "View course")}</Link>
                </div>
              </div>
            </section>
          ) : (
            <section className="yw-welcome-panel">
              <div>
                <p className="yw-eyebrow">{ar ? "تعلّم على طريقتك" : "Learn your way"}</p>
                <h2>{isAuthenticated ? (stats.enrolled ? (ar ? "أنجزت دوراتك. ماذا ستتعلّم الآن؟" : "Courses completed. What comes next?") : (ar ? "رحلتك تبدأ بدورة تختارها." : "Your journey starts with a course.") ) : (ar ? "مساحة للتركيز. وفرصة للتقدّم." : "Room to focus. Space to grow.")}</h2>
                <p className="yw-muted">{ar ? "استكشف الدورات، تعرّف على محتواها، وابدأ بما يناسب أهدافك." : "Explore the courses, discover their content, and start with what fits your goals."}</p>
                <Link className="yw-primary-link" href="/courses">{ar ? "اكتشف الدورات" : "Explore courses"}<ArrowIcon width={17} height={17} className="rtl:rotate-180" /></Link>
              </div>
              <div className="yw-learning-art" aria-hidden="true"><BookIcon width={90} height={90} strokeWidth={1} /><span>YOUR WAY</span><span className="yw-art-line" /></div>
            </section>
          )}

          {isAuthenticated && learning.length > 0 && (
            <section className="yw-course-section yw-learning-panel">
              <div className="yw-section-heading"><h2>{ar ? "على مسار تعلّمك" : "Your learning path"}</h2><Link className="yw-text-link" href="/my-courses">{ar ? "عرض الكل" : "View all"}<ArrowIcon width={16} height={16} className="rtl:rotate-180" /></Link></div>
              <div className="yw-learning-grid">
                {learning.map(course => (
                  <article className="yw-enrolled-card" key={course.id}>
                    <Link className="yw-enrolled-cover" href={`/courses/${course.id}`} aria-label={course.title}><CourseCover image={course.image} title={course.title} showTitle={false} /></Link>
                    <div className="yw-enrolled-body">
                      <p className="yw-eyebrow">{course.category || (ar ? "دوراتي" : "My courses")}</p>
                      <h3><Link href={`/courses/${course.id}`}>{course.title}</Link></h3>
                      <div className="yw-course-meta"><span>{course.completedLessons} / {course.totalLessons} {ar ? "درس" : "lessons"}</span><strong>{course.progress}%</strong></div>
                      <ProgressBar value={course.progress} />
                      <Link className="yw-card-action" href={courseHref(course)}>{!course.accessActive ? (ar ? "عرض الاشتراك" : "View subscription") : course.progress >= 100 ? (ar ? "مراجعة الدورة" : "Review course") : (ar ? "متابعة التعلّم" : "Continue learning")}<ArrowIcon width={16} height={16} className="rtl:rotate-180" /></Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="yw-course-section">
            <div className="yw-section-heading"><div><p className="yw-eyebrow">{ar ? "مساحة لاكتشاف المزيد" : "Something new to discover"}</p><h2>{ar ? "استكشف الدورات" : "Explore courses"}</h2></div><Link href="/courses" className="yw-text-link">{ar ? "كل الدورات" : "All courses"}<ArrowIcon width={16} height={16} className="rtl:rotate-180" /></Link></div>
            {courses.length ? <div className="yw-catalog-grid">{courses.map(course => <CourseCatalogCard key={course.id} {...course} />)}</div> : <div className="yw-empty-state"><BookIcon width={28} height={28} /><p>{ar ? "ستظهر الدورات المتاحة هنا فور نشرها." : "Available courses will appear here when published."}</p></div>}
          </section>
        </div>

        {isAuthenticated && <aside className="yw-dashboard-rail" aria-label={ar ? "تقدّمك وروابطك" : "Your progress and links"}>
          <section className="yw-rail-panel"><p className="yw-eyebrow">{ar ? "خطوات تُحسب" : "Every step counts"}</p><h2>{ar ? "نظرة على تقدّمك" : "Your progress"}</h2><div className="yw-progress-summary"><div className="yw-progress-ring"><span>{progress}<small>%</small></span></div><p>{ar ? "من دروس دوراتك المسجّلة" : "of your enrolled course lessons"}</p></div><div className="yw-stat-list">{statItems.map(item => <div key={item.label}><span className="yw-stat-icon">{item.icon}</span><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></section>
          <section className="yw-rail-panel"><h2>{ar ? "مساحتك الدراسية" : "Your study space"}</h2><Link className="yw-resource-link" href="/assignments"><BookIcon width={20} height={20} /><span><strong>{ar ? "واجباتي" : "My assignments"}</strong><small>{ar ? "تابع المهام والتسليمات" : "Follow tasks and submissions"}</small></span><ArrowIcon width={16} height={16} className="rtl:rotate-180" /></Link><Link className="yw-resource-link" href="/messages"><MessageIcon width={20} height={20} /><span><strong>{ar ? "الرسائل" : "Messages"}</strong><small>{ar ? "تواصل مع مدرّسيك" : "Connect with your instructors"}</small></span><ArrowIcon width={16} height={16} className="rtl:rotate-180" /></Link></section>
          <div className="yw-study-note"><span className="yw-eyebrow">YOUR WAY</span><p>{ar ? "القليل المستمر يصنع فرقًا. خصّص وقتًا لدرسك القادم." : "A little, consistently, goes a long way. Make time for your next lesson."}</p></div>
        </aside>}
      </div>
    </div>
  );
}

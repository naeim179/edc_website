"use client";

import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import DisplaySettings from "@/components/DisplaySettings";
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
  if (!isAuthenticated) return <GuestLanding courses={courses} ar={ar} />;

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

function GuestLanding({ courses, ar }: { courses: CatalogCourse[]; ar: boolean }) {
  const steps = [
    { title: ar ? "اختَر ما تريد تعلّمه" : "Find your next subject", text: ar ? "تصفّح الدورات وتعرّف على محتواها وطريقة تقديمها." : "Explore course content and how each course is taught." },
    { title: ar ? "ابدأ من أول درس" : "Start with the first lesson", text: ar ? "أنشئ حسابك، سجّل في دورتك، وابدأ رحلتك." : "Create your account, enroll, and begin your learning journey." },
    { title: ar ? "حوّل التعلّم إلى تقدّم" : "Turn learning into progress", text: ar ? "تابع دروسك وواجباتك وتواصل مع مدرّسك من مكان واحد." : "Keep your lessons, assignments and instructor conversations together." },
  ];

  return (
    <div className="yw-guest-landing" dir={ar ? "rtl" : "ltr"}>
      <header className="yw-public-header">
        <Link className="yw-public-brand" href="/" aria-label="Your Way"><BrandLogo priority /></Link>
        <nav aria-label={ar ? "القائمة الرئيسية" : "Main navigation"}><Link href="#discover">{ar ? "الدورات" : "Courses"}</Link><Link href="#how-it-works">{ar ? "كيف تبدأ؟" : "How it works"}</Link></nav>
        <div className="yw-public-actions"><DisplaySettings /><Link href="/login" className="yw-public-login">{ar ? "تسجيل الدخول" : "Sign in"}</Link><Link href="/register" className="yw-public-button">{ar ? "ابدأ رحلتك" : "Get started"}<ArrowIcon width={16} height={16} className="rtl:rotate-180" /></Link></div>
      </header>

      <div className="yw-public-body">
        <section className="yw-public-hero">
          <div className="yw-public-hero-copy">
            <p className="yw-public-kicker"><span />{ar ? "مساحتك لخطوة جديدة" : "Make room for your next step"}</p>
            <h1>{ar ? <>تعلّم اليوم.<br />وافتح لنفسك <span>طريقًا جديدًا.</span></> : <>Learn today.<br />Open up <span>a new path.</span></>}</h1>
            <p className="yw-public-intro">{ar ? "معرفة تفهمها، ومهارات تطبّقها. اكتشف دوراتك القادمة في مساحة تجمع الدروس والواجبات والتواصل مع المدرّس." : "Knowledge you understand. Skills you can use. Find your next course in a space that brings lessons, assignments and instructor support together."}</p>
            <div className="yw-public-hero-buttons"><Link href="#discover" className="yw-public-button">{ar ? "اكتشف الدورات" : "Explore courses"}<ArrowIcon width={18} height={18} className="rtl:rotate-180" /></Link><Link href="#how-it-works" className="yw-public-secondary"><span><PlayIcon width={12} height={12} /></span>{ar ? "تعرّف على التجربة" : "Discover the experience"}</Link></div>
            <div className="yw-public-hero-note"><CheckCircleIcon width={18} height={18} /><span>{ar ? "تصفّح المحتوى واختر الدورة المناسبة لهدفك." : "Explore the content and choose what fits your goals."}</span></div>
          </div>
          <div className="yw-public-visual">
            <div className="yw-public-photo"><Image src="/guest-study.jpg" alt={ar ? "مساحة هادئة للدراسة والعمل" : "A quiet space for studying and working"} fill priority sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /><div className="yw-public-photo-caption"><span>YOUR WAY</span><p>{ar ? "وقتٌ تستثمره في نفسك." : "Time invested in yourself."}</p></div></div>
            <div className="yw-public-photo-label"><BookIcon width={23} height={23} /><span><strong>{ar ? "من المعرفة إلى التطبيق" : "From knowledge to practice"}</strong><small>{ar ? "دروس، واجبات، وخطوة للأمام." : "Lessons, assignments, and a step forward."}</small></span><ArrowIcon width={20} height={20} className="rtl:rotate-180" /></div>
            <span className="yw-public-vertical-note" aria-hidden="true">A LITTLE LEARNING. A NEW DIRECTION.</span>
          </div>
        </section>

        <section className="yw-public-features" aria-label={ar ? "تجربة التعلّم" : "Learning experience"}>
          {[{ icon: <PlayIcon width={22} height={22} />, title: ar ? "تعلّم واضح ومنظّم" : "A clear learning path", text: ar ? "محتوى الدورات ودروسها في مكان واحد" : "Course content and lessons in one place" }, { icon: <BookIcon width={22} height={22} />, title: ar ? "معرفة تتحوّل لتطبيق" : "Put knowledge to work", text: ar ? "واجبات وتسليمات تتابعها من حسابك" : "Track assignments and submissions in your account" }, { icon: <MessageIcon width={22} height={22} />, title: ar ? "تواصل ضمن رحلتك" : "Stay connected as you learn", text: ar ? "مساحة للتواصل مع مدرّسي دوراتك" : "A space to connect with your course instructors" }].map(feature => <div key={feature.title}><span className="yw-public-feature-icon">{feature.icon}</span><span><h2>{feature.title}</h2><p>{feature.text}</p></span></div>)}
        </section>

        <section id="discover" className="yw-public-discover">
          <div className="yw-public-section-heading"><div><p className="yw-public-kicker">{ar ? "ابدأ بفضولك" : "Follow your curiosity"}</p><h2>{ar ? "خطوتك القادمة تبدأ من هنا." : "Your next step starts here."}</h2><p>{ar ? "تعرّف على الدورات المتاحة، واختر ما يناسب رحلتك." : "Discover available courses and choose what fits your journey."}</p></div><Link href="/courses" className="yw-public-all-courses">{ar ? "عرض كل الدورات" : "View all courses"}<ArrowIcon width={17} height={17} className="rtl:rotate-180" /></Link></div>
          {courses.length ? <div className="yw-public-course-grid">{courses.slice(0, 3).map(course => <CourseCatalogCard key={course.id} {...course} />)}</div> : <div className="yw-empty-state"><BookIcon width={28} height={28} /><p>{ar ? "ستظهر الدورات هنا فور نشرها." : "Courses will appear here when published."}</p></div>}
        </section>

        <section id="how-it-works" className="yw-public-how"><div className="yw-public-section-heading"><div><p className="yw-public-kicker">{ar ? "البداية أبسط مما تتخيّل" : "Starting is simpler than you think"}</p><h2>{ar ? "ثلاث خطوات. وطريقك يبدأ." : "Three steps. A new beginning."}</h2></div></div><div className="yw-public-steps">{steps.map((step, index) => <article key={step.title}><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
        <section className="yw-public-join"><div><p>{ar ? "استثمر في خطوتك القادمة" : "Invest in your next step"}</p><h2>{ar ? "عندك هدف؟ خلّينا نبدأ الطريق." : "Have a goal? Start your journey."}</h2></div><Link href="/register" className="yw-public-button">{ar ? "أنشئ حسابك" : "Create your account"}<ArrowIcon width={18} height={18} className="rtl:rotate-180" /></Link></section>
      </div>
      <SiteFooter />
    </div>
  );
}

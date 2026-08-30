'use client';

import Link from 'next/link';
import AppShell from '@/components/AppShell';
import HeroBanner from '@/components/HeroBanner';
import CourseCard from '@/components/CourseCard';
import ProgressCard from '@/components/ProgressCard';
import { courses } from '@/app/courses/lib/mock-courses';

export default function Home() {
  return (
    <AppShell>
      <HeroBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              متابعة التعلم
            </h3>

            <Link
              href="/my-courses"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              عرض جميع موادي
            </Link>
          </div>

          <div className="space-y-3">
            {courses.map((course) => {
              const completedLessons = Math.round(
                (course.progress / 100) * course.lessons
              );

              return (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  category={course.category ?? 'عام'}
                  progress={course.progress}
                  completedLessons={completedLessons}
                  totalLessons={course.lessons}
                  image={course.image}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">
            نظرة عامة
          </h3>

          <ProgressCard />
        </div>
      </div>
    </AppShell>
  );
}

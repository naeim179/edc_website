'use client';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import HeroBanner from '@/components/HeroBanner';
import CourseCard from '@/components/CourseCard';
import ProgressCard from '@/components/ProgressCard';

export default function Home() {
  const courses = [
    {
      title: 'الجبر والدوال',
      category: 'الرياضيات',
      progress: 66,
      completedLessons: 16,
      totalLessons: 24,
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=300&auto=format&fit=crop',
    },
    {
      title: 'الفيزياء الحديثة',
      category: 'الفيزياء',
      progress: 60,
      completedLessons: 12,
      totalLessons: 20,
      image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=300&auto=format&fit=crop',
    },
    {
      title: 'مهارات اللغة الإنجليزية',
      category: 'اللغة الإنجليزية',
      progress: 75,
      completedLessons: 18,
      totalLessons: 24,
      image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=300&auto=format&fit=crop',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f4f7f6] dir-rtl font-sans p-4 gap-6">
      {/* Sidebar Section */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 space-y-6 overflow-hidden">
        {/* Top Header */}
        <Topbar />

        {/* Hero Banner Section */}
        <HeroBanner />

        {/* Grid Area: Left (Courses & Live Classes) / Right (Progress & Calendar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column (Courses) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">متابعة التعلم</h3>
              <button className="text-xs font-semibold text-emerald-600 hover:underline">
                عرض جميع موادي
              </button>
            </div>

            {/* Course Cards List */}
            <div className="space-y-3">
              {courses.map((course, idx) => (
                <CourseCard key={idx} {...course} />
              ))}
            </div>
          </div>

          {/* Side Column (Stats & Progress) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">نظرة عامة</h3>
            <ProgressCard />
          </div>
        </div>
      </main>
    </div>
  );
}
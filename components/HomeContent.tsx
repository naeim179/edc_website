import React from 'react';
import Link from 'next/link';
import { PlayCircle, BookOpen, CheckCircle, GraduationCap, ArrowLeft } from 'lucide-react'; 

export default function HomeContent() {
  const user = { name: 'naim' };
  const progress = 0; 
  const enrolledCourses = 1;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 font-sans">
      
      {/* 1. قسم الترحيب (Header) */}
      <div className="mb-10">
        <p className="text-sm font-medium text-gray-500 mb-2">أهلاً {user.name}</p>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
          خطوة جديدة، أقرب لهدفك.
        </h1>
        <p className="text-gray-500 text-lg">
          مساحتك للتعلّم، والمتابعة، وصناعة التقدّم.
        </p>
      </div>

      {/* 2. شبكة المحتوى (Grid Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* العمود الأيمن الرئيسي (يأخذ 8 أعمدة من 12) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* بطاقة: أكمل من حيث توقفت */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                أكمل من حيث توقفت
              </h2>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="w-full md:w-1/3 aspect-video bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                <BookOpen className="w-12 h-12 text-amber-600/30" />
              </div>
              
              <div className="w-full md:w-2/3 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">for test</h3>
                  <p className="text-gray-500 text-sm mb-6">كل درس خطوة. خذ خطوتك التالية اليوم.</p>
                </div>
                
                <div className="mb-5">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-gray-500">تقدّمك في الدورة</span>
                    <span className="text-emerald-600 font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-6 py-2.5 rounded-xl font-medium transition-transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
                    متابعة التعلّم
                    <PlayCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* بطاقة: على مسار تعلّمك (مسار الدورات) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">على مسار تعلّمك</h2>
              <Link href="/courses" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                عرض الكل <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="aspect-[4/3] bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-gray-400 p-4 transition-colors hover:bg-gray-100 cursor-pointer">
                 <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                 <span className="text-sm font-medium">لا توجد دورات أخرى حالياً</span>
              </div>
            </div>
          </div>
        </div>

        {/* العمود الأيسر (الشريط الجانبي للإحصائيات - 4 أعمدة) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* بطاقة: نظرة على تقدمك */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <h3 className="text-gray-500 text-sm font-medium mb-1">خطوات تُحسب</h3>
            <h2 className="text-xl font-bold text-gray-900 mb-8">نظرة على تقدّمك</h2>
            
            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center bg-emerald-50 rounded-full border-[6px] border-emerald-100 shadow-inner">
              <span className="text-5xl font-extrabold text-emerald-700">{progress}<span className="text-2xl text-emerald-500">%</span></span>
            </div>
            <p className="text-sm text-gray-500 pb-6 border-b border-gray-100">من دروس دوراتك المسجلة</p>

            <div className="pt-6 space-y-5 text-right">
              <div className="flex justify-between items-center group">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="font-medium">دورات مسجلة</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{enrolledCourses}</span>
              </div>
              
              <div className="flex justify-between items-center group">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="font-medium">دروس مكتملة</span>
                </div>
                <span className="text-xl font-bold text-gray-900">0</span>
              </div>

              <div className="flex justify-between items-center group">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="font-medium">دورات مكتملة</span>
                </div>
                <span className="text-xl font-bold text-gray-900">0</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, PlayCircle } from 'lucide-react';

// يمكنك تعديل الـ Props حسب ما تستخدمه في مشروعك
interface CourseCardProps {
  id?: string;
  title?: string;
  instructor?: string;
  progress?: number;
  image?: string;
}

export default function CourseCard({ 
  id = '1', 
  title = 'عنوان الدورة الافتراضي', 
  instructor = 'أحمد محمد', 
  progress = 0 
}: CourseCardProps) {
  return (
    // استخدام group للتحكم بتأثيرات العناصر الداخلية عند تمرير الماوس
    <Link href={`/courses/${id}`} className="group block h-full">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col hover:-translate-y-1">
        
        {/* الجزء العلوي: صورة الكورس */}
        <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-gray-50">
          {/* هنا يتم وضع صورة الكورس، حالياً وضعنا أيقونة كعنصر نائب */}
          <BookOpen className="w-12 h-12 text-emerald-600/20 group-hover:scale-110 transition-transform duration-500" />
          
          {/* شارة (Badge) للحالة */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
            متاح
          </div>
        </div>

        {/* الجزء السفلي: تفاصيل الكورس */}
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
            {title}
          </h3>
          
          <div className="text-sm text-gray-500 font-medium mb-4 flex items-center gap-2">
            {/* أيقونة/صورة المعلم */}
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
              {instructor.charAt(0)}
            </span>
            {instructor}
          </div>

          {/* الإحصائيات والأزرار في أسفل البطاقة */}
          <div className="mt-auto">
            <div className="flex justify-between text-[11px] font-medium mb-2">
              <span className="text-gray-500">نسبة الإنجاز</span>
              <span className="text-emerald-600 font-bold">{progress}%</span>
            </div>
            
            {/* شريط التقدم */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-4">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> مرن
              </span>
              <span className="flex items-center gap-1 text-sm font-bold text-emerald-600 group-hover:-translate-x-1 transition-transform">
                متابعة <PlayCircle className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
